from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# ====================
# Model Definitions
# ====================

class Node(BaseModel):
    id: str
    parent: Optional[str] = None
    children: List[str] = Field(default_factory=list)
    visits: int = 0
    value: float = 0.0
    state: Optional[str] = None
    isTerminal: Optional[bool] = None

class NodeExpansion(BaseModel):
    reasoning: str = Field(..., description="Explanation of the reasoning process")
    steps: List[str] = Field(..., description="Next steps in the reasoning process")

class Issue(BaseModel):
    claim: str
    grounds: str
    warrant: str
    backing: str
    qualifier: str

class Evaluation(BaseModel):
    score: float
    issues: List[Issue]
    summary: str
    issueSummary: str

class SimulationResult(BaseModel):
    nodeId: str = Field(..., description="ID of the evaluated node")
    value: float = Field(..., ge=0.0, le=1.0, description="Score between 0 and 1")
    explanation: str = Field(..., description="Explanation of the score")

# Response models for agent interactions
class NodeSelectionResponse(BaseModel):
    selected_node_id: str = Field(..., description="ID of the selected node")

class ReasoningEvaluation(BaseModel):
    value: float = Field(..., ge=0.0, le=1.0, description="Evaluation score")
    explanation: str = Field(..., description="Explanation of the score") 