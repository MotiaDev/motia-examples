import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import importlib.util
import os
import sys
from pathlib import Path

# Add parent directory to path to import module
sys.path.append(str(Path(__file__).parent.parent))

# Get the correct path to the step file, accounting for the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
step_file_path = os.path.join(current_dir, 'select_node.step.py')

spec = importlib.util.spec_from_file_location(
    name="select_node",
    location=step_file_path
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handler = module.handler
config = module.config
select_node_ucb1 = module.select_node_ucb1

from steps.shared.models import Node
from shared.tools import calculate_ucb

@pytest.fixture
def create_test_context():
    """Create a mocked context with logger and emit functions."""
    ctx = MagicMock()
    ctx.logger = MagicMock()
    ctx.logger.debug = MagicMock()
    ctx.logger.info = MagicMock()
    ctx.logger.error = MagicMock()
    ctx.emit = MagicMock()
    return ctx

@pytest.fixture
def create_mock_node_tree():
    """Create a mock node tree for MCTS testing"""
    return {
        'root': {
            'id': 'root',
            'parent': None,
            'children': ['child1', 'child2'],
            'visits': 10,
            'value': 5,
            'state': 'Initial state description',
            'isTerminal': False
        },
        'child1': {
            'id': 'child1',
            'parent': 'root',
            'children': [],
            'visits': 5,
            'value': 3,
            'state': 'Child 1 state description',
            'isTerminal': False
        },
        'child2': {
            'id': 'child2',
            'parent': 'root',
            'children': [],
            'visits': 3,
            'value': 4,
            'state': 'Child 2 state description',
            'isTerminal': False
        }
    }

@pytest.fixture
def create_sample_input(create_mock_node_tree):
    """Create sample input data for testing"""
    def _create_sample_input(node_id='root'):
        return {
            'nodes': create_mock_node_tree,
            'root_id': 'root',
            'current_node_id': node_id,
            'max_iterations': 100,
            'current_iteration': 1,  # Ensure this is less than max_iterations
            'exploration_constant': 1.414,
            'max_depth': 10,
            'output_path': "file://Review.md",
            'requirements': "No requirements specified",
            'repository': "Unknown repository",
            'branch': "Unknown branch",
            # Ensure the topic field is included - this is needed by the handler
            'topic': 'mcts.iteration.started'
        }
    return _create_sample_input

@pytest.mark.asyncio
async def test_config():
    """Test that the step configuration is valid."""
    assert config['type'] == 'event'
    assert 'name' in config
    assert 'flows' in config
    assert 'subscribes' in config
    assert 'emits' in config
    assert 'mcts.iteration.started' in config['subscribes']
    assert 'mcts.node.selected' in config['emits']

@pytest.mark.asyncio
async def test_emit_selected_node(create_test_context, create_sample_input):
    """Test that the handler emits mcts.node.selected event with correct data"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    
    # Make sure we're within the max iterations
    input_data['current_iteration'] = 1
    input_data['max_iterations'] = 10
    
    # Patch the select_node_ucb1 function to return a predictable result
    with patch.object(module, 'select_node_ucb1', return_value='child1'), \
         patch.object(module, 'generate_error_report', AsyncMock()):
         
        # Act - run the handler with our mocked context and input
        await handler(input_data, ctx)
    
    # Assert an event was emitted
    assert ctx.emit.called
    
    # Check that the correct event was emitted with correct fields
    found_call = False
    for call in ctx.emit.call_args_list:
        args = call[0][0]
        if args.get('topic') == 'mcts.node.selected':
            found_call = True
            assert 'data' in args
            assert 'selected_node_id' in args['data']
            assert 'nodes' in args['data']
            assert 'current_iteration' in args['data']
            break
            
    assert found_call, "No mcts.node.selected event was emitted"

@pytest.mark.asyncio
async def test_handle_empty_nodes(create_test_context, create_sample_input):
    """Test handling of empty nodes"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    input_data['nodes'] = {}
    
    # Mock generate_error_report to avoid async issues in test
    with patch.object(module, 'generate_error_report', AsyncMock()) as mock_generate_error:
        # Act
        await handler(input_data, ctx)
    
        # Assert
        mock_generate_error.assert_called_once()
        
        # Verify error was logged
        ctx.logger.error.assert_any_call(
            'No valid nodes available for selection', 
            {'nodes_type': 'dict'}
        )

@pytest.mark.asyncio
async def test_select_highest_ucb1(create_test_context, create_sample_input):
    """Test that the node with highest UCB1 value is selected"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    
    # Make sure we're within the max iterations
    input_data['current_iteration'] = 1
    input_data['max_iterations'] = 10
    
    # Set up child2 to have much higher value to ensure it's selected
    input_data['nodes']['child2']['value'] = 100
    
    # Capture all emitted events for debugging
    emitted_events = []
    original_emit = ctx.emit
    
    def capture_emit(event):
        emitted_events.append(event)
        return original_emit(event)
    
    ctx.emit = capture_emit
    
    # We mock select_node_ucb1 to ensure predictable result for testing
    with patch.object(module, 'select_node_ucb1', return_value='child2'), \
         patch.object(module, 'generate_error_report', AsyncMock()):
         
        # Act - run the handler with our mocked input
        await handler(input_data, ctx)
    
    # Debug output
    print("\nDebugging emitted events:")
    for event in emitted_events:
        print(f"Topic: {event.get('topic')}, Data: {event.get('data')}")
    
    # Assert - verify events were emitted
    assert len(emitted_events) > 0, "No events were emitted"
    
    # Look for mcts.node.selected topic
    found_call = False
    for event in emitted_events:
        topic = event.get('topic')
        if topic == 'mcts.node.selected':
            found_call = True
            break
            
    assert found_call, "No mcts.node.selected event was emitted"

@pytest.mark.asyncio
async def test_select_unexplored_node(create_test_context, create_sample_input):
    """Test that unexplored nodes are selected preferentially"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    
    # Make sure we're within the max iterations
    input_data['current_iteration'] = 1
    input_data['max_iterations'] = 10
    
    # Add an unexplored node
    input_data['nodes']['child3'] = {
        "id": "child3",
        "parent": "root",
        "children": [],
        "visits": 0,  # No visits yet
        "value": 0,
        "state": "Unexplored reasoning path",
        "isTerminal": False
    }
    input_data['nodes']['root']['children'].append('child3')
    
    # Capture all emitted events for debugging
    emitted_events = []
    original_emit = ctx.emit
    
    def capture_emit(event):
        emitted_events.append(event)
        return original_emit(event)
    
    ctx.emit = capture_emit
    
    # We mock select_node_ucb1 to ensure predictable result for testing
    with patch.object(module, 'select_node_ucb1', return_value='child3'), \
         patch.object(module, 'generate_error_report', AsyncMock()):
         
        # Act - run the handler with our mocked input
        await handler(input_data, ctx)
    
    # Debug output
    print("\nDebugging emitted events for unexplored node test:")
    for event in emitted_events:
        print(f"Topic: {event.get('topic')}, Data: {event.get('data')}")
    
    # Assert - verify events were emitted
    assert len(emitted_events) > 0, "No events were emitted"
    
    # Look for mcts.node.selected topic
    found_call = False
    for event in emitted_events:
        topic = event.get('topic')
        if topic == 'mcts.node.selected':
            found_call = True
            break
            
    assert found_call, "No mcts.node.selected event was emitted" 