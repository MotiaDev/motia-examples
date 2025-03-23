"""Tests for the expand node step."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY
import uuid

import importlib.util
spec = importlib.util.spec_from_file_location(
    name="expand_node",
    location="steps/code_review/expand_node.step.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handler = module.handler
config = module.config

from steps.shared.models import NodeExpansion

# Mock UUIDs for deterministic testing
mock_uuids = [
    'expansion-child-1',
    'expansion-child-2',
    'expansion-child-3',
    'expansion-child-4'
]

# Counter to cycle through mock UUIDs
uuid_counter = 0

@pytest.fixture(autouse=True)
def mock_uuid():
    """Mock UUID generation for deterministic tests."""
    global uuid_counter
    uuid_counter = 0
    
    original_uuid4 = uuid.uuid4
    
    def mock_uuid4():
        global uuid_counter
        mock_id = mock_uuids[uuid_counter % len(mock_uuids)]
        uuid_counter += 1
        return mock_id
    
    uuid.uuid4 = mock_uuid4
    yield
    uuid.uuid4 = original_uuid4

@pytest.fixture
def ctx():
    """Create a mock context for testing."""
    context = MagicMock()
    context.emit = AsyncMock()
    context.logger = MagicMock()
    context.state = MagicMock()
    context.trace_id = "test-trace-id"
    return context

@pytest.fixture
def mock_node_tree():
    """Create a basic node tree for MCTS testing."""
    nodes = {
        'root': {
            'id': 'root',
            'parent': None,
            'children': ['node1'],
            'visits': 5,
            'value': 3,
            'state': 'Root reasoning state',
            'isTerminal': False
        },
        'node1': {
            'id': 'node1',
            'parent': 'root',
            'children': [],
            'visits': 1,
            'value': 0.5,
            'state': 'Selected node reasoning state',
            'isTerminal': False
        }
    }
    return nodes

@pytest.fixture
def sample_input(mock_node_tree):
    """Create sample input data for testing."""
    return {
        'nodes': mock_node_tree,
        'root_id': 'root',
        'selected_node_id': 'node1',
        'max_iterations': 100,
        'current_iteration': 1,
        'exploration_constant': 1.414,
        'max_depth': 10
    }

def test_config():
    """Test that the step configuration is correct."""
    assert config['type'] == 'event'
    assert config['name'] == 'ExpandNode'
    assert 'mcts.node.selected' in config['subscribes']
    assert 'mcts.node.expanded' in config['emits']
    assert 'code-review-flow' in config['flows']

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_call_expand_node(mock_expand_node, ctx, sample_input):
    """Test that the handler calls expand_node with the selected node state."""
    # Setup mock
    mock_expansion = NodeExpansion(
        reasoning='Expansion reasoning',
        steps=['Step 1', 'Step 2', 'Step 3']
    )
    mock_expand_node.return_value = mock_expansion
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    mock_expand_node.assert_called_with(sample_input['nodes'][sample_input['selected_node_id']]['state'])

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_create_expansion_nodes(mock_expand_node, ctx, sample_input):
    """Test that new nodes are created for each expansion step."""
    # Setup mock
    mock_expansion = NodeExpansion(
        reasoning='Expansion reasoning',
        steps=['Step 1', 'Step 2', 'Step 3']
    )
    mock_expand_node.return_value = mock_expansion
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    
    assert emit_call['topic'] == 'mcts.node.expanded'
    assert 'expansion-child-1' in emit_call['data']['nodes']
    assert 'expansion-child-2' in emit_call['data']['nodes']
    assert 'expansion-child-3' in emit_call['data']['nodes']
    
    # Check structure of first expanded node
    first_expanded_node = emit_call['data']['nodes']['expansion-child-1']
    assert first_expanded_node['parent'] == sample_input['selected_node_id']
    assert first_expanded_node['children'] == []
    assert first_expanded_node['visits'] == 0
    assert first_expanded_node['value'] == 0
    assert first_expanded_node['state'] == 'Step 1'

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_update_children_array(mock_expand_node, ctx, sample_input):
    """Test that the selected node's children array is updated."""
    # Setup mock
    mock_expansion = NodeExpansion(
        reasoning='Expansion reasoning',
        steps=['Step 1', 'Step 2']
    )
    mock_expand_node.return_value = mock_expansion
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    emit_call = ctx.emit.call_args[0][0]
    selected_node = emit_call['data']['nodes'][sample_input['selected_node_id']]
    
    assert 'expansion-child-1' in selected_node['children']
    assert 'expansion-child-2' in selected_node['children']
    assert len(selected_node['children']) == 2

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_emit_expanded_nodes(mock_expand_node, ctx, sample_input):
    """Test that the expanded nodes array is emitted in the event data."""
    # Setup mock
    mock_expansion = NodeExpansion(
        reasoning='Expansion reasoning',
        steps=['Step 1', 'Step 2']
    )
    mock_expand_node.return_value = mock_expansion
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['data']['expanded_node_ids'] == ['expansion-child-1', 'expansion-child-2']

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_handle_expansion_error(mock_expand_node, ctx, sample_input):
    """Test that errors during node expansion are handled properly."""
    # Setup mock to raise an exception
    mock_expand_node.side_effect = Exception('Expansion failed')
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    # First check that the error is logged
    ctx.logger.error.assert_called_with(
        'Error in expand_node function: Expansion failed', 
        {'error': 'Expansion failed', 'traceback': ANY}
    )
    
    # Then verify that fallback expansion was used
    ctx.logger.info.assert_any_call('Using fallback expansion', {'steps_count': 3})
    
    # And that the event was emitted
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.node.expanded'
    assert len(emit_call['data']['expanded_node_ids']) == 3  # Expecting 3 fallback steps

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_handle_empty_steps(mock_expand_node, ctx, sample_input):
    """Test that the case when no steps are returned is handled."""
    # Setup mock
    mock_expansion = NodeExpansion(
        reasoning='Expansion reasoning',
        steps=[]  # Empty steps array
    )
    mock_expand_node.return_value = mock_expansion
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert we noticed empty steps
    ctx.logger.warn.assert_called_with(
        'No expansion steps returned for node', 
        {'node_id': sample_input['selected_node_id'], 'expansion_type': 'NodeExpansion', 'expansion_attrs': ANY}
    )
    
    # Verify fallback was used
    ctx.logger.info.assert_any_call('Using hardcoded fallback expansion', {'steps_count': 3})
    
    # Check that the event was emitted with the fallback steps
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.node.expanded'
    assert len(emit_call['data']['expanded_node_ids']) == 3  # Expecting 3 fallback steps

@pytest.mark.asyncio
@patch.object(module, 'expand_node')
async def test_handle_missing_node(mock_expand_node, ctx, sample_input):
    """Test that the case when the selected node does not exist is handled."""
    # Modify input to have a non-existent node ID
    sample_input['selected_node_id'] = 'non-existent-node'
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    ctx.logger.error.assert_called_with('Selected node not found in tree', {
        'node_id': 'non-existent-node'
    })
    
    # Check that we emit an error report
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'code-review.reasoning.completed'
    assert 'Selected node non-existent-node not found in nodes' in emit_call['data']['reasoning'] 