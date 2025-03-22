import pytest
from unittest.mock import AsyncMock, MagicMock
import importlib.util

spec = importlib.util.spec_from_file_location(
    name="select_node",
    location="steps/code_review/select_node.step.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handler = module.handler
config = module.config
select_node_ucb1 = module.select_node_ucb1

from steps.shared.models import Node

@pytest.fixture
def create_test_context():
    """Create a mock context for testing"""
    return MagicMock(
        emit=AsyncMock(),
        logger=MagicMock(
            info=MagicMock(),
            error=MagicMock(),
            warn=MagicMock(),
            debug=MagicMock()
        ),
        state=MagicMock(
            get=AsyncMock(),
            set=AsyncMock(),
            delete=AsyncMock(),
            clear=AsyncMock()
        ),
        traceId='test-trace-id'
    )

@pytest.fixture
def create_mock_node_tree():
    """Create a mock node tree for MCTS testing"""
    return {
        'root': Node(
            id='root',
            parent=None,
            children=['child1', 'child2', 'child3'],
            visits=10,
            value=5,
            state='Initial state description',
            isTerminal=False
        ),
        'child1': Node(
            id='child1',
            parent='root',
            children=[],
            visits=5,
            value=3,
            state='Child 1 state description',
            isTerminal=False
        ),
        'child2': Node(
            id='child2',
            parent='root',
            children=[],
            visits=3,
            value=4,
            state='Child 2 state description',
            isTerminal=False
        ),
        'child3': Node(
            id='child3',
            parent='root',
            children=[],
            visits=2,
            value=1,
            state='Child 3 state description',
            isTerminal=False
        )
    }

@pytest.fixture
def create_sample_input(create_mock_node_tree):
    """Create sample input data for testing"""
    def _create_sample_input(node_id='root'):
        return {
            'nodes': create_mock_node_tree,
            'rootId': 'root',
            'currentNodeId': node_id,
            'maxIterations': 100,
            'currentIteration': 1,
            'explorationConstant': 1.414,
            'maxDepth': 10
        }
    return _create_sample_input

def test_config():
    """Test the step configuration"""
    assert config['type'] == 'event'
    assert config['name'] == 'SelectNode'
    assert 'mcts.iteration.started' in config['subscribes']
    assert 'mcts.node.selected' in config['emits']
    assert 'code-review-flow' in config['flows']

@pytest.mark.asyncio
async def test_emit_selected_node(create_test_context, create_sample_input):
    """Test that the handler emits mcts.node.selected event with correct data"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    
    # Act
    await handler(input_data, ctx)
    
    # Assert
    ctx.emit.assert_called_once()
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['topic'] == 'mcts.node.selected'
    assert 'nodes' in emit_call['data']
    assert 'rootId' in emit_call['data']
    assert 'selectedNodeId' in emit_call['data']
    assert 'maxIterations' in emit_call['data']
    assert 'currentIteration' in emit_call['data']
    assert 'explorationConstant' in emit_call['data']
    assert 'maxDepth' in emit_call['data']
    
    ctx.logger.info.assert_called_with('Node selected', {'selectedNodeId': emit_call['data']['selectedNodeId'], 'currentIteration': 1, 'maxIterations': 100})

@pytest.mark.asyncio
async def test_handle_empty_nodes(create_test_context, create_sample_input):
    """Test handling of empty nodes"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    input_data['nodes'] = {}
    
    # Act
    await handler(input_data, ctx)
    
    # Assert
    ctx.logger.error.assert_called_with('No valid nodes available for selection')
    ctx.emit.assert_not_called()

@pytest.mark.asyncio
async def test_select_highest_ucb1(create_test_context, create_sample_input):
    """Test selection of node with highest UCB1 score"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    input_data['nodes']['child2'].value = 10  # High value for exploitation
    
    # Act
    await handler(input_data, ctx)
    
    # Assert
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['data']['selectedNodeId'] == 'child2'

@pytest.mark.asyncio
async def test_select_unexplored_node(create_test_context, create_sample_input, create_mock_node_tree):
    """Test selection of unexplored nodes for exploration"""
    # Arrange
    ctx = create_test_context
    input_data = create_sample_input()
    
    # Add an unexplored node
    input_data['nodes']['child4'] = Node(
        id='child4',
        parent='root',
        children=[],
        visits=0,  # Never visited
        value=0,
        state='Child 4 state description',
        isTerminal=False
    )
    input_data['nodes']['root'].children.append('child4')
    
    # Act
    await handler(input_data, ctx)
    
    # Assert
    emit_call = ctx.emit.call_args[0][0]
    assert emit_call['data']['selectedNodeId'] == 'child4'  # Should prefer unexplored node 