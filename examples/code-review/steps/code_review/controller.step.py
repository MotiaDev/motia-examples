from datetime import datetime
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field
from steps.shared.actions import evaluate_commits, Commits, Node

def convert_to_serializable(obj):
    """Recursively convert objects to dictionaries for JSON serialization"""
    if hasattr(obj, 'model_dump'):
        # For Pydantic models
        return convert_to_serializable(obj.model_dump())
    elif hasattr(obj, '__dict__'):
        # For SimpleNamespace or other objects
        return convert_to_serializable(vars(obj))
    elif isinstance(obj, dict):
        # Handle dictionaries
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        # Handle lists
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, tuple):
        # Handle tuples
        return tuple(convert_to_serializable(item) for item in obj)
    elif isinstance(obj, (str, int, float, bool, type(None))):
        # Keep primitives as they are
        return obj
    else:
        # Default conversion to string for other types
        return str(obj)

class MCTSControllerInput(BaseModel):
    prompt: str = Field(..., description="The prompt for code review", min_length=1)
    repo_dir: str = Field(..., description="Directory of the repository to review", min_length=1)
    branch: str = Field(..., description="Branch to review", min_length=1)
    max_iterations: int = Field(default=100, description="Maximum number of MCTS iterations")
    exploration_constant: float = Field(default=1.414, description="Exploration constant for UCB1")
    max_depth: int = Field(default=10, description="Maximum depth of the MCTS tree")
    review_start_commit: Optional[str] = Field(None, description="Starting commit for review")
    review_end_commit: Optional[str] = Field(None, description="Ending commit for review")
    requirements: str = Field(..., description="Requirements for the code review", min_length=1)
    output_url: Optional[str] = Field(None, description="URL to save the review output")

class MCTSControllerState(BaseModel):
    nodes: Dict[str, Node]
    root_id: str
    current_node_id: str
    current_iteration: int
    max_iterations: int
    exploration_constant: float
    max_depth: int
    output_url: Optional[str]

class ErrorData(BaseModel):
    message: str
    timestamp: str
    repository: str
    output_url: Optional[str]
    requirements: str

config = {
    'type': 'event',
    'name': 'MCTSController',
    'description': 'Controls the MCTS process for code review reasoning',
    'subscribes': ['review.requested', 'mcts.backpropagation.completed'],
    'emits': ['mcts.iteration.started', 'mcts.iterations.completed', 'review.error'],
    'flows': ['code-review-flow']
}

async def handler(req: Any, context: Any):
    """Handle the MCTS controller step."""
    try:
        # Check if the input is from the backpropagation completed event
        is_backpropagation = False
        if isinstance(req, dict) and 'topic' in req:
            is_backpropagation = req.get('topic') == 'mcts.backpropagation.completed'
        elif hasattr(req, 'topic'):
            is_backpropagation = req.topic == 'mcts.backpropagation.completed'
        
        # Handle different input types (SimpleNamespace or Pydantic model)
        if hasattr(req, 'model_dump'):
            # It's a Pydantic model
            input_dict = req.model_dump()
            requirements = req.requirements
            repo_dir = req.repo_dir if hasattr(req, 'repo_dir') else req.repository if hasattr(req, 'repository') else None
            branch = req.branch
            review_start_commit = req.review_start_commit if hasattr(req, 'review_start_commit') else None
            review_end_commit = req.review_end_commit if hasattr(req, 'review_end_commit') else None
            max_iterations = req.max_iterations
            exploration_constant = req.exploration_constant
            max_depth = req.max_depth
            output_url = req.output_url if hasattr(req, 'output_url') else req.output_path if hasattr(req, 'output_path') else None
        else:
            # It's a SimpleNamespace object or dict
            input_dict = vars(req) if not isinstance(req, dict) else req
            requirements = input_dict.get('requirements')
            repo_dir = input_dict.get('repo_dir') or input_dict.get('repository')
            branch = input_dict.get('branch')
            review_start_commit = input_dict.get('review_start_commit')
            review_end_commit = input_dict.get('review_end_commit')
            max_iterations = input_dict.get('max_iterations', 100)
            exploration_constant = input_dict.get('exploration_constant', 1.414)
            max_depth = input_dict.get('max_depth', 10)
            output_url = input_dict.get('output_url') or input_dict.get('output_path')
        
        # If this is mcts.backpropagation.completed, use the nodes structure directly
        if is_backpropagation:
            # For backpropagation, extract the data field if it exists
            forwarded_data = input_dict
            if 'data' in input_dict:
                forwarded_data = input_dict['data']
            
            # Ensure we have the repository field (may be named repo_dir in the forwarded data)
            if not repo_dir and 'repository' in forwarded_data:
                repo_dir = forwarded_data['repository']
                
            # Include repo_dir as a fallback if only repository is available
            if 'repository' in forwarded_data and not 'repo_dir' in forwarded_data:
                forwarded_data['repo_dir'] = forwarded_data['repository']
            
            # Forward the data to the next stage
            serializable_data = convert_to_serializable(forwarded_data)
            await context.emit({
                'topic': 'mcts.iteration.started', 
                'data': serializable_data
            })
            return
        
        # Validate required fields for initial request
        if not repo_dir:
            raise ValueError("repo_dir is required")
        if not branch:
            raise ValueError("branch is required")
        if not requirements:
            raise ValueError("requirements is required")
        
        # Log input with truncated requirements
        truncated_requirements = (
            f"{requirements[:20]}..." 
            if len(requirements) > 20 
            else requirements
        )
        
        context.logger.info('Analyzing review context', {
            'requirements': truncated_requirements,
            'repo_dir': repo_dir,
            'branch': branch,
            'max_iterations': max_iterations
        })

        # Store requirements in state for error handling
        await context.state.set(context.trace_id, 'requirements', requirements)
    
        context.logger.info('Creating commits object for repository', { 
            'repo_dir': repo_dir, 
            'branch': branch,
            'review_start_commit': review_start_commit,
            'review_end_commit': review_end_commit
        })
        
        commits = await Commits.create(context.trace_id, context.state, input_dict)
        
        context.logger.info('Successfully accessed repository and loaded commits', {
            'files_changed': len(commits.files.split('\n')),
            'commit_messages': len(commits.messages.split('\n'))
        })
        
        evaluation = await evaluate_commits(commits, requirements)
        
        # Define a unique root node ID
        root_id = f'root-{int(datetime.now().timestamp())}'

        # Properly handle evaluation summary whether it's a string or object
        summary_state = ""
        if hasattr(evaluation, 'summary'):
            summary_state = evaluation.summary
        elif isinstance(evaluation, str):
            summary_state = evaluation
        else:
            # Use string representation as fallback
            summary_state = str(evaluation)
        
        # Get evaluation score with proper fallback
        evaluation_score = 0.5  # Default fallback score
        if hasattr(evaluation, 'score'):
            evaluation_score = evaluation.score
        
        nodes = {
            root_id: Node(
                id=root_id,
                parent=None,
                children=[],
                visits=1,
                value=0,
                state=summary_state,
                isTerminal=False
            )
        }
    
        state = MCTSControllerState(
            nodes=nodes,
            root_id=root_id,
            current_node_id=root_id,
            current_iteration=0,
            max_iterations=max_iterations,
            exploration_constant=exploration_constant,
            max_depth=max_depth,
            output_url=output_url
        )

        # Skip MCTS if there are issues with evaluation or max_iterations is 0
        skip_mcts = max_iterations == 0
        
        if skip_mcts or evaluation_score >= 0.9:
            # Prepare data for report generation
            final_state_dict = state.model_dump() if hasattr(state, 'model_dump') else vars(state)
            
            # Add additional fields for report generation
            report_data = {
                'selected_node_id': root_id,
                'state': summary_state,
                'reasoning': f"Code review analysis completed.\n\n{summary_state}",
                'stats': {
                    'visits': 1,
                    'value': evaluation_score,
                    'total_visits': 1,
                    'children_count': 0
                },
                'all_nodes': nodes,
                'output_url': output_url,
                'requirements': requirements,
                'repository': repo_dir,
                'branch': branch
            }
            
            # Skip MCTS and go straight to report generation
            await context.emit({
                'topic': 'code-review.reasoning.completed',
                'data': convert_to_serializable(report_data)
            })
            return

        # Start MCTS process if no issues
        await context.emit({
            'topic': 'mcts.iteration.started',
            'data': convert_to_serializable(state.model_dump() if hasattr(state, 'model_dump') else vars(state))
        })

    except Exception as error:
        context.logger.error(f"Error in MCTS controller: {str(error)}")
        
        # Get info for error report
        error_data = ErrorData(
            message=str(error),
            timestamp=datetime.now().isoformat(),
            repository=getattr(req, 'repo_dir', str(req)),
            output_url=getattr(req, 'output_url', None),
            requirements=getattr(req, 'requirements', 'Unknown requirements')
        )
        
        # Try to generate a basic report even if there was an error
        try:
            root_id = f'error-{int(datetime.now().timestamp())}'
            nodes = {
                root_id: Node(
                    id=root_id,
                    parent=None,
                    children=[],
                    visits=1,
                    value=0,
                    state=f"Error occurred during code review: {str(error)}",
                    isTerminal=True
                )
            }
            
            report_data = {
                'selected_node_id': root_id,
                'state': f"Error occurred during code review: {str(error)}",
                'reasoning': f"The code review process encountered an error: {str(error)}",
                'stats': {
                    'visits': 1,
                    'value': 0,
                    'total_visits': 1,
                    'children_count': 0
                },
                'all_nodes': nodes,
                'output_url': getattr(req, 'output_url', 'file://ERROR-REPORT.md'),
                'requirements': getattr(req, 'requirements', 'Unknown requirements'),
                'repository': getattr(req, 'repo_dir', 'Unknown repository'),
                'branch': getattr(req, 'branch', 'main')
            }
            
            # Emit report generation event
            await context.emit({
                'topic': 'code-review.reasoning.completed',
                'data': convert_to_serializable(report_data)
            })
        except Exception as report_error:
            context.logger.error(f"Failed to generate error report: {str(report_error)}")
            # If even that fails, emit the basic error
            await context.emit({
                'topic': 'review.error',
                'data': convert_to_serializable(error_data.model_dump() if hasattr(error_data, 'model_dump') else vars(error_data))
            }) 