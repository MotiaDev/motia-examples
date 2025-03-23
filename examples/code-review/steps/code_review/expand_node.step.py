import uuid
import json
import traceback
from typing import Dict, Any, List

from steps.shared.actions import expand_node
from steps.shared.models import NodeExpansion

config = {
    'type': 'event',
    'name': 'ExpandNode',
    'description': 'Expands a selected node by generating possible reasoning steps',
    'subscribes': ['mcts.node.selected'],
    'emits': ['mcts.node.expanded', 'code-review.reasoning.completed'],
    'flows': ['code-review-flow']
}

def convert_to_json_serializable(obj):
    """Convert SimpleNamespace or other non-serializable objects to dictionaries"""
    if obj is None:
        return None
    elif isinstance(obj, dict):
        return {k: convert_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # Handle SimpleNamespace or any class instance
        return convert_to_json_serializable(vars(obj))
    elif hasattr(obj, 'model_dump'):
        # Handle Pydantic models
        return convert_to_json_serializable(obj.model_dump())
    else:
        # Handle basic types
        try:
            # Test if it's JSON serializable
            json.dumps(obj)
            return obj
        except (TypeError, OverflowError):
            # If not serializable, convert to string
            return str(obj)

async def handler(input_data: Dict[str, Any], ctx):
    """
    Handler for expanding a selected node by generating possible reasoning steps.
    Uses LLM assistance to generate possible next steps in reasoning.
    """
    try:
        ctx.logger.info('ExpandNode received input', {
            'input_type': type(input_data).__name__,
            'is_dict': isinstance(input_data, dict)
        })
        
        # Ensure input_data is a dictionary
        if not isinstance(input_data, dict):
            try:
                input_data = vars(input_data)
                ctx.logger.info('Converted input to dictionary', {
                    'keys_count': len(input_data.keys()) if hasattr(input_data, 'keys') else 'No keys method'
                })
            except Exception as e:
                ctx.logger.error(f'Invalid input format for expand_node: {str(e)}')
                await generate_error_report(ctx, {'error': str(e)})
                return
                
        # Extract and convert nodes to a proper dictionary if needed
        raw_nodes = input_data.get('nodes', {})
        nodes = {}
        
        if isinstance(raw_nodes, dict):
            nodes = raw_nodes
        elif hasattr(raw_nodes, '__dict__'):
            nodes = vars(raw_nodes)
        else:
            ctx.logger.error(f'Nodes is not a dictionary or object with __dict__: {type(raw_nodes)}')
            await generate_error_report(ctx, {'error': f'Nodes is not a dictionary: {type(raw_nodes)}'})
            return
            
        root_id = input_data.get('root_id')
        selected_node_id = input_data.get('selected_node_id')
        output_url = input_data.get('output_url')
        requirements = input_data.get('requirements', 'No requirements specified')
        repository = input_data.get('repository', 'Unknown repository')
        branch = input_data.get('branch', 'Unknown branch')
        
        ctx.logger.info('Extracted node data', {
            'nodes_count': len(nodes) if isinstance(nodes, dict) else 'Not a dict',
            'root_id': root_id,
            'selected_node_id': selected_node_id
        })
        
        # Validate the selected node exists
        if selected_node_id not in nodes:
            ctx.logger.error('Selected node not found in tree', {'node_id': selected_node_id})
            await generate_error_report(ctx, {
                'error': f'Selected node {selected_node_id} not found in nodes',
                'output_url': output_url,
                'requirements': requirements,
                'repository': repository
            })
            return
        
        selected_node = nodes[selected_node_id]
        
        # Get the node's state to expand - handle both dict and object access
        if isinstance(selected_node, dict):
            node_state = selected_node.get('state', '')
        else:
            node_state = getattr(selected_node, 'state', '')
            
        if not node_state:
            ctx.logger.error('Selected node has no state to expand', {'node_id': selected_node_id})
            await generate_error_report(ctx, {
                'error': f'Selected node {selected_node_id} has no state to expand',
                'output_url': output_url,
                'requirements': requirements,
                'repository': repository
            })
            return
        
        # Generate possible reasoning steps using expand_node from actions.py
        ctx.logger.info('Expanding node', {'node_id': selected_node_id})
        try:
            expansion = await expand_node(node_state)
            ctx.logger.info('Node expansion successful', {
                'expansion_type': type(expansion).__name__
            })
        except Exception as expansion_error:
            ctx.logger.error(f'Error in expand_node function: {str(expansion_error)}', {
                'error': str(expansion_error),
                'traceback': traceback.format_exc()
            })
            # Create a fallback expansion
            expansion = NodeExpansion(
                reasoning="Fallback expansion due to API error in expand_node handler",
                steps=[
                    "Analyze the code structure and organization",
                    "Review error handling patterns and edge cases",
                    "Consider performance implications and optimization opportunities"
                ]
            )
            ctx.logger.info('Using fallback expansion', {
                'steps_count': len(expansion.steps)
            })
        
        # Check if we have any steps to add
        if not hasattr(expansion, 'steps') or not expansion.steps or len(expansion.steps) == 0:
            ctx.logger.warn('No expansion steps returned for node', {
                'node_id': selected_node_id,
                'expansion_type': type(expansion).__name__,
                'expansion_attrs': dir(expansion) if hasattr(expansion, '__dir__') else 'No attrs'
            })
            # Create a hardcoded fallback expansion
            expansion = NodeExpansion(
                reasoning="Fallback expansion due to empty steps",
                steps=[
                    "Analyze code organization and structure",
                    "Review documentation and comments",
                    "Consider test coverage and quality"
                ]
            )
            ctx.logger.info('Using hardcoded fallback expansion', {
                'steps_count': len(expansion.steps)
            })
        
        # Log expansion info
        ctx.logger.info('Generated expansion', {
            'node_id': selected_node_id,
            'step_count': len(expansion.steps),
            'reasoning': expansion.reasoning[:100] + ('...' if len(expansion.reasoning) > 100 else '')
        })
        
        # Create new nodes for each expanded step
        expanded_node_ids = []
        
        # Initialize or get existing children array
        children = []
        if isinstance(selected_node, dict):
            if 'children' not in selected_node:
                selected_node['children'] = []
            children = selected_node['children']
        else:
            if not hasattr(selected_node, 'children'):
                setattr(selected_node, 'children', [])
            children = getattr(selected_node, 'children', [])
        
        # Create a child node for each expansion step
        for step in expansion.steps:
            new_node_id = str(uuid.uuid4())
            
            # Create the new node
            nodes[new_node_id] = {
                'id': new_node_id,
                'parent': selected_node_id,
                'children': [],
                'visits': 0,
                'value': 0,
                'state': step,
                'isTerminal': False
            }
            
            # Add the new node ID to the parent's children array
            if isinstance(selected_node, dict):
                if 'children' not in selected_node:
                    selected_node['children'] = []
                selected_node['children'].append(new_node_id)
            else:
                if not hasattr(selected_node, 'children'):
                    setattr(selected_node, 'children', [])
                getattr(selected_node, 'children', []).append(new_node_id)
            
            # Add to our list of expanded nodes
            expanded_node_ids.append(new_node_id)
        
        # Convert nodes to JSON serializable format
        try:
            serializable_nodes = convert_to_json_serializable(nodes)
            ctx.logger.info('Successfully converted nodes to JSON serializable format')
        except Exception as serialize_error:
            ctx.logger.error(f'Error serializing nodes: {str(serialize_error)}', {
                'error': str(serialize_error),
                'traceback': traceback.format_exc()
            })
            await generate_error_report(ctx, {
                'error': f'Error serializing nodes: {str(serialize_error)}',
                'output_url': output_url,
                'requirements': requirements,
                'repository': repository
            })
            return
        
        # Emit the expanded tree to the next step
        try:
            await ctx.emit({
                'topic': 'mcts.node.expanded',
                'data': {
                    'nodes': serializable_nodes,
                    'expanded_node_ids': expanded_node_ids,
                    'root_id': root_id,
                    'max_iterations': input_data.get('max_iterations'),
                    'current_iteration': input_data.get('current_iteration'),
                    'exploration_constant': input_data.get('exploration_constant'),
                    'max_depth': input_data.get('max_depth'),
                    'output_url': output_url,
                    'requirements': requirements,
                    'repository': repository,
                    'branch': branch
                }
            })
            ctx.logger.info('Successfully emitted mcts.node.expanded event')
        except Exception as emit_error:
            ctx.logger.error(f'Error emitting expanded event: {str(emit_error)}', {
                'error': str(emit_error),
                'traceback': traceback.format_exc()
            })
            await generate_error_report(ctx, {
                'error': f'Error emitting expanded event: {str(emit_error)}',
                'output_url': output_url,
                'requirements': requirements,
                'repository': repository
            })
            return
        
    except Exception as error:
        ctx.logger.error(f'Error expanding node: {str(error)}', {
            'error': str(error),
            'traceback': traceback.format_exc()
        })
        await generate_error_report(ctx, {
            'error': str(error),
            'output_url': input_data.get('output_url') if isinstance(input_data, dict) else None,
            'requirements': input_data.get('requirements') if isinstance(input_data, dict) else 'Unknown requirements',
            'repository': input_data.get('repository') if isinstance(input_data, dict) else 'Unknown repository'
        })

async def generate_error_report(ctx, error_data):
    """Generate a report when an error occurs"""
    try:
        # Create a basic report with error information
        error_message = error_data.get('error', 'Unknown error')
        
        report_data = {
            'selected_node_id': 'error-node',
            'state': f"Error occurred during Monte Carlo Tree Search node expansion. {error_message}",
            'reasoning': f"The code review process encountered an error during the expansion phase of MCTS. Error: {error_message}",
            'stats': {
                'visits': 0,
                'value': 0,
                'total_visits': 0,
                'children_count': 0
            },
            'all_nodes': {},
            'output_url': error_data.get('output_url', 'file://ERROR-REPORT.md'),
            'requirements': error_data.get('requirements', 'No requirements specified'),
            'repository': error_data.get('repository', 'Unknown repository'),
            'branch': error_data.get('branch', 'Unknown branch')
        }
        
        # Log report data
        ctx.logger.info('Generating error report from ExpandNode', {'error': error_message})
        
        # Skip to report generation
        await ctx.emit({
            'topic': 'code-review.reasoning.completed',
            'data': report_data
        })
    except Exception as emit_error:
        ctx.logger.error(f'Failed to generate error report: {str(emit_error)}', {
            'error': str(emit_error),
            'original_error': error_data.get('error', 'Unknown error')
        }) 