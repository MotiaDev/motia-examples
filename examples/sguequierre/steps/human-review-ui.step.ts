// steps/human-review-ui.step.ts
import * as fs from 'fs';
import * as path from 'path';

interface DocReviewPayload {
  file: string;
  content: string;
  gaps: Array<{
    type: string;
    name: string;
    issue: string;
    generated_doc: string;
    lineNumber?: number;
  }>;
}

// Configuration section
export const config = {
  type: 'event',
  name: 'human-review-ui',
  subscribes: ['documentation-generated'],
  emits: ['documentation-approved', 'documentation-rejected'],
  virtualEmits: ['documentation-review-completed'],
  flows: ['documentation-guardian']
};

// Handler function
export const handler = async (payload: DocReviewPayload, context: any) => {
  const { emit, logger } = context;
  logger.info(`Preparing review UI for ${payload.file}`);
  
  // Find line numbers for each gap
  const lines = payload.content.split('\n');
  const gapsWithLineNumbers = payload.gaps.map(gap => {
    const pattern = new RegExp(`${gap.type}\\s+${gap.name}`);
    
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return { ...gap, lineNumber: i + 1 };
      }
    }
    
    return gap;
  });
  
  // Display documentation changes in the console
  logger.info(`
    ====== DOCUMENTATION REVIEW ======
    File: ${payload.file}
    
    ${gapsWithLineNumbers.map((gap, i) => `
    ${gap.type}: ${gap.name}
    Issue: ${gap.issue}
    Line number: ${gap.lineNumber || 'Unknown'}
    Generated Documentation:
    ${gap.generated_doc}
    
    `).join('\n')}
  `);
  
  // Create a temporary approval file
  const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
  const reviewFilePath = path.join(tempDir, `doc-review-${Date.now()}.txt`);
  
  // Write instructions to the file
  fs.writeFileSync(
    reviewFilePath,
    `# Documentation Review for ${payload.file}
# To approve these changes, replace this text with "APPROVED"
# To reject these changes, replace this text with "REJECTED"
# Then save the file and close it.

Status: PENDING

# Documentation changes to review:
${gapsWithLineNumbers.map((gap, i) => `
${gap.type}: ${gap.name}
Issue: ${gap.issue}
Line number: ${gap.lineNumber || 'Unknown'}
Generated Documentation:
${gap.generated_doc}

`).join('\n')}
`
  );
  
  logger.info(`
    A review file has been created at: ${reviewFilePath}
    
    To approve or reject the changes:
    1. Open the file in any text editor
    2. Change "Status: PENDING" to either "Status: APPROVED" or "Status: REJECTED"
    3. Save and close the file
    
    The workflow will continue once you've made your decision.
  `);
  
  // Function to check if the file has been modified
  const checkApprovalStatus = () => {
    try {
      const fileContent = fs.readFileSync(reviewFilePath, 'utf8');
      
      if (fileContent.includes('Status: APPROVED')) {
        logger.info('Documentation changes approved');
        
        // Clean up the file
        try { fs.unlinkSync(reviewFilePath); } catch (e) {}
        
        emit({
          topic: "documentation-approved",
          data: {
            ...payload,
            gaps: gapsWithLineNumbers,
            approved: true
          }
        });
        
        return true;
      } else if (fileContent.includes('Status: REJECTED')) {
        logger.info('Documentation changes rejected');
        
        // Clean up the file
        try { fs.unlinkSync(reviewFilePath); } catch (e) {}
        
        emit({
          topic: "documentation-rejected",
          data: {
            ...payload,
            gaps: gapsWithLineNumbers,
            approved: false
          }
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Error checking approval status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };
  
  // Poll for changes every second
  const maxWaitTime = 30 * 60 * 1000; // 30 minutes
  const startTime = Date.now();
  
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const approved = checkApprovalStatus();
      
      if (approved) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > maxWaitTime) {
        // Timeout after maxWaitTime
        logger.warn('Review timed out after 30 minutes. Auto-approving changes.');
        
        // Clean up the file
        try { fs.unlinkSync(reviewFilePath); } catch (e) {}
        
        emit({
          topic: "documentation-approved",
          data: {
            ...payload,
            gaps: gapsWithLineNumbers,
            approved: true,
            timedOut: true
          }
        });
        
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
};