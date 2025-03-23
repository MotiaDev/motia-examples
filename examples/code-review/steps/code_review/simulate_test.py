"""Tests for the simulate step."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import os
import sys
from pathlib import Path

# Add parent directory to path to import module
sys.path.append(str(Path(__file__).parent.parent))

# Import simulate module dynamically
import importlib.util
module_path = Path(__file__).resolve().parent / "simulate.step.py"
spec = importlib.util.spec_from_file_location("simulate", str(module_path))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handler = module.handler
config = module.config
simulate_module = module
from shared.models import SimulationResult

# Determine if we should use mocks
should_mock = os.environ.get('MOCK_AGENTS', 'true').lower() == 'true'

@pytest.fixture
def ctx():
    """Create a mocked context for testing."""
    context = MagicMock()
    context.logger = MagicMock()
    context.logger.info = MagicMock()
    context.logger.warn = MagicMock()
    context.logger.error = MagicMock()
    context.logger.debug = MagicMock()
    context.emit = AsyncMock()
    return context

@pytest.fixture
def mock_node_tree():
    """Create a basic node tree for MCTS testing."""
    nodes = {
        'root': {
            'id': 'root',
            'parent': None,
            'children': ['expanded-1', 'expanded-2'],
            'visits': 5,
            'value': 3,
            'state': 'Root reasoning state',
            'isTerminal': False
        },
        'expanded-1': {
            'id': 'expanded-1',
            'parent': 'root',
            'children': [],
            'visits': 0,
            'value': 0,
            'state': 'First expanded reasoning state',
            'isTerminal': False
        },
        'expanded-2': {
            'id': 'expanded-2',
            'parent': 'root',
            'children': [],
            'visits': 0,
            'value': 0,
            'state': 'Second expanded reasoning state',
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
        'expanded_node_ids': ['expanded-1', 'expanded-2'],
        'max_iterations': 100,
        'current_iteration': 1,
        'exploration_constant': 1.414,
        'max_depth': 10,
        'output_path': "file://Review.md",
        'requirements': "No requirements specified",
        'repository': "Unknown repository",
        'branch': "Unknown branch"
    }

@pytest.mark.asyncio
async def test_config():
    """Test that the step configuration is valid."""
    assert config['type'] == 'event'
    assert 'name' in config
    assert 'subscribes' in config
    assert 'emits' in config
    assert 'mcts.node.expanded' in config['subscribes']
    assert 'mcts.simulation.completed' in config['emits']

# Tests that require agent mocking
if should_mock:
    @pytest.mark.asyncio
    @patch.object(module, 'evaluate_reasoning')
    async def test_call_evaluate_reasoning(mock_evaluate_reasoning, ctx, sample_input):
        """Test that evaluate_reasoning is called with the right parameters."""
        mock_result = SimulationResult(
            nodeId='expanded-1',
            value=0.8,
            explanation='Mock explanation for evaluation'
        )
        mock_evaluate_reasoning.return_value = mock_result
        
        await handler(sample_input, ctx)
        
        mock_evaluate_reasoning.assert_called_once()
        args = mock_evaluate_reasoning.call_args[0]
        
        # Check argument types and content
        assert isinstance(args[0], str)  # Root state
        assert args[0] == "Root reasoning state"
        assert isinstance(args[1], list)  # Expanded states
        assert len(args[1]) == 2
        assert "First expanded reasoning state" in args[1]
        assert "Second expanded reasoning state" in args[1]
        assert isinstance(args[2], list)  # Valid expanded ids
        assert "expanded-1" in args[2]
        assert "expanded-2" in args[2]

    @pytest.mark.asyncio
    @patch.object(module, 'evaluate_reasoning')
    async def test_emit_simulation_completed(mock_evaluate_reasoning, ctx, sample_input):
        """Test that the handler emits the simulation result."""
        # Setup mock
        mock_result = SimulationResult(
            nodeId='expanded-1',
            value=0.8,
            explanation='Mock explanation for evaluation'
        )
        mock_evaluate_reasoning.return_value = mock_result
        
        # Call handler
        await handler(sample_input, ctx)
        
        # Assert
        ctx.emit.assert_called_once()
        emit_call = ctx.emit.call_args[0][0]
        
        assert emit_call['topic'] == 'mcts.simulation.completed'
        assert emit_call['data']['nodes'] == sample_input['nodes']
        assert emit_call['data']['root_id'] == sample_input['root_id']
        assert emit_call['data']['simulation_result']['nodeId'] == 'expanded-1'

    @pytest.mark.asyncio
    @patch.object(module, 'evaluate_reasoning')
    async def test_handle_simulation_error(mock_evaluate_reasoning, ctx, sample_input):
        """Test that errors during simulation are handled properly."""
        # Setup mock to raise an exception
        mock_evaluate_reasoning.side_effect = Exception('Simulation failed')
        
        # Call handler
        await handler(sample_input, ctx)
        
        # Assert error was logged with additional traceback info
        error_logged = False
        for call in ctx.logger.error.call_args_list:
            args = call[0]
            if 'Error in evaluate_reasoning function' in args[0] and isinstance(args[1], dict):
                if 'error' in args[1] and 'traceback' in args[1]:
                    if args[1]['error'] == 'Simulation failed':
                        error_logged = True
                        break
        
        assert error_logged, "Error should be logged with traceback"
else:
    @pytest.mark.skip
    def test_skipping():
        """Warning about skipping tests that require agent mocking."""
        pytest.skip(
            "⚠️ Skipping simulate step tests that require agent mocking. "
            "Set MOCK_AGENTS=true to run these tests with mocked agent responses."
        )

@pytest.mark.asyncio
async def test_handle_empty_expanded_nodes(ctx, sample_input):
    """Test that the case when no expanded nodes are provided is handled."""
    # Modify input to have empty expanded nodes
    sample_input['expanded_node_ids'] = []
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Assert
    ctx.logger.warn.assert_called_with('No expanded nodes to simulate', {'root_id': 'root'})
    
    # Check emit is still called with a fallback result
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.simulation.completed'
    assert 'simulation_result' in emit_call['data']
    assert 'explanation' in emit_call['data']['simulation_result']
    assert 'Fallback' in emit_call['data']['simulation_result']['explanation']

@pytest.mark.asyncio
async def test_handle_missing_nodes(ctx, sample_input):
    """Test that the case when a node is missing is handled."""
    # Modify input to have a non-existent node ID
    sample_input['expanded_node_ids'] = ['non-existent-node']
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Check that the handler gracefully handles the missing node
    # Don't assert a specific logging message since implementation may vary
    
    # Check emit is still called with a fallback result
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.simulation.completed'
    assert 'simulation_result' in emit_call['data']

@pytest.mark.asyncio
async def test_handle_missing_root(ctx, sample_input):
    """Test that the case when the root node is missing is handled."""
    # Modify input to have a non-existent root ID
    sample_input['root_id'] = 'non-existent-root'
    
    # Call handler
    await handler(sample_input, ctx)
    
    # Check emit is still called with a fallback result
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.simulation.completed'
    assert 'simulation_result' in emit_call['data']
    assert 'explanation' in emit_call['data']['simulation_result']
    assert 'Fallback' in emit_call['data']['simulation_result']['explanation'] 