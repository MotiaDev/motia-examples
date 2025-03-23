import pytest
from steps.shared.agents import (
    mcts_agent, expansion_agent, code_review_agent, 
    system_analysis_agent, reasoning_eval_agent, fallback_agent,
    Agent
)

def test_mcts_agent():
    assert isinstance(mcts_agent, Agent)
    assert "Monte Carlo Tree Search" in mcts_agent.description
    assert "UCB1" in mcts_agent.instructions

def test_expansion_agent():
    assert isinstance(expansion_agent, Agent)
    assert "software engineer" in expansion_agent.description
    assert "reasoning paths" in expansion_agent.instructions

def test_code_review_agent():
    assert isinstance(code_review_agent, Agent)
    assert "software reviewer" in code_review_agent.description
    assert "Toulmin Model" in code_review_agent.instructions

def test_system_analysis_agent():
    assert isinstance(system_analysis_agent, Agent)
    assert "software architect" in system_analysis_agent.description
    assert "system boundaries" in system_analysis_agent.instructions

def test_reasoning_eval_agent():
    assert isinstance(reasoning_eval_agent, Agent)
    assert "evaluator" in reasoning_eval_agent.description
    assert "reasoning paths" in reasoning_eval_agent.instructions

def test_fallback_agent():
    assert isinstance(fallback_agent, Agent)
    assert "software engineering" in fallback_agent.description 