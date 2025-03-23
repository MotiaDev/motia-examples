from typing import Dict, Optional, Any
import math
import datetime
import json
from steps.shared.models import Node
from shared.tools import calculate_ucb
import asyncio
import random

config = {
    'type': 'event',
    'name': 'SelectNode',
    'description': 'Selects a node for expansion based on UCB1 score',
    'subscribes': ['mcts.iteration.started'],
    'emits': ['mcts.node.selected', 'code-review.reasoning.completed', 'review.error'],
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

def select_node_ucb1(nodes: Dict[str, Any], 
                     current_node_id: str, 
                     exploration_constant: float,
                     max_depth: int,
                     explored_depth: int = 0) -> str:
    """
    Select a node to explore using the UCB1 algorithm, which balances
    exploration and exploitation in the MCTS tree.
    
    If a node has unexplored children (visits=0), we prioritize exploring those.
    Otherwise, we select the child with the highest UCB1 score.
    
    Args:
        nodes: Dictionary of all nodes
        current_node_id: ID of the current node
        exploration_constant: Exploration constant for UCB1
        max_depth: Maximum depth to explore
        explored_depth: Current depth in the exploration
        
    Returns:
        The ID of the selected node
    """
    current_node = nodes[current_node_id]
    
    # Safely get children attribute/key from node (dict or object)
    if isinstance(current_node, dict):
        children = current_node.get('children', [])
        is_terminal = current_node.get('isTerminal', False)
    else:
        children = getattr(current_node, 'children', [])
        is_terminal = getattr(current_node, 'isTerminal', False)
    
    # If node is a leaf node (has no children) or reached max depth, return it
    if not children or explored_depth >= max_depth:
        return current_node_id
    
    # Check if the node has terminal state
    if is_terminal:
        return current_node_id
    
    # Check if any children have 0 visits (unexplored)
    unexplored_children = []
    for child_id in children:
        if child_id in nodes:
            child_node = nodes[child_id]
            
            # Get visits safely from dict or object
            if isinstance(child_node, dict):
                visits = child_node.get('visits', 0)
            else:
                visits = getattr(child_node, 'visits', 0)
                
            if visits == 0:
                unexplored_children.append(child_id)
    
    # Prioritize exploring unexplored nodes
    if unexplored_children:
        return random.choice(unexplored_children)
    
    # No unexplored children, use UCB1 to select
    best_score = float('-inf')
    best_child_id = None
    
    for child_id in children:
        if child_id not in nodes:
            continue
        
        child_node = nodes[child_id]
        ucb1_score = calculate_ucb(child_node, current_node, exploration_constant)
        
        if ucb1_score > best_score:
            best_score = ucb1_score
            best_child_id = child_id
    
    # If we found a best child, recurse
    if best_child_id:
        return select_node_ucb1(nodes, best_child_id, exploration_constant, max_depth, explored_depth + 1)
    
    # If no valid children were found, return current node
    return current_node_id

async def handler(input_data: Any, ctx):
    """Handler for the SelectNode step"""
    try:
        # Log incoming data type and format
        ctx.logger.info('SelectNode received input', {
            'input_type': type(input_data).__name__,
            'is_dict': isinstance(input_data, dict)
        })
        
        # Handle different input formats (dict, SimpleNamespace, etc.)
        if not isinstance(input_data, dict):
            # Convert to dictionary if it's not already
            try:
                # Try to convert SimpleNamespace to dict
                input_dict = vars(input_data)
                ctx.logger.info('Converted input to dictionary', {
                    'keys_count': len(input_dict.keys()) if hasattr(input_dict, 'keys') else 'No keys method',
                    'has_nodes': 'nodes' in input_dict
                })
            except Exception as e:
                # If conversion fails, log error and emit error report
                ctx.logger.error(f'Invalid input format for select_node: {str(e)}')
                await generate_error_report(ctx, {'error': str(e)})
                return
        else:
            input_dict = input_data
            ctx.logger.info('Using input dictionary', {
                'keys_count': len(input_dict.keys()) if hasattr(input_dict, 'keys') else 'No keys method',
                'has_nodes': 'nodes' in input_dict
            })
        
        # Check if this is a backpropagation completion event
        # We should only handle the 'mcts.iteration.started' event
        # Let selectBestMove handle the final report for 'mcts.iterations.completed'
        event_topic = input_dict.get('topic', '')
        if event_topic and event_topic != 'mcts.iteration.started':
            ctx.logger.info(f'Not handling event: {event_topic}. Let specialized handlers manage it.')
            return
            
        # Extract required fields with fallbacks - ensure nodes is always a dict
        nodes = {}
        if 'nodes' in input_dict:
            raw_nodes = input_dict.get('nodes')
            # Convert nodes to a dictionary if it's not already
            if isinstance(raw_nodes, dict):
                nodes = raw_nodes
            elif hasattr(raw_nodes, '__dict__'):
                nodes = vars(raw_nodes)
            else:
                ctx.logger.error(f'Nodes is not a dictionary or object with __dict__: {type(raw_nodes)}')
                nodes = {}
        
        # Get other parameters
        root_id = input_dict.get('root_id', None)
        current_node_id = input_dict.get('current_node_id', root_id)
        max_iterations = input_dict.get('max_iterations', 100)
        current_iteration = input_dict.get('current_iteration', 0)
        exploration_constant = input_dict.get('exploration_constant', 1.414)
        max_depth = input_dict.get('max_depth', 10)
        
        # Additional values that might be needed
        output_url = input_dict.get('output_url', None)
        requirements = input_dict.get('requirements', 'No requirements specified')
        repository = input_dict.get('repository', 'Unknown repository')
        branch = input_dict.get('branch', 'Unknown branch')
        
        # Log extracted key values
        ctx.logger.info('Extracted parameters', {
            'nodes_count': len(nodes) if isinstance(nodes, dict) else 'Not a dict',
            'root_id': root_id,
            'current_node_id': current_node_id,
            'current_iteration': current_iteration,
            'max_iterations': max_iterations
        })
        
        # Basic validation
        if not nodes or not isinstance(nodes, dict) or len(nodes) == 0:
            ctx.logger.error('No valid nodes available for selection', {'nodes_type': type(nodes).__name__})
            await generate_error_report(ctx, {
                'error': f"Invalid nodes: {type(nodes).__name__}",
                'repository': repository,
                'branch': branch,
                'requirements': requirements,
                'output_url': output_url
            })
            return
            
        if not root_id:
            ctx.logger.error('Root ID not provided')
            await generate_error_report(ctx, input_dict)
            return
            
        if not current_node_id or current_node_id not in nodes:
            ctx.logger.error('Invalid current node ID', {
                'current_node_id': current_node_id, 
                'nodes_keys': list(nodes.keys())[:5] if hasattr(nodes, 'keys') else 'No keys method'
            })
            await generate_error_report(ctx, input_dict)
            return
            
        # Get the node to expand using UCB1 selection
        try:
            ctx.logger.info('Starting node selection with UCB1')
            selected_node_id = select_node_ucb1(nodes, current_node_id, exploration_constant, max_depth)
            
            ctx.logger.info('Successfully selected node')
            
            # Continue with node selection only if we haven't reached maximum iterations
            if current_iteration >= max_iterations:
                ctx.logger.info('Maximum iterations reached, skipping to report generation', {
                    'current_iteration': current_iteration,
                    'max_iterations': max_iterations
                })
                
                # Find the best node based on value/visits ratio for the final report
                try:
                    best_node_id = None
                    best_value_ratio = -1
                    
                    # Start from root and examine all nodes
                    node_count = 0
                    for node_id, node in nodes.items():
                        node_count += 1
                        try:
                            # Skip nodes with no visits
                            if isinstance(node, dict):
                                node_visits = node.get('visits', 0)
                                if node_visits == 0:
                                    continue
                                    
                                node_value = node.get('value', 0)
                            else:
                                node_visits = getattr(node, 'visits', 0)
                                if node_visits == 0:
                                    continue
                                    
                                node_value = getattr(node, 'value', 0)
                                
                            value_ratio = node_value / max(node_visits, 1)  # Avoid division by zero
                            
                            if value_ratio > best_value_ratio:
                                best_value_ratio = value_ratio
                                best_node_id = node_id
                        except Exception as node_error:
                            ctx.logger.error(f'Error processing node {node_id}', {
                                'error': str(node_error),
                                'node_type': type(node).__name__
                            })
                            # Continue with other nodes
                            continue
                    
                    ctx.logger.info('Examined nodes for best value ratio', {
                        'total_nodes': node_count,
                        'best_node_id': best_node_id,
                        'best_value_ratio': best_value_ratio
                    })
                    
                    # If we found a best node, use it for the report
                    # Otherwise, fall back to the selected node (which might be based on UCB1)
                    final_node_id = best_node_id if best_node_id else current_node_id
                    
                    ctx.logger.info('Selected best node for final report', {
                        'final_node_id': final_node_id,
                        'value_ratio': best_value_ratio if best_node_id else 'N/A'
                    })
                    
                    # Use ID property appropriately based on type
                    if not final_node_id and selected_node_id:
                        try:
                            if isinstance(selected_node_id, dict):
                                final_node_id = selected_node_id.get('id', current_node_id)
                            else:
                                final_node_id = getattr(selected_node_id, 'id', current_node_id)
                            ctx.logger.info('Using selected node ID as fallback', {
                                'final_node_id': final_node_id
                            })
                        except Exception as id_error:
                            ctx.logger.error('Error getting ID from selected node', {
                                'error': str(id_error)
                            })
                            final_node_id = current_node_id
                except Exception as best_node_error:
                    ctx.logger.error('Error finding best node', {
                        'error': str(best_node_error),
                        'error_type': type(best_node_error).__name__,
                        'nodes_type': type(nodes).__name__,
                        'nodes_count': len(nodes) if hasattr(nodes, '__len__') else 'unknown'
                    })
                    # Fall back to selected node
                    try:
                        if selected_node_id:
                            if isinstance(selected_node_id, dict):
                                final_node_id = selected_node_id.get('id', current_node_id)
                            else:
                                final_node_id = getattr(selected_node_id, 'id', current_node_id)
                        else:
                            final_node_id = current_node_id
                    except Exception as fallback_error:
                        ctx.logger.error('Error getting fallback node ID', {
                            'error': str(fallback_error)
                        })
                        final_node_id = str(current_node_id) if current_node_id else 'root-node'
                
                await generate_final_report(ctx, input_dict, final_node_id)
                return
                
            # Get selected node ID based on object or dict
            if selected_node_id:
                if isinstance(selected_node_id, dict):
                    selected_id = selected_node_id.get('id', current_node_id)
                else:
                    selected_id = getattr(selected_node_id, 'id', current_node_id)
            else:
                selected_id = current_node_id
            
            ctx.logger.info('Emitting selected node event', {'selected_id': selected_id})
            
            # Convert nodes to JSON serializable format
            serializable_nodes = convert_to_json_serializable(nodes)
                
            # Emit the selected node with serializable data
            await ctx.emit({
                'topic': 'mcts.node.selected',
                'data': {
                    'nodes': serializable_nodes,
                    'root_id': root_id,
                    'current_node_id': selected_id,
                    'selected_node_id': selected_id,
                    'current_iteration': current_iteration,
                    'max_iterations': max_iterations,
                    'exploration_constant': exploration_constant,
                    'max_depth': max_depth,
                    'output_url': output_url,
                    'requirements': requirements,
                    'repository': repository,
                    'branch': branch
                }
            })
            
        except Exception as select_error:
            ctx.logger.error(f'Error in node selection: {str(select_error)}', {'error': str(select_error)})
            await generate_error_report(ctx, {
                'error': str(select_error),
                'repository': repository,
                'branch': branch,
                'requirements': requirements,
                'output_url': output_url
            })
            
    except Exception as error:
        ctx.logger.error(f'Error selecting node: {str(error)}', {'error': str(error)})
        await generate_error_report(ctx, {'error': str(error)})

async def generate_error_report(ctx, input_dict):
    """Generate a report when an error occurs"""
    # Create a basic report with error information
    try:
        # Extract available fields
        node_id = input_dict.get('root_id', 'error-node')
        state = "Error occurred during Monte Carlo Tree Search node selection."
        reasoning = "The code review process encountered an error during the selection phase of MCTS."
        
        # Generate more detailed error report
        if 'error' in input_dict:
            reasoning += f" Error: {input_dict['error']}"
        
        # Convert any non-serializable objects
        serializable_nodes = convert_to_json_serializable(input_dict.get('nodes', {}))
        
        report_data = {
            'selected_node_id': node_id,
            'state': state,
            'reasoning': reasoning,
            'stats': {
                'visits': 0,
                'value': 0,
                'total_visits': 0,
                'children_count': 0
            },
            'all_nodes': serializable_nodes,
            'output_url': input_dict.get('output_url', 'file://ERROR-REPORT.md'),
            'requirements': input_dict.get('requirements', 'No requirements specified'),
            'repository': input_dict.get('repository', 'Unknown repository'),
            'branch': input_dict.get('branch', 'Unknown branch')
        }
        
        # Log report data
        ctx.logger.info('Generating error report', {'report_type': 'error'})
        
        # Skip to report generation
        await ctx.emit({
            'topic': 'code-review.reasoning.completed',
            'data': report_data
        })
    except Exception as emit_error:
        ctx.logger.error('Failed to generate error report', {'error': str(emit_error)})
        try:
            # Emit a basic error for the error handler to catch
            await ctx.emit({
                'topic': 'review.error',
                'data': {
                    'message': f"Failed to generate error report: {str(emit_error)}",
                    'timestamp': datetime.datetime.now().isoformat(),
                    'repository': input_dict.get('repository', 'Unknown repository')
                }
            })
        except Exception:
            ctx.logger.error('Process ended while there are some promises outstanding')

async def generate_final_report(ctx, input_dict, selected_node_id):
    """Generate the final report after reaching max iterations"""
    try:
        # Get nodes and other relevant data
        nodes = input_dict.get('nodes', {})
        
        # Log more extensive information to help diagnose issues
        ctx.logger.info('Generating final report with nodes', {
            'nodes_count': len(nodes) if isinstance(nodes, dict) else 'Not a dict',
            'selected_node_id': selected_node_id,
            'selected_node_in_nodes': selected_node_id in nodes if isinstance(nodes, dict) else False
        })
        
        state = "No state available"
        
        if selected_node_id in nodes:
            try:
                selected_node = nodes[selected_node_id]
                if isinstance(selected_node, dict):
                    if 'state' in selected_node:
                        state = selected_node.get('state', "No state available")
                    else:
                        ctx.logger.warn('Selected node has no state field', {'node_id': selected_node_id})
                        # Try other relevant fields that might contain useful information
                        if 'value' in selected_node:
                            state = f"Node value: {selected_node.get('value')}"
                elif hasattr(selected_node, 'state'):
                    state = getattr(selected_node, 'state', "No state available")
                else:
                    ctx.logger.warn('Selected node has no state attribute', {'node_id': selected_node_id})
                    # Try to get a meaningful alternative
                    if hasattr(selected_node, 'value'):
                        state = f"Node value: {getattr(selected_node, 'value')}"
                
                # If state is None or empty, try to get at least some information from the node
                if not state:
                    ctx.logger.warn('State is empty, constructing alternative', {'node_id': selected_node_id})
                    
                    # Get other node attributes as fallback
                    state_parts = []
                    
                    if isinstance(selected_node, dict):
                        # Try to get visits and value
                        visits = selected_node.get('visits', 0)
                        value = selected_node.get('value', 0)
                        state_parts.append(f"Node statistics - visits: {visits}, value: {value}")
                        
                        # Try to get children info
                        children = selected_node.get('children', [])
                        state_parts.append(f"Node has {len(children)} children")
                    else:
                        # Try to get attributes
                        attr_dict = vars(selected_node) if hasattr(selected_node, '__dict__') else {}
                        state_parts.append(f"Node has attributes: {', '.join(attr_dict.keys())}")
                    
                    state = "\n".join(state_parts) or "No state information available"
            except Exception as node_error:
                ctx.logger.error('Error extracting state from selected node', {
                    'error': str(node_error),
                    'node_id': selected_node_id
                })
                state = f"Error extracting state: {str(node_error)}"
        else:
            ctx.logger.warn('Selected node not found in nodes', {
                'selected_node_id': selected_node_id,
                'available_nodes': list(nodes.keys())[:5] if hasattr(nodes, 'keys') and len(nodes) > 0 else 'No nodes available'
            })
            
            # If selected node is missing, try to use the root node or any other node
            try:
                root_id = input_dict.get('root_id')
                if root_id and root_id in nodes:
                    ctx.logger.info('Using root node state as fallback', {'root_id': root_id})
                    
                    root_node = nodes[root_id]
                    if isinstance(root_node, dict):
                        state = root_node.get('state', "Root node (no state available)")
                    else:
                        state = getattr(root_node, 'state', "Root node (no state available)")
                elif nodes and len(nodes) > 0:
                    # Use any node in the collection as a last resort
                    random_id = next(iter(nodes.keys()))
                    random_node = nodes[random_id]
                    ctx.logger.info('Using random node state as fallback', {'random_id': random_id})
                    
                    if isinstance(random_node, dict):
                        state = random_node.get('state', "Random node (no state available)")
                    else:
                        state = getattr(random_node, 'state', "Random node (no state available)")
            except Exception as fallback_error:
                ctx.logger.error('Error using fallback node for state', {
                    'error': str(fallback_error)
                })
                state = "No state available. Failed to retrieve from any node."
        
        # Convert any non-serializable objects
        try:
            serializable_nodes = convert_to_json_serializable(nodes)
            ctx.logger.info('Successfully converted nodes to serializable format')
        except Exception as convert_error:
            ctx.logger.error('Error converting nodes to serializable format', {'error': str(convert_error)})
            # Create a simplified version with just the essential nodes
            serializable_nodes = {}
            # Include at least the selected node and root
            root_id = input_dict.get('root_id')
            if selected_node_id in nodes:
                serializable_nodes[selected_node_id] = {'id': selected_node_id, 'state': state}
            if root_id and root_id in nodes and root_id != selected_node_id:
                root_node = nodes[root_id]
                if isinstance(root_node, dict):
                    root_state = root_node.get('state', 'Root node')
                else:
                    root_state = getattr(root_node, 'state', 'Root node')
                serializable_nodes[root_id] = {'id': root_id, 'state': root_state}
        
        # Prepare report data
        report_data = {
            'selected_node_id': selected_node_id,
            'state': state,
            'reasoning': f"Code review analysis completed after {input_dict.get('current_iteration', 0)} iterations. Selected best reasoning path.",
            'stats': {
                'visits': 0,
                'value': 0,
                'total_visits': 0,
                'children_count': 0
            },
            'all_nodes': serializable_nodes,
            'output_url': input_dict.get('output_url', 'file://Review.md'),
            'requirements': input_dict.get('requirements', 'No requirements specified'),
            'repository': input_dict.get('repository', 'Unknown repository'),
            'branch': input_dict.get('branch', 'Unknown branch')
        }
        
        # Try to calculate stats if possible
        try:
            if selected_node_id in nodes:
                selected_node = nodes[selected_node_id]
                if isinstance(selected_node, dict):
                    visits = selected_node.get('visits', 0)
                    value = selected_node.get('value', 0)
                    children = selected_node.get('children', [])
                else:
                    visits = getattr(selected_node, 'visits', 0)
                    value = getattr(selected_node, 'value', 0)
                    children = getattr(selected_node, 'children', [])
                
                # Calculate total visits across all nodes
                total_visits = 0
                for node in nodes.values():
                    if isinstance(node, dict):
                        total_visits += node.get('visits', 0)
                    else:
                        total_visits += getattr(node, 'visits', 0)
                
                report_data['stats'] = {
                    'visits': visits,
                    'value': value,
                    'total_visits': total_visits,
                    'children_count': len(children)
                }
                
                ctx.logger.info('Successfully calculated stats for report', {
                    'visits': visits,
                    'value': value,
                    'total_visits': total_visits
                })
            else:
                ctx.logger.warn('Could not find selected node to calculate stats')
        except Exception as stats_error:
            ctx.logger.warn('Error calculating stats', {'error': str(stats_error)})
        
        # Log report data
        ctx.logger.info('Prepared final report data', {
            'report_type': 'final',
            'selected_node_id': selected_node_id,
            'state_length': len(state) if state else 0
        })
        
        # Emit event to generate the report
        try:
            await ctx.emit({
                'topic': 'code-review.reasoning.completed',
                'data': report_data
            })
            ctx.logger.info('Successfully emitted final report data')
        except Exception as emit_error:
            ctx.logger.error('Error emitting final report data', {'error': str(emit_error)})
            # As a last resort, try to emit a much simpler report
            simple_report = {
                'selected_node_id': selected_node_id,
                'state': state,
                'reasoning': 'Code review analysis completed.',
                'output_url': input_dict.get('output_url', 'file://Review.md'),
                'requirements': input_dict.get('requirements', 'No requirements specified'),
                'repository': input_dict.get('repository', 'Unknown repository')
            }
            await ctx.emit({
                'topic': 'code-review.reasoning.completed',
                'data': simple_report
            })
    except Exception as report_error:
        ctx.logger.error('Failed to generate final report', {'error': str(report_error)})
        # Try to provide a very basic fallback that works
        try:
            simple_report = {
                'selected_node_id': selected_node_id if selected_node_id else 'root',
                'state': 'Code review completed with limited information available.',
                'reasoning': f'The review process completed but encountered an error generating the final report: {str(report_error)}',
                'output_url': input_dict.get('output_url', 'file://Review.md'),
                'requirements': input_dict.get('requirements', 'No requirements specified'),
                'repository': input_dict.get('repository', 'Unknown repository'),
                'all_nodes': {}
            }
            await ctx.emit({
                'topic': 'code-review.reasoning.completed',
                'data': simple_report
            })
        except Exception:
            # Last resort
            await generate_error_report(ctx, input_dict) 