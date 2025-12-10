// Simple script to generate markdown report from the knowledge graph
const fs = require('fs');
const path = require('path');

const knowledgeGraphPath = path.join(__dirname, 'data/knowledge-graph.json');
const outputPath = path.join(__dirname, 'data/research-report.md');

/**
 * Check if a related paper entry is valid
 */
function isValidRelatedPaper(paper) {
  return (
    paper && 
    typeof paper === 'object' &&
    paper.title && 
    paper.title !== 'Unknown Title' &&
    paper.authors && 
    paper.authors !== 'Unknown Authors'
  );
}

/**
 * Generate a markdown report from the knowledge graph
 */
function generateMarkdownReport() {
  try {
    // Read the knowledge graph
    const knowledgeGraphData = fs.readFileSync(knowledgeGraphPath, 'utf-8');
    const knowledgeGraph = JSON.parse(knowledgeGraphData);

    // Start building the markdown content
    let markdownContent = `# Research Paper Analysis Report\n\n`;
    
    // Timestamp
    markdownContent += `*Generated on: ${new Date().toLocaleString()}*\n\n`;
    
    // Overview section
    markdownContent += `## Overview\n\n`;
    markdownContent += `This report contains analysis of ${Object.keys(knowledgeGraph.papers).length} research papers, `;
    markdownContent += `with ${Object.keys(knowledgeGraph.concepts).length} identified concepts `;
    markdownContent += `and ${knowledgeGraph.relationships.length} relationships between papers and concepts.\n\n`;
    
    // Papers section
    markdownContent += `## Papers\n\n`;
    
    // Process each paper
    for (const paperId in knowledgeGraph.papers) {
      const paper = knowledgeGraph.papers[paperId];
      
      markdownContent += `### ${paper.title}\n\n`;
      
      if (paper.authors) {
        markdownContent += `**Authors:** ${paper.authors}\n\n`;
      }
      
      if (paper.abstract) {
        markdownContent += `**Abstract:** ${paper.abstract}\n\n`;
      }
      
      // Related papers section if available
      if (paper.internetRelatedPapers && paper.internetRelatedPapers.length > 0) {
        // Filter out invalid related papers
        const validRelatedPapers = paper.internetRelatedPapers.filter(isValidRelatedPaper);
        
        // Only proceed if there are valid related papers
        if (validRelatedPapers.length > 0) {
          markdownContent += `#### Related Papers\n\n`;
          
          validRelatedPapers.forEach((relatedPaper, index) => {
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
              markdownContent += `**Relevance:** ${relatedPaper.relevance}\n\n`;
            }
            
            if (relatedPaper.keyInsights && relatedPaper.keyInsights.length > 0) {
              markdownContent += `**Key Insights:**\n`;
              relatedPaper.keyInsights.forEach(insight => {
                if (insight && insight.trim()) {
                  markdownContent += `- ${insight}\n`;
                }
              });
              markdownContent += '\n';
            }
            
            markdownContent += `---\n\n`;
          });
        }
      }
      
      // Code examples section if available
      if (paper.codeExamples && paper.codeExamples.examples && paper.codeExamples.examples.length > 0) {
        markdownContent += `#### Code Examples\n\n`;
        
        paper.codeExamples.examples.forEach((example, index) => {
          markdownContent += `##### ${index + 1}. ${example.title}\n\n`;
          
          if (example.description) {
            markdownContent += `${example.description}\n\n`;
          }
          
          markdownContent += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
          
          if (example.usageNotes) {
            markdownContent += `**Usage Notes:** ${example.usageNotes}\n\n`;
          }
          
          if (example.dependencies && example.dependencies.length > 0) {
            markdownContent += `**Dependencies:**\n`;
            example.dependencies.forEach(dep => {
              markdownContent += `- ${dep}\n`;
            });
            markdownContent += '\n';
          }
          
          markdownContent += `---\n\n`;
        });
      }
      
      markdownContent += `---\n\n`;
    }
    
    // Write to file
    fs.writeFileSync(outputPath, markdownContent);
    console.log(`Markdown report generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating markdown report:', error);
  }
}

// Run the report generation
generateMarkdownReport();
