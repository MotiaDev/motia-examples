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
  repository: 'file://../../..',
  branch: 'main',
  requirements: 'Create an implementation of a reasoning code-review agent workflow using the Monte Carlo Tree Search algorithm in the Motia framework',
  depth: 2,
  reviewStartCommit: '',
  reviewEndCommit: 'HEAD',
  reviewMaxCommits: 14,
  maxIterations: 6,
  outputUrl: 'file://Review.md'
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
      console.log('No Motia server detected, please start the server first');
      process.exit(1);
    }
    
    // Get the current branch if not specified
    const currentBranch = args.branch || getCurrentBranch();
    
    // Create request payload with defaults and overrides from args
    const payload = {
      repository: args.repository || DEFAULT_CONFIG.repository,
      branch: currentBranch,
      requirements: args.requirements || DEFAULT_CONFIG.requirements,
      depth: parseInt(args.depth || DEFAULT_CONFIG.depth),
      reviewStartCommit: args.reviewStartCommit || DEFAULT_CONFIG.reviewStartCommit,
      reviewEndCommit: args.reviewEndCommit || DEFAULT_CONFIG.reviewEndCommit,
      reviewMaxCommits: parseInt(args.reviewMaxCommits || DEFAULT_CONFIG.reviewMaxCommits),
      maxIterations: parseInt(args.maxIterations || DEFAULT_CONFIG.maxIterations),
      outputUrl: args.outputPath ? `file://${args.outputPath}` : DEFAULT_CONFIG.outputUrl
    };
    
    console.log('Sending review request with configuration:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Send the request
    console.log('Sending request to code review API...');
    const response = await sendApiRequest(payload);
    console.log('Review request accepted:', response);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
