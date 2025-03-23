import os
import random
import subprocess
from pathlib import Path
from typing import Dict

class Commits:
    """Represents changes to a repository since a given commit or event."""
    
    def __init__(self, repo_dir: str, files: str, messages: str, diff: str):
        self.repo_dir = repo_dir
        self.files = files
        self.messages = messages
        self.diff = diff

    @classmethod
    async def create(cls, trace_id: str, state: any, input_data: Dict) -> 'Commits':
        """Create a Commits instance from repository data."""
        repo_dir = input_data.get('repo_dir')
        if not repo_dir:
            raise ValueError("repo_dir is required")
        
        repo_path = Path(os.getcwd()) / repo_dir
        if not repo_path.exists():
            raise ValueError(f"Repository directory not found: {repo_path}")

        # Change to repo directory for git commands
        original_dir = os.getcwd()
        os.chdir(repo_path)
        
        try:
            # Get the list of changed files
            files_cmd = [
                'git', 'diff', '--name-only',
                input_data.get('review_start_commit', 'HEAD~14'),  # Default to last 14 commits
                input_data.get('review_end_commit', 'HEAD')
            ]
            files = subprocess.check_output(files_cmd, text=True)

            # Get commit messages
            messages_cmd = [
                'git', 'log', '--pretty=format:%s',
                f"{input_data.get('review_start_commit', 'HEAD~14')}..{input_data.get('review_end_commit', 'HEAD')}"
            ]
            messages = subprocess.check_output(messages_cmd, text=True)

            # Get the diff, with size limits
            diff_cmd = [
                'git', 'diff',
                input_data.get('review_start_commit', 'HEAD~14'),
                input_data.get('review_end_commit', 'HEAD')
            ]
            
            # Get full diff size first
            diff = subprocess.check_output(diff_cmd, text=True)
            
            # If diff is too large (>1MB), sample it
            MAX_DIFF_SIZE = 1024 * 1024  # 1MB
            if len(diff.encode('utf-8')) > MAX_DIFF_SIZE:
                # Get list of changed files
                changed_files = files.splitlines()
                
                # Randomly sample files until we're under the size limit
                sampled_diff = ""
                sampled_files = []
                while changed_files and len(sampled_diff.encode('utf-8')) < MAX_DIFF_SIZE:
                    # Randomly select a file
                    file_idx = random.randrange(len(changed_files))
                    selected_file = changed_files.pop(file_idx)
                    
                    # Get diff for this file
                    file_diff_cmd = [
                        'git', 'diff',
                        input_data.get('review_start_commit', 'HEAD~14'),
                        input_data.get('review_end_commit', 'HEAD'),
                        '--', selected_file
                    ]
                    try:
                        file_diff = subprocess.check_output(file_diff_cmd, text=True)
                        if len((sampled_diff + file_diff).encode('utf-8')) <= MAX_DIFF_SIZE:
                            sampled_diff += file_diff
                            sampled_files.append(selected_file)
                    except subprocess.CalledProcessError:
                        continue  # Skip files that can't be diffed
                
                # Update files and diff with sampled data
                files = "\n".join(sampled_files)
                diff = sampled_diff

            return cls(str(repo_path), files, messages, diff)
            
        finally:
            # Restore original directory
            os.chdir(original_dir) 