import os
import pytest
from unittest.mock import AsyncMock, MagicMock
from steps.shared.actions import Evaluation, Issue

import importlib.util
import sys
from pathlib import Path

# Add the code-review directory to the path so we can import the modules
# Resolve the parent directory of the current file
parent_dir = Path(__file__).resolve().parent.parent

def load_module(name, path):
    """Load a module from a file path."""
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Import controller module dynamically
controller_path = parent_dir / "code_review" / "controller.step.py"
controller = load_module("controller", controller_path)

# Import other modules as needed
# ...

def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "llm: mark test as requiring real LLM responses"
    )

def pytest_runtest_setup(item):
    """Skip LLM tests unless SPEND=true is set."""
    if "llm" in item.keywords and not os.environ.get("SPEND") == "true":
        pytest.skip("Skipping LLM test because SPEND=true is not set")

@pytest.fixture
def mock_context():
    """Create a mocked context for testing."""
    context = MagicMock()
    context.logger = MagicMock()
    context.logger.info = MagicMock()
    context.logger.warn = MagicMock()
    context.logger.error = MagicMock()
    context.logger.debug = MagicMock()
    context.emit = AsyncMock()
    context.state = MagicMock()
    context.state.get = AsyncMock()
    context.state.set = AsyncMock()
    context.trace_id = "test-trace-id"
    return context

@pytest.fixture
def sample_input():
    """Fixture for sample input data."""
    return controller.MCTSControllerInput(
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
    """Fixture for commits object with properly mocked async attributes."""
    commits = AsyncMock()
    commits.files = "file1.py\nfile2.py"
    commits.messages = "commit1\ncommit2"
    commits.diff = "diff content"
    return commits 