import traceback
from typing import Dict, Any, List

from steps.shared.models import SimulationResult
from steps.shared.actions import evaluate_reasoning

config = {
    'type': 'event',
    'name': 'Simulate',
    'description': 'Simulates reasoning path outcome using LLM evaluation',
    'subscribes': ['mcts.node.expanded'],
    'emits': ['mcts.simulation.completed'],
    'flows': ['code-review-flow']
}

def safe_get(obj, key, default=None):
    """Safely get a value from either a dictionary or an object"""
    if isinstance(obj, dict):
        return obj.get(key, default)
    elif hasattr(obj, key):
        return getattr(obj, key)
    return default

def convert_to_dict(obj):
    """Convert an object to a dictionary if possible"""
    if isinstance(obj, dict):
        return obj
    elif hasattr(obj, '__dict__'):
        return vars(obj)
    elif hasattr(obj, 'model_dump'):
        return obj.model_dump()
    return {}

async def handler(input_data: Dict[str, Any], ctx):
    """
    Handler for simulating node outcomes by evaluating reasoning paths.
    Uses LLM assistance to evaluate the quality of reasoning paths.
    """
    try:
        # Convert input to dictionary if needed
        if not isinstance(input_data, dict):
            input_data = convert_to_dict(input_data)
            ctx.logger.info('Converted input to dictionary', {
                'keys_count': len(input_data) if input_data else 0
            })
        
        # Extract data with safe access
        nodes_obj = safe_get(input_data, 'nodes', {})
        nodes = convert_to_dict(nodes_obj)
        
        root_id = safe_get(input_data, 'root_id')
        expanded_node_ids = safe_get(input_data, 'expanded_node_ids', [])
        max_iterations = safe_get(input_data, 'max_iterations')
        current_iteration = safe_get(input_data, 'current_iteration')
        exploration_constant = safe_get(input_data, 'exploration_constant')
        max_depth = safe_get(input_data, 'max_depth')
        output_url = safe_get(input_data, 'output_url')
        requirements = safe_get(input_data, 'requirements', 'No requirements specified')
        repository = safe_get(input_data, 'repository', 'Unknown repository')
        branch = safe_get(input_data, 'branch', 'Unknown branch')
        
        ctx.logger.info('Extracted simulation parameters', {
            'nodes_type': type(nodes).__name__,
            'nodes_count': len(nodes) if isinstance(nodes, dict) else 'Not a dict',
            'root_id': root_id,
            'expanded_count': len(expanded_node_ids) if isinstance(expanded_node_ids, list) else 'Not a list'
        })
        
        # Validate the root node exists
        if root_id not in nodes:
            ctx.logger.error('Root node not found in tree', {'root_id': root_id})
            # Provide a fallback simulation result
            await emit_fallback_result(ctx, nodes, root_id, expanded_node_ids, max_iterations, 
                                      current_iteration, exploration_constant, max_depth, 
                                      output_url, requirements, repository, branch,
                                      "Root node not found in tree")
            return
        
        # Validate there are expanded nodes to simulate
        if not expanded_node_ids or len(expanded_node_ids) == 0:
            ctx.logger.warn('No expanded nodes to simulate', {'root_id': root_id})
            # Provide a fallback simulation result using the root node
            await emit_fallback_result(ctx, nodes, root_id, [root_id], max_iterations, 
                                      current_iteration, exploration_constant, max_depth, 
                                      output_url, requirements, repository, branch,
                                      "No expanded nodes to simulate")
            return
        
        # Get the root node state
        root_node = nodes[root_id]
        root_state = safe_get(root_node, 'state', '')
            
        if not root_state:
            ctx.logger.error('Root node has no state for simulation context', {'root_id': root_id})
            await emit_fallback_result(ctx, nodes, root_id, expanded_node_ids, max_iterations, 
                                      current_iteration, exploration_constant, max_depth, 
                                      output_url, requirements, repository, branch,
                                      "Root node has no state for simulation context")
            return
        
        # Get the states of expanded nodes
        expanded_states = []
        valid_expanded_ids = []
        for node_id in expanded_node_ids:
            if node_id in nodes:
                node = nodes[node_id]
                state = safe_get(node, 'state', '')
                    
                if state:
                    expanded_states.append(state)
                    valid_expanded_ids.append(node_id)
                else:
                    ctx.logger.warn('Expanded node has no state', {'node_id': node_id})
            else:
                ctx.logger.warn('Expanded node not found in tree', {'node_id': node_id})
        
        if not expanded_states:
            ctx.logger.warn('No valid expanded states for simulation', {'root_id': root_id})
            await emit_fallback_result(ctx, nodes, root_id, [root_id], max_iterations, 
                                      current_iteration, exploration_constant, max_depth, 
                                      output_url, requirements, repository, branch,
                                      "No valid expanded states for simulation")
            return
        
        # Perform simulation by evaluating the reasoning paths
        ctx.logger.info('Simulating outcomes for expanded nodes', {
            'root_id': root_id,
            'expanded_node_count': len(valid_expanded_ids),
            'current_iteration': current_iteration,
            'max_iterations': max_iterations
        })
        
        # Use evaluate_reasoning from actions.py to evaluate reasoning paths
        try:
            simulation_result = await evaluate_reasoning(root_state, expanded_states, valid_expanded_ids)
            
            ctx.logger.info('Simulation completed', {
                'selected_node_id': simulation_result.nodeId,
                'value': simulation_result.value
            })
        except Exception as evaluation_error:
            ctx.logger.error('Error in evaluate_reasoning function', {
                'error': str(evaluation_error),
                'traceback': traceback.format_exc()
            })
            
            # Create a fallback simulation result
            if valid_expanded_ids:
                selected_id = valid_expanded_ids[0]
                explanation = f"Fallback evaluation due to error: {str(evaluation_error)}"
            else:
                selected_id = root_id
                explanation = "Fallback evaluation due to missing or invalid expanded nodes"
                
            simulation_result = SimulationResult(
                nodeId=selected_id,
                value=0.5,  # Neutral value
                explanation=explanation
            )
            
            ctx.logger.info('Using fallback simulation result', {
                'selected_node_id': simulation_result.nodeId,
                'value': simulation_result.value
            })
        
        # Emit the simulation result for backpropagation
        try:
            # For logging, convert the simulation result to a simple dictionary
            result_dict = {
                'nodeId': simulation_result.nodeId,
                'value': simulation_result.value,
                'explanation': simulation_result.explanation[:50] + '...' if len(simulation_result.explanation) > 50 else simulation_result.explanation
            }
            
            ctx.logger.info('Preparing to emit simulation result', {
                'topic': 'mcts.simulation.completed',
                'simulation_result': result_dict
            })
            
            # Ensure we're sending properly serializable data
            simulation_result_serializable = {
                'nodeId': str(simulation_result.nodeId),  # Ensure it's a string
                'value': float(simulation_result.value),  # Ensure it's a float
                'explanation': str(simulation_result.explanation)  # Ensure it's a string
            }
            
            # Convert nodes to a serializable format if needed
            serializable_nodes = {}
            for node_id, node in nodes.items():
                if isinstance(node, dict):
                    serializable_nodes[node_id] = node
                else:
                    serializable_nodes[node_id] = convert_to_dict(node)
            
            await ctx.emit({
                'topic': 'mcts.simulation.completed',
                'data': {
                    'nodes': serializable_nodes,
                    'root_id': root_id,
                    'simulation_result': simulation_result_serializable,
                    'max_iterations': max_iterations,
                    'current_iteration': current_iteration,
                    'exploration_constant': exploration_constant,
                    'max_depth': max_depth,
                    'output_path': output_url,
                    'requirements': requirements,
                    'repository': repository,
                    'branch': branch
                }
            })
            
            ctx.logger.info('Successfully emitted simulation result')
        except Exception as emit_error:
            ctx.logger.error('Failed to emit simulation result', {
                'error': str(emit_error),
                'traceback': traceback.format_exc()
            })
    except Exception as error:
        ctx.logger.error('Error simulating node outcomes', {
            'error': str(error),
            'traceback': traceback.format_exc()
        })
        
        await emit_fallback_result(ctx, 
                                 input_data.get('nodes', {}) if isinstance(input_data, dict) else {},
                                 safe_get(input_data, 'root_id'), 
                                 safe_get(input_data, 'expanded_node_ids', []), 
                                 safe_get(input_data, 'max_iterations'),
                                 safe_get(input_data, 'current_iteration'), 
                                 safe_get(input_data, 'exploration_constant'), 
                                 safe_get(input_data, 'max_depth'),
                                 safe_get(input_data, 'output_url'),
                                 safe_get(input_data, 'requirements', 'No requirements specified'),
                                 safe_get(input_data, 'repository', 'Unknown repository'),
                                 safe_get(input_data, 'branch', 'Unknown branch'),
                                 f"Error simulating node outcomes: {str(error)}")

async def emit_fallback_result(ctx, nodes, root_id, node_ids, max_iterations, current_iteration, 
                             exploration_constant, max_depth, output_url, requirements, repository, branch, reason):
    """Creates and emits a fallback simulation result"""
    try:
        # Use the first node_id if available, otherwise use root_id
        selected_id = node_ids[0] if node_ids and len(node_ids) > 0 else (root_id or 'fallback-node')
        
        # Create a fallback simulation result
        simulation_result = {
            'nodeId': str(selected_id),  # Ensure it's a string
            'value': 0.5,
            'explanation': f"Fallback evaluation: {reason}"
        }
        
        ctx.logger.info('Emitting fallback simulation result', {
            'selected_node_id': selected_id,
            'reason': reason
        })
        
        # Convert nodes to a serializable format if needed
        serializable_nodes = {}
        if isinstance(nodes, dict):
            for node_id, node in nodes.items():
                if isinstance(node, dict):
                    serializable_nodes[node_id] = node
                else:
                    try:
                        # Try to convert to dict if possible
                        if hasattr(node, '__dict__'):
                            serializable_nodes[node_id] = vars(node)
                        elif hasattr(node, 'model_dump'):
                            serializable_nodes[node_id] = node.model_dump()
                        else:
                            serializable_nodes[node_id] = {'id': node_id, 'state': str(node)}
                    except Exception:
                        # If conversion fails, create a minimal valid node
                        serializable_nodes[node_id] = {'id': node_id, 'state': 'Conversion error'}
        
        # Ensure all other values are of the correct type
        current_iteration_value = int(current_iteration) if current_iteration is not None else 1
        max_iterations_value = int(max_iterations) if max_iterations is not None else 10
        exploration_constant_value = float(exploration_constant) if exploration_constant is not None else 1.0
        max_depth_value = int(max_depth) if max_depth is not None else 5
        
        # Emit the fallback result
        await ctx.emit({
            'topic': 'mcts.simulation.completed',
            'data': {
                'nodes': serializable_nodes,
                'root_id': str(root_id) if root_id else 'fallback-root',
                'simulation_result': simulation_result,
                'max_iterations': max_iterations_value,
                'current_iteration': current_iteration_value,
                'exploration_constant': exploration_constant_value,
                'max_depth': max_depth_value,
                'output_path': str(output_url) if output_url else 'file://Review.md',
                'requirements': str(requirements),
                'repository': str(repository),
                'branch': str(branch)
            }
        })
        
        ctx.logger.info('Successfully emitted fallback simulation result')
    except Exception as emit_error:
        ctx.logger.error('Failed to emit fallback simulation result', {
            'error': str(emit_error),
            'traceback': traceback.format_exc()
        })
        
        # Last resort: generate an error report
        try:
            await ctx.emit({
                'topic': 'code-review.error',
                'data': {
                    'error': f"Failed to generate simulation results: {reason}. Additional error: {str(emit_error)}",
                    'output_path': str(output_url) if output_url else 'file://ERROR-REPORT.md'
                }
            })
        except Exception as final_error:
            ctx.logger.error('Critical failure in error reporting', {
                'error': str(final_error)
            })