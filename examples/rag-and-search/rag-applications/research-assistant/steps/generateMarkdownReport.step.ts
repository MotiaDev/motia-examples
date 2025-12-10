import { generateMarkdownReport } from '../utils/generateMarkdownReport';
import path from 'path';
import fs from 'fs';

export const config = {
  type: 'event',
  name: 'GenerateMarkdownReport',
  subscribes: ['related-papers-recommended', 'code-examples-generated'],
  emits: ['markdown-report-generated'],
  flows: ['research-assistant']
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title } = input;
    
    console.log(`Generating markdown report for paper: ${title}`);
    
    const knowledgeGraphPath = path.join(__dirname, '../data/knowledge-graph.json');
    const outputPath = path.join(__dirname, '../data/research-report.md');
    
    // Ensure knowledge graph exists
    if (!fs.existsSync(knowledgeGraphPath)) {
      console.error(`Knowledge graph file not found at: ${knowledgeGraphPath}`);
      return;
    }
    
    // Generate the markdown report
    generateMarkdownReport(knowledgeGraphPath, outputPath);
    
    // Verify the report was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`Markdown report generated successfully. File size: ${stats.size} bytes`);
      
      // Read the first few lines to log for debugging
      const reportPreview = fs.readFileSync(outputPath, 'utf-8').split('\n').slice(0, 10).join('\n');
      console.log(`Report preview:\n${reportPreview}\n...`);
    } else {
      console.warn(`Markdown report file was not created at: ${outputPath}`);
    }
    
    await emit({
      topic: 'markdown-report-generated',
      data: {
        id,
        title,
        reportPath: outputPath,
        reportGeneratedAt: new Date().toISOString()
      }
    });
    
    console.log(`Markdown report processing completed for paper: ${title}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error generating markdown report: ${errorMessage}`);
  }
}
