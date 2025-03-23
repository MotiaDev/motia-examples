import pytest
from steps.shared.models import (
    Node, NodeExpansion, Issue, Evaluation, SimulationResult,
    NodeSelectionResponse, ReasoningEvaluation
)

@pytest.fixture
def sample_nodes() -> dict[str, Node]:
    root_id = "root"
    child1_id = "child1"
    child2_id = "child2"
    
    return {
        root_id: Node(
            id=root_id,
            parent=None,
            children=[child1_id, child2_id],
            visits=10,
            value=5.0,
            state="Root state",
            isTerminal=False
        ),
        child1_id: Node(
            id=child1_id,
            parent=root_id,
            children=[],
            visits=5,
            value=2.5,
            state="Child 1 state",
            isTerminal=False
        ),
        child2_id: Node(
            id=child2_id,
            parent=root_id,
            children=[],
            visits=4,
            value=3.0,
            state="Child 2 state",
            isTerminal=False
        )
    }

# Test type definitions
def test_node_type_definition(sample_nodes):
    node = sample_nodes["root"]
    assert isinstance(node.id, str)
    assert isinstance(node.children, list)
    assert isinstance(node.visits, int)
    assert isinstance(node.value, float)
    assert isinstance(node.state, (str, type(None)))
    assert isinstance(node.isTerminal, (bool, type(None)))

def test_node_expansion_type_definition():
    expansion = NodeExpansion(
        reasoning="Test reasoning",
        steps=["step1", "step2"]
    )
    assert isinstance(expansion.reasoning, str)
    assert isinstance(expansion.steps, list)
    assert all(isinstance(step, str) for step in expansion.steps)

def test_issue_type_definition():
    issue = Issue(
        claim="Test claim",
        grounds="Test grounds",
        warrant="Test warrant",
        backing="Test backing",
        qualifier="Test qualifier"
    )
    assert all(isinstance(getattr(issue, field), str) for field in ["claim", "grounds", "warrant", "backing", "qualifier"])

def test_evaluation_type_definition():
    evaluation = Evaluation(
        score=0.8,
        issues=[Issue(
            claim="Test claim",
            grounds="Test grounds",
            warrant="Test warrant",
            backing="Test backing",
            qualifier="Test qualifier"
        )],
        summary="Test summary",
        issueSummary="Test issue summary"
    )
    assert isinstance(evaluation.score, float)
    assert isinstance(evaluation.issues, list)
    assert isinstance(evaluation.summary, str)
    assert isinstance(evaluation.issueSummary, str)

def test_simulation_result_type_definition():
    result = SimulationResult(
        nodeId="test-node",
        value=0.8,
        explanation="Test explanation"
    )
    assert isinstance(result.nodeId, str)
    assert isinstance(result.value, float)
    assert isinstance(result.explanation, str)

def test_node_selection_response_type_definition():
    response = NodeSelectionResponse(
        selected_node_id="test-node"
    )
    assert isinstance(response.selected_node_id, str)

def test_reasoning_evaluation_type_definition():
    eval = ReasoningEvaluation(
        value=0.8,
        explanation="Test explanation"
    )
    assert isinstance(eval.value, float)
    assert isinstance(eval.explanation, str)
    assert 0 <= eval.value <= 1 