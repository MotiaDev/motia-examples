// steps/code-change-detector.step.js
const config = {
  type: 'event',
  name: 'code-change-detector',
  subscribes: ['repository-webhook'],
  emits: ['code-file-changed'],
  flows: ['documentation-guardian'],
};

const handler = async (payload, { emit, logger }) => {
  logger.info("Received repository webhook");
  
  // Extract relevant information from the webhook
  const { repository, commits, ref } = payload;
  
  // Process only main branch changes, adapt as needed
  if (ref !== "refs/heads/main") {
    logger.info(`Ignoring changes to ${ref}`);
    return;
  }
  
  // Extract files that were changed
  const changedFiles = [];
  commits.forEach(commit => {
    changedFiles.push(...commit.added, ...commit.modified);
  });
  
  // Filter for code files that might need documentation
  const codeFiles = changedFiles.filter(file => 
    /\.(js|ts|py|rb|java|c|cpp|go|rs)$/.test(file)
  );
  
  if (codeFiles.length === 0) {
    logger.info("No code files were changed");
    return;
  }
  
  // Emit an event for each code file that changed
  for (const file of codeFiles) {
    await emit({
      topic: 'code-file-changed',
      data: { 
        repository: repository.full_name,
        file,
        commitSha: commits[0].id
      }
    });
  }
}

module.exports = { config, handler };