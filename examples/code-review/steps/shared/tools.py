from typing import Dict, Any
from agno.tools import tool
import math

# ====================
# Tool Definitions
# ====================

@tool("calculate_ucb")
def calculate_ucb(
    node: Any,
    parent_node: Any,
    exploration_constant: float
) -> float:
    """
    Calculate the UCB1 (Upper Confidence Bound) value for a node.
    
    Args:
        node: The node to calculate UCB for
        parent_node: The parent node
        exploration_constant: The exploration constant for UCB1
        
    Returns:
        The UCB1 value for the node
    """
    # Handle both dictionary and SimpleNamespace/object instances
    if isinstance(node, dict):
        visits = node.get('visits', 0)
        value = node.get('value', 0)
    else:
        visits = getattr(node, 'visits', 0)
        value = getattr(node, 'value', 0)
    
    if isinstance(parent_node, dict):
        parent_visits = parent_node.get('visits', 0)
    else:
        parent_visits = getattr(parent_node, 'visits', 0)
    
    if visits == 0:
        return float('inf')  # Prioritize unexplored nodes
    
    # Ensure we don't divide by zero
    visits = max(1, visits)
    parent_visits = max(1, parent_visits)
    
    exploitation = value / visits
    exploration = exploration_constant * math.sqrt(math.log(parent_visits) / visits)
    
    return exploitation + exploration

@tool("find_node_with_highest_ucb")
def find_node_with_highest_ucb(
    nodes: Dict[str, Any], 
    parent_id: str,
    exploration_constant: float
) -> str:
    """
    Find the child node with the highest UCB1 value.
    
    Args:
        nodes: Dictionary of nodes
        parent_id: ID of the parent node
        exploration_constant: The exploration constant for UCB1
        
    Returns:
        The ID of the node with highest UCB1 value
    """
    parent_node = nodes[parent_id]
    
    # Handle both dictionary and object access for children
    if isinstance(parent_node, dict):
        children = parent_node.get('children', [])
    else:
        children = getattr(parent_node, 'children', [])
    
    if not children:
        return parent_id
    
    max_ucb = -float('inf')
    best_node_id = None
    
    for child_id in children:
        if child_id not in nodes:
            continue
        
        child = nodes[child_id]
        ucb = calculate_ucb(child, parent_node, exploration_constant)
        
        if ucb > max_ucb:
            max_ucb = ucb
            best_node_id = child_id
    
    return best_node_id or (children[0] if children else parent_id)

@tool("get_node_depth")
def get_node_depth(nodes: Dict[str, Any], node_id: str) -> int:
    """
    Calculate the depth of a node in the tree.
    
    Args:
        nodes: Dictionary of nodes
        node_id: ID of the node
        
    Returns:
        The depth of the node (0 for root)
    """
    depth = 0
    current_id = node_id
    
    while current_id in nodes:
        node = nodes[current_id]
        # Handle both dictionary and object access for parent
        if isinstance(node, dict):
            parent = node.get('parent')
        else:
            parent = getattr(node, 'parent', None)
            
        if parent is None:
            break
            
        depth += 1
        current_id = parent
    
    return depth 