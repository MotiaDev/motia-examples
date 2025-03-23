import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from steps.shared.actions import Evaluation, Issue

import importlib.util
spec = importlib.util.spec_from_file_location(
    name="controller",
    location="steps/code_review/controller.step.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handler = module.handler
MCTSControllerInput = module.MCTSControllerInput

@pytest.fixture
def mock_context():
    context = MagicMock()
    context.logger = MagicMock()
    context.state = AsyncMock()
    context.emit = AsyncMock()
    context.trace_id = "test-trace-id"
    return context

@pytest.fixture
def sample_input():
    return MCTSControllerInput(
        prompt="Review this code",
        repo_dir="/path/to/repo",
        branch="main",
        max_iterations=100,
        exploration_constant=1.414,
        max_depth=10,
        requirements="Check code quality",
        output_url=None
    )

@pytest.fixture
def mock_evaluation():
    """Fixture for evaluation result."""
    return Evaluation(
        score=0.8,
        issues=[
            Issue(
                claim="Good code structure",
                grounds="Clear organization",
                warrant="Industry standard practices",
                backing="Best practices in software engineering",
                qualifier="Minor improvements needed"
            )
        ],
        summary="Code is well structured",
        issueSummary="Minor issues found"
    )

@pytest.fixture
def mock_commits():
    """Fixture for commits object."""
    commits = AsyncMock()
    commits.files = "file1.py\nfile2.py"
    commits.messages = "commit1\ncommit2"
    return commits

class MockCommitsWithCreate:
    @staticmethod
    async def create(trace_id, state, data):
        mock = AsyncMock()
        mock.files = "file1.py\nfile2.py"
        mock.messages = "commit1\ncommit2"
        return mock

@pytest.mark.asyncio
async def test_input_validation(mock_context):
    """Test input validation for required fields."""
    # Create input missing required fields
    with pytest.raises(ValueError, match="Field required"):
        MCTSControllerInput(
            prompt="Review this code",
            branch="main"
            # Missing repo_dir and requirements
        )

    # Test empty strings
    with pytest.raises(ValueError, match="String should have at least 1 character"):
        MCTSControllerInput(
            prompt="Review this code",
            repo_dir="",  # Empty repo_dir should raise validation error
            branch="main",
            requirements="Check code quality"
        )

    with pytest.raises(ValueError, match="String should have at least 1 character"):
        MCTSControllerInput(
            prompt="Review this code",
            repo_dir="/path/to/repo",
            branch="main",
            requirements=""  # Empty requirements should raise validation error
        )

@pytest.mark.asyncio
async def test_error_handling(mock_context, sample_input):
    """Test error handling and error event emission."""
    with patch.object(module, 'Commits') as MockCommits:
        # Setup mock to raise an error
        MockCommits.create.side_effect = Exception("Repository access failed")

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify error event was emitted
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'code-review.reasoning.completed'
        
        # Verify error data structure
        error_data = emit_call['data']
        assert isinstance(error_data, dict)
        
        # Check for the new format used in the application
        assert 'state' in error_data
        assert 'reasoning' in error_data
        assert 'selected_node_id' in error_data
        assert 'Repository access failed' in error_data['reasoning']

@pytest.mark.asyncio
async def test_controller_initialization(mock_context, sample_input, mock_evaluation):
    """Test successful initialization of the MCTS controller."""
    with patch.object(module, 'evaluate_commits', return_value=mock_evaluation), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify state was stored
        mock_context.state.set.assert_called_once_with(
            mock_context.trace_id,
            'requirements',
            sample_input.requirements
        )

        # Verify MCTS iteration started event was emitted
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'mcts.iteration.started'
        assert isinstance(emit_call['data'], dict)

@pytest.mark.asyncio
async def test_high_score_immediate_completion(mock_context, sample_input):
    """Test that high evaluation scores skip iterations."""
    high_score_eval = Evaluation(
        score=0.95,
        issues=[],
        summary="Excellent code",
        issueSummary="No issues found"
    )
    
    with patch.object(module, 'evaluate_commits', return_value=high_score_eval), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify completion event was emitted
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'code-review.reasoning.completed'
        assert isinstance(emit_call['data'], dict)
        
        # Check for expected fields in the actual implementation
        assert 'selected_node_id' in emit_call['data']
        assert 'state' in emit_call['data']
        assert 'reasoning' in emit_call['data']
        assert 'stats' in emit_call['data']
        assert 'all_nodes' in emit_call['data']

@pytest.mark.asyncio
async def test_zero_iterations_immediate_completion(mock_context, sample_input):
    """Test that zero max_iterations skips the MCTS process."""
    # Modify input to have zero iterations
    input_zero_iter = sample_input.model_copy(update={'max_iterations': 0})
    
    test_eval = Evaluation(
        score=0.5,
        issues=[Issue(
            claim="Test claim",
            grounds="Test grounds",
            warrant="Test warrant",
            backing="Test backing",
            qualifier="Test qualifier"
        )],
        summary="Average code",
        issueSummary="Some issues found"
    )

    with patch.object(module, 'evaluate_commits', return_value=test_eval), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(input_zero_iter, mock_context)

        # Verify completion event was emitted
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'code-review.reasoning.completed'
        assert isinstance(emit_call['data'], dict)
        
        # Verify it contains the expected fields from the report_data structure
        assert 'selected_node_id' in emit_call['data']
        assert 'state' in emit_call['data']
        assert 'reasoning' in emit_call['data']
        
        # Verify it contains the state from the evaluation
        assert emit_call['data']['state'] == "Average code"

@pytest.mark.asyncio
async def test_evaluation_error_handling(mock_context, sample_input):
    """Test error handling during commit evaluation."""
    with patch.object(module, 'evaluate_commits', side_effect=Exception("Evaluation failed")), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify error event was emitted
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'code-review.reasoning.completed'

@pytest.mark.asyncio
async def test_state_initialization(mock_context, sample_input, mock_evaluation):
    """Test proper initialization of MCTS state."""
    with patch.object(module, 'evaluate_commits', return_value=mock_evaluation), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify emitted state
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        state_data = emit_call['data']

        # Check state structure
        assert isinstance(state_data, dict)
        assert state_data['max_iterations'] == sample_input.max_iterations
        assert state_data['exploration_constant'] == sample_input.exploration_constant
        assert state_data['max_depth'] == sample_input.max_depth
        assert state_data['output_url'] == sample_input.output_url
        
        # Check root node
        root_id = state_data['root_id']
        nodes = state_data['nodes']
        assert root_id in nodes
        assert nodes[root_id]['parent'] is None
        assert nodes[root_id]['visits'] == 1
        assert nodes[root_id]['state'] == mock_evaluation.summary

@pytest.mark.asyncio
async def test_logging_truncation(mock_context, sample_input, mock_evaluation):
    """Test that long requirements are properly truncated in logs."""
    # Create input with long requirements
    long_requirements = "A" * 100  # Long string
    input_with_long_req = sample_input.model_copy(update={'requirements': long_requirements})
    
    with patch.object(module, 'evaluate_commits', return_value=mock_evaluation), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(input_with_long_req, mock_context)

        # Verify truncated logging
        first_log_call = mock_context.logger.info.call_args_list[0]
        logged_data = first_log_call[0][1]  # Get the logged data dictionary
        assert len(logged_data['requirements']) <= 23  # 20 chars + "..."
        
        # Verify emit was called
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'mcts.iteration.started'

@pytest.mark.asyncio
async def test_commits_creation_logging(mock_context, sample_input, mock_evaluation):
    """Test that repository access and commit loading is properly logged."""
    with patch.object(module, 'evaluate_commits', return_value=mock_evaluation), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify logging calls
        mock_context.logger.info.assert_any_call('Creating commits object for repository', {
            'repo_dir': sample_input.repo_dir,
            'branch': sample_input.branch,
            'review_start_commit': sample_input.review_start_commit,
            'review_end_commit': sample_input.review_end_commit
        })

        mock_context.logger.info.assert_any_call('Successfully accessed repository and loaded commits', {
            'files_changed': 2,  # len(files.split('\n'))
            'commit_messages': 2  # len(messages.split('\n'))
        })

@pytest.mark.asyncio
async def test_edge_cases(mock_context, sample_input, mock_evaluation):
    """Test edge cases such as empty summaries or issues."""
    # Evaluation with empty fields
    empty_eval = Evaluation(
        score=0.7,
        issues=[],
        summary="",
        issueSummary=""
    )
    
    with patch.object(module, 'evaluate_commits', return_value=empty_eval), \
         patch.object(module, 'Commits', MockCommitsWithCreate):

        # Execute handler
        await handler(sample_input, mock_context)

        # Verify event emission
        assert mock_context.emit.call_count == 1
        emit_call = mock_context.emit.call_args[0][0]
        assert emit_call['topic'] == 'mcts.iteration.started'
        assert isinstance(emit_call['data'], dict)
        
        # Check the fields actually found in the emission data
        assert 'current_iteration' in emit_call['data']
        assert 'current_node_id' in emit_call['data']
        assert 'exploration_constant' in emit_call['data']
        assert 'max_depth' in emit_call['data']
