#!/usr/bin/env node

/**
 * Simplified CLI script to invoke the code review process
 * Sends a POST request to the code review API endpoint
 */

const http = require('http');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// Default configuration
const DEFAULT_CONFIG = {
  repository: process.cwd(),
  repoUrl: process.cwd(),
  branch: 'main',
  requirements: 'Perform code review on the repository',
  depth: 2,
  reviewStartCommit: '',
  reviewEndCommit: 'HEAD',
  reviewMaxCommits: 14,
  maxIterations: 10,
  outputPath: path.join(process.cwd(), 'Review.md')
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsedArgs[key] = value;
        i++; // Skip the next argument as it's the value
      } else {
        parsedArgs[key] = true; // Flag argument
      }
    }
  }
  
  return parsedArgs;
}

// Check if a server is running on a specific port
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      // Port is in use
      resolve(true);
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// Check if motia server is running
async function isMotiaServerRunning() {
  const wsPortInUse = await isPortInUse(24678);
  const httpPortInUse = await isPortInUse(3000);
  return wsPortInUse && httpPortInUse;
}

// Start motia server and wait for it to be ready
function startMotiaServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting Motia server...');
    
    // Spawn the server process
    const serverProcess = spawn('npx', ['motia', 'dev'], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
      
      // Check if server is ready
      if (chunk.includes('Server started')) {
        console.log('Motia server started successfully');
        resolve({
          serverProcess,
          output
        });
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      process.stderr.write(chunk);
    });
    
    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });
    
    serverProcess.on('close', (code) => {
      if (code !== 0 && !output.includes('Server started')) {
        console.error(`Server process exited with code ${code}`);
        reject(new Error(`Server process exited with code ${code}\n${errorOutput}`));
      }
    });
    
    // Set timeout in case server doesn't start properly
    setTimeout(() => {
      if (!output.includes('Server started')) {
        serverProcess.kill();
        reject(new Error('Server start timeout exceeded'));
      }
    }, 30000); // 30 seconds timeout
  });
}

// Send POST request to API endpoint
function sendApiRequest(data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/review',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (e) {
            resolve({ success: true, data: responseData });
          }
        } else {
          reject(new Error(`HTTP error ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(payload);
    req.end();
  });
}

// Check for error logs in motia process
function checkForErrors() {
  try {
    // First check standard logs directory
    const logDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir)
                     .filter(file => file.endsWith('.log'))
                     .map(file => path.join(logDir, file));
      
      if (files.length > 0) {
        // Get most recent log file
        const mostRecentLog = files.sort((a, b) => {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        })[0];
        
        // Check last few lines for errors
        const content = fs.readFileSync(mostRecentLog, 'utf8');
        const lines = content.split('\n').slice(-50); // Last 50 lines
        
        const errorLines = lines.filter(line => 
          line.includes('[ERROR]') || 
          line.includes('Error:') || 
          line.includes('exception') ||
          line.includes('SyntaxError')
        );
        
        if (errorLines.length > 0) {
          return {
            hasErrors: true,
            errors: errorLines
          };
        }
      }
    }

    // Then check console output directly for errors
    // This is simpler and more direct than checking log files, especially since
    // we've seen the errors show up in the console output from the motia server
    try {
      const consoleContent = execSync('ps aux | grep "[m]otia dev" | cat', { encoding: 'utf8' });
      if (consoleContent) {
        try {
          // Safely attempt to get logs with error information
          const consoleLines = execSync('journalctl -n 100 | grep -i "error\\|exception\\|syntax"', { 
            encoding: 'utf8', 
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000 // Timeout after 5 seconds
          }).toString().split('\n');
          
          const consoleErrors = consoleLines.filter(line => 
            line.includes('[ERROR]') || 
            line.includes('Error:') || 
            line.includes('exception') ||
            line.includes('SyntaxError')
          );
          
          if (consoleErrors.length > 0) {
            return {
              hasErrors: true,
              errors: consoleErrors
            };
          }
        } catch (journalError) {
          // Gracefully continue if journalctl fails or times out
          console.log('Info: Unable to check system logs');
        }
      }
    } catch (psError) {
      // Gracefully handle if ps command fails
      console.log('Info: Unable to check for running motia server');
    }
    
    // Check Claude's temp file directory
    const claudeTempDir = '/tmp/claude-prompts';
    if (fs.existsSync(claudeTempDir)) {
      const tempFiles = fs.readdirSync(claudeTempDir)
                         .filter(file => file.startsWith('output-') && file.endsWith('.json'))
                         .map(file => path.join(claudeTempDir, file));
      
      if (tempFiles.length > 0) {
        // Get most recent output file
        const recentOutputFile = tempFiles.sort((a, b) => {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
        })[0];
        
        // Try to parse the file
        try {
          const content = fs.readFileSync(recentOutputFile, 'utf8');
          JSON.parse(content); // Test if valid JSON
        } catch (jsonError) {
          // Invalid JSON found in Claude output file
          return {
            hasErrors: true,
            errors: [`Claude response is not valid JSON: ${jsonError.message}`, 
                     `Check file: ${recentOutputFile}`]
          };
        }
      }
    }
    
    return { hasErrors: false };
  } catch (error) {
    // Don't log errors from the journalctl command as they're expected if pattern not found
    if (!error.message.includes('journalctl')) {
      console.log('Error checking for logs:', error.message);
    }
    return { hasErrors: false };
  }
}

// Wait for the output file to be created or modified
function waitForOutputFile(outputPath, initialModTime, timeout = 300) {
  return new Promise((resolve, reject) => {
    const interval = 3; // Check every 3 seconds
    let timeoutCounter = 0;
    
    const checkFile = () => {
      // Check if output file has been created/modified
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        const currentModTime = stats.mtimeMs;
        
        // If file modification time has changed or it's a new file
        if (!initialModTime || currentModTime > initialModTime) {
          const content = fs.readFileSync(outputPath, 'utf8');
          resolve(content);
          return;
        }
      }
      
      // Check for errors in logs periodically
      if (timeoutCounter % 10 === 0) { // Check every 30 seconds
        const errorCheck = checkForErrors();
        if (errorCheck.hasErrors) {
          console.log('\nDetected errors in the review process:');
          errorCheck.errors.forEach(error => console.log(`- ${error}`));
          reject(new Error('Review process encountered errors. See logs for details.'));
          return;
        }
      }
      
      timeoutCounter += interval;
      if (timeoutCounter >= timeout) {
        reject(new Error(`Timeout waiting for output file: ${outputPath}`));
        return;
      }
      
      process.stdout.write('.');
      setTimeout(checkFile, interval * 1000);
    };
    
    checkFile();
  });
}

// Get a unique output path to avoid conflicts with existing files
function getUniqueOutputPath(basePath) {
  // If file doesn't exist, use the original path
  if (!fs.existsSync(basePath)) {
    return { path: basePath, existed: false };
  }
  
  // File exists, get its modification time for comparison
  const stats = fs.statSync(basePath);
  const initialModTime = stats.mtimeMs;
  
  // Log that we found an existing file
  console.log(`Note: Output file already exists at ${basePath}`);
  console.log('Will monitor for changes to detect when the new review is generated');
  
  return { 
    path: basePath, 
    existed: true, 
    initialModTime 
  };
}

// Get the current git branch
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('Failed to get current git branch:', error.message);
    return DEFAULT_CONFIG.branch;
  }
}

// Display help information
function showHelp() {
  console.log(`
Usage: ./scripts/cli.js [options]

Options:
  --help                Show this help message
  --repository          Path to the git repository (default: current directory)
  --branch              Git branch to review (default: current branch)
  --requirements        Requirements for the code review (default: "Perform code review on the repository")
  --depth               The depth of the review (default: 2)
  --reviewStartCommit   Starting commit for review range (default: first commit)
  --reviewEndCommit     Ending commit for review range (default: HEAD)
  --reviewMaxCommits    Maximum number of commits to review (default: 14)
  --maxIterations       Maximum iterations for the review process (default: 10)
  --outputPath          Path to save the review output (default: ./Review.md)

Examples:
  ./scripts/cli.js                                               # Review current branch with defaults
  ./scripts/cli.js --branch develop                              # Review the develop branch
  ./scripts/cli.js --reviewStartCommit HEAD~10 --reviewEndCommit HEAD  # Review last 10 commits
  ./scripts/cli.js --requirements "Focus on security issues"     # Custom review focus
  ./scripts/cli.js --outputPath "./SecurityReview.md"            # Custom output file
`);
  process.exit(0);
}

// Main function
async function main() {
  try {
    // Parse command line arguments
    const args = parseArgs();
    
    // Show help if requested
    if (args.help) {
      showHelp();
      return;
    }
    
    // Check if motia server is running
    const serverRunning = await isMotiaServerRunning();
    let serverProcess = null;
    
    if (!serverRunning) {
      console.log('No Motia server detected, starting one...');
      const result = await startMotiaServer();
      serverProcess = result.serverProcess;
    } else {
      console.log('Motia server is already running');
    }
    
    // Get the current branch if not specified
    const currentBranch = args.branch || getCurrentBranch();
    
    // Create request payload with defaults and overrides from args
    const payload = {
      repository: args.repository || DEFAULT_CONFIG.repository,
      repoUrl: args.repoUrl || DEFAULT_CONFIG.repoUrl,
      branch: currentBranch,
      requirements: args.requirements || DEFAULT_CONFIG.requirements,
      depth: parseInt(args.depth || DEFAULT_CONFIG.depth),
      reviewStartCommit: args.reviewStartCommit || DEFAULT_CONFIG.reviewStartCommit,
      reviewEndCommit: args.reviewEndCommit || DEFAULT_CONFIG.reviewEndCommit,
      reviewMaxCommits: parseInt(args.reviewMaxCommits || DEFAULT_CONFIG.reviewMaxCommits),
      maxIterations: parseInt(args.maxIterations || DEFAULT_CONFIG.maxIterations),
      outputPath: args.outputPath || DEFAULT_CONFIG.outputPath
    };
    
    console.log('Sending review request with configuration:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Send the request
    console.log('Sending request to code review API...');
    const response = await sendApiRequest(payload);
    console.log('Review request accepted:', response);
    
    // Check output file status and wait for it to be created or updated
    const outputFileInfo = getUniqueOutputPath(payload.outputPath);
    console.log(`Waiting for review to be generated at: ${outputFileInfo.path}`);
    
    try {
      const content = await waitForOutputFile(
        outputFileInfo.path, 
        outputFileInfo.existed ? outputFileInfo.initialModTime : null
      );
      
      console.log('\nReview completed successfully!');
      
      // Show a preview of the file
      const previewLength = Math.min(500, content.length);
      console.log('\nPreview of the review:');
      console.log('='.repeat(40));
      console.log(content.substring(0, previewLength) + (content.length > previewLength ? '...' : ''));
      console.log('='.repeat(40));
      console.log(`\nFull review available at: ${outputFileInfo.path}`);
    } catch (error) {
      console.warn(`\n${error.message}`);
      console.log('The workflow might still be running in the background.');
      console.log(`Check ${payload.outputPath} later to see if it completes.`);
    }
    
    // If we started the server, shut it down
    if (serverProcess) {
      console.log('Shutting down Motia server...');
      process.kill(-serverProcess.pid);
      console.log('Motia server has been shut down');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
