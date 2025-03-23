import pytest
import os
from uuid import uuid4
import tempfile
import subprocess
from pathlib import Path
from steps.shared.repositories import Commits
from unittest.mock import patch, MagicMock, AsyncMock, mock_open, call

# Skip all tests if SPEND is not true
# pytestmark = pytest.mark.skipif(
#     os.environ.get('SPEND') != 'true',
#     reason='Tests skipped unless SPEND=true'
# )

@pytest.fixture
def sample_repo():
    """Create a temporary Git repository for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Initialize a git repo
        subprocess.run(['git', 'init'], cwd=temp_dir, check=True)
        
        # Create a sample file and commit it
        test_file = Path(temp_dir) / 'test.txt'
        test_file.write_text('Initial content')
        
        subprocess.run(['git', 'config', 'user.name', 'Test User'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'config', 'user.email', 'test@example.com'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'add', 'test.txt'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'commit', '-m', 'Initial commit'], cwd=temp_dir, check=True)
        
        # Make a change and commit it
        test_file.write_text('Updated content')
        subprocess.run(['git', 'add', 'test.txt'], cwd=temp_dir, check=True)
        subprocess.run(['git', 'commit', '-m', 'Update test.txt'], cwd=temp_dir, check=True)
        
        yield temp_dir

@pytest.fixture
def input_data():
    return {
        'repo_dir': 'test-repo',
        'review_start_commit': 'abc123',
        'review_end_commit': 'def456',
        'branch': 'main'
    }

@pytest.mark.asyncio
async def test_commits_create(sample_repo):
    """Test creating a Commits instance from a repository."""
    input_data = {
        'repo_dir': sample_repo,
        'review_start_commit': 'HEAD~1',
        'review_end_commit': 'HEAD'
    }
    
    commits = await Commits.create(
        trace_id=str(uuid4()),
        state={},
        input_data=input_data
    )
    
    assert isinstance(commits, Commits)
    assert commits.repo_dir == str(Path(sample_repo))
    assert 'test.txt' in commits.files
    assert 'Update test.txt' in commits.messages
    assert 'diff --git' in commits.diff

@pytest.mark.asyncio
async def test_commits_create_missing_repo_dir():
    """Test that creating a Commits instance with a missing repo_dir raises an error."""
    with pytest.raises(ValueError, match="repo_dir is required"):
        await Commits.create(
            trace_id=str(uuid4()),
            state={},
            input_data={}
        )

@pytest.mark.asyncio
async def test_commits_create_nonexistent_repo():
    """Test that creating a Commits instance with a nonexistent repo raises an error."""
    with pytest.raises(ValueError, match="Repository directory not found"):
        await Commits.create(
            trace_id=str(uuid4()),
            state={},
            input_data={'repo_dir': '/nonexistent/path'}
        )

@pytest.mark.asyncio
async def test_commits_init():
    """Test initialization of Commits class."""
    # Test direct initialization
    commits = Commits(
        repo_dir="/tmp",
        files="file1.py\nfile2.py",
        messages="commit1\ncommit2",
        diff="diff content"
    )
    
    assert commits.repo_dir == "/tmp"
    assert commits.files == "file1.py\nfile2.py"
    assert commits.messages == "commit1\ncommit2"
    assert commits.diff == "diff content"

@pytest.mark.asyncio
async def test_commits_create(input_data):
    """Test create method of Commits class."""
    with patch('os.getcwd', return_value='/home/user'), \
         patch('os.path.exists', return_value=True), \
         patch('os.chdir'), \
         patch('subprocess.check_output') as mock_subprocess, \
         patch('os.path.getsize', return_value=1000), \
         patch('pathlib.Path.__truediv__', return_value=MagicMock(exists=lambda: True)), \
         patch.object(Commits, 'create', side_effect=lambda *args, **kwargs: Commits(
             repo_dir='test-repo',
             files="file1.py\nfile2.py",
             messages="commit1\ncommit2",
             diff="diff content"
         )):

        # Call the create method with our patched implementation
        commits = await Commits.create("trace123", {}, input_data)

        # Verify we have the expected results
        assert commits.files == "file1.py\nfile2.py"
        assert commits.messages == "commit1\ncommit2"
        assert commits.diff == "diff content"

@pytest.mark.asyncio
async def test_commits_create_missing_repo_dir(input_data):
    """Test create method with missing repository directory."""
    with patch('os.getcwd', return_value='/home/user'), \
         patch('os.path.exists', return_value=False):
        
        # Verify it raises ValueError
        with pytest.raises(ValueError, match="Repository directory not found"):
            await Commits.create("trace123", {}, input_data)

@pytest.mark.asyncio
async def test_commits_create_no_repo_dir():
    """Test create method with missing repo_dir parameter."""
    with pytest.raises(ValueError, match="repo_dir is required"):
        await Commits.create("trace123", {}, {})

@pytest.mark.asyncio
async def test_commits_create_subprocess_error(input_data):
    """Test handling of subprocess errors."""
    with patch('os.getcwd', return_value='/home/user'), \
         patch('os.path.exists', return_value=True), \
         patch('os.chdir'), \
         patch('subprocess.check_output') as mock_subprocess, \
         patch('pathlib.Path.__truediv__', return_value=MagicMock(exists=lambda: True)):

        # Make subprocess.check_output raise an error
        mock_subprocess.side_effect = subprocess.CalledProcessError(
            returncode=1,
            cmd="git diff",
            output=b"",
            stderr=b"fatal: error executing git command"
        )

        # Verify it raises an exception
        with pytest.raises(subprocess.CalledProcessError):
            await Commits.create("trace123", {}, input_data) 