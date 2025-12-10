import fs from 'fs';
import path from 'path';
import { RelatedPaper, Paper, KnowledgeGraph, CodeExample } from '../types/knowledgeGraph';
import { cleanKnowledgeGraph } from './cleanKnowledgeGraph';

// Helper function to check if a related paper has valid data
function isValidRelatedPaper(paper: any): boolean {
  return (
    paper && 
    typeof paper === 'object' &&
    paper.title && 
    paper.title !== 'Unknown Title' &&
    paper.authors && 
    paper.authors !== 'Unknown Authors'
  );
}

// Helper function to check if a paper has valid data
function isValidPaper(paper: any): boolean {
  return (
    paper && 
    typeof paper === 'object' &&
    paper.id && 
    paper.title
  );
}

/**
 * Generates a markdown report from the knowledge graph
 * @param knowledgeGraphPath Path to the knowledge graph JSON file
 * @param outputPath Path to save the markdown report
 */
export function generateMarkdownReport(knowledgeGraphPath: string, outputPath: string): void {
  try {
    // Clean the knowledge graph first to remove invalid entries
    const knowledgeGraph = cleanKnowledgeGraph(knowledgeGraphPath);

    // Start building the markdown content
    let markdownContent = `# Research Paper Analysis Report\n\n`;
    markdownContent += `Generated on: ${new Date().toISOString()}\n\n`;
    
    // Add papers section
    markdownContent += `## Analyzed Papers\n\n`;
    
    // Process each paper in the knowledge graph
    const papers = knowledgeGraph.papers;
    for (const paperId in papers) {
      const paper = papers[paperId];
      
      // Skip papers with invalid data
      if (!isValidPaper(paper)) {
        continue;
      }
      
      markdownContent += `### ${paper.title}\n\n`;
      
      if (paper.authors) {
        markdownContent += `**Authors:** ${paper.authors}\n\n`;
      }
      
      if (paper.doi) {
        markdownContent += `**DOI:** ${paper.doi}\n\n`;
      }
      
      if (paper.pdfUrl) {
        markdownContent += `**PDF URL:** [${paper.pdfUrl}](${paper.pdfUrl})\n\n`;
      }
      
      // Only include uploadedAt if it exists and is not undefined
      if (paper.uploadedAt) {
        markdownContent += `**Uploaded At:** ${paper.uploadedAt}\n\n`;
      }
      
      // Add related papers section if available
      if (paper.internetRelatedPapers && paper.internetRelatedPapers.length > 0) {
        // Filter out invalid related papers
        const validRelatedPapers = paper.internetRelatedPapers.filter(isValidRelatedPaper);
        
        // Only proceed if there are valid related papers
        if (validRelatedPapers.length > 0) {
          markdownContent += `#### Related Papers\n\n`;
          
          validRelatedPapers.forEach((relatedPaper: RelatedPaper, index: number) => {
            markdownContent += `##### ${index + 1}. ${relatedPaper.title}\n\n`;
            
            if (relatedPaper.authors) {
              markdownContent += `**Authors:** ${relatedPaper.authors}\n\n`;
            }
            
            if (relatedPaper.year) {
              markdownContent += `**Year:** ${relatedPaper.year}\n\n`;
            }
            
            if (relatedPaper.url) {
              markdownContent += `**URL:** [${relatedPaper.url}](${relatedPaper.url})\n\n`;
            }
            
            if (relatedPaper.relevance) {
              markdownContent += `**Relevance:**\n${relatedPaper.relevance}\n\n`;
            }
            
            if (relatedPaper.keyInsights && relatedPaper.keyInsights.length > 0) {
              markdownContent += `**Key Insights:**\n`;
              relatedPaper.keyInsights.forEach((insight: string) => {
                if (insight && insight.trim()) {
                  markdownContent += `- ${insight}\n`;
                }
              });
              markdownContent += '\n';
            }
            
            markdownContent += '---\n\n';
          });
        }
      }
      
      // Add code examples if available
      if (paper.codeExamples && paper.codeExamples.examples && paper.codeExamples.examples.length > 0) {
        markdownContent += `#### Code Examples\n\n`;
        
        paper.codeExamples.examples.forEach((example: CodeExample, index: number) => {
          markdownContent += `##### ${index + 1}. ${example.title}\n\n`;
          
          if (example.description) {
            markdownContent += `**Description:** ${example.description}\n\n`;
          }
          
          if (example.language) {
            markdownContent += `**Language:** ${example.language}\n\n`;
          }
          
          if (example.code) {
            markdownContent += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
          }
          
          if (example.dependencies && example.dependencies.length > 0) {
            markdownContent += `**Dependencies:**\n`;
            example.dependencies.forEach((dep: string) => {
              markdownContent += `- ${dep}\n`;
            });
            markdownContent += '\n';
          }
          
          if (example.usageNotes) {
            markdownContent += `**Usage Notes:** ${example.usageNotes}\n\n`;
          }
          
          markdownContent += '---\n\n';
        });
      }
      
      markdownContent += '---\n\n';
    }
    
    // Add concepts section
    markdownContent += `## Key Concepts\n\n`;
    
    // Process each concept in the knowledge graph
    const concepts = knowledgeGraph.concepts;
    for (const conceptName in concepts) {
      const concept = concepts[conceptName];
      
      // Skip related paper concepts which are already included in the papers section
      if (conceptName.startsWith('Related Paper:')) {
        continue;
      }
      
      markdownContent += `### ${concept.name}\n\n`;
      
      if (concept.description) {
        markdownContent += `${concept.description}\n\n`;
      }
      
      markdownContent += '---\n\n';
    }
    
    // Write the markdown content to the output file
    fs.writeFileSync(outputPath, markdownContent);
    console.log(`Markdown report generated at: ${outputPath}`);
    
  } catch (error) {
    console.error('Error generating markdown report:', error);
  }
}

// Command-line execution
if (require.main === module) {
  const knowledgeGraphPath = path.join(__dirname, '../data/knowledge-graph.json');
  const outputPath = path.join(__dirname, '../data/research-report.md');
  
  generateMarkdownReport(knowledgeGraphPath, outputPath);
}
