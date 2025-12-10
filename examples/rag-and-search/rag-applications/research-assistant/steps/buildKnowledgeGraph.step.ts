export const config = {
  type: 'event',
  name: 'BuildKnowledgeGraph',
  subscribes: [
    'concepts-extracted', 
    'summary-generated', 
    'related-literature-analyzed',
    'code-examples-generated',
    'research-impact-evaluated',
    'related-papers-recommended'
  ],
  emits: ['knowledge-graph-updated'],
  flows: ['research-assistant']
}

import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeGraph, cleanPaperData, loadKnowledgeGraph, saveKnowledgeGraph } from '../utils/knowledgeGraphUtils';

const dataDir = path.join(process.cwd(), 'data');
const graphPath = path.join(dataDir, 'knowledge-graph.json');

let knowledgeGraph: KnowledgeGraph;

try {
  // Load the existing knowledge graph or create a new one
  knowledgeGraph = loadKnowledgeGraph(graphPath);
} catch (error) {
  console.error('Error initializing knowledge graph:', error);
  knowledgeGraph = {
    papers: {},
    concepts: {},
    relationships: []
  };
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    // Determine event type
    let eventType = '';
    if (input.concepts) eventType = 'concepts-extracted';
    else if (input.summary) eventType = 'summary-generated';
    else if (input.relatedLiterature) eventType = 'related-literature-analyzed';
    else if (input.codeExamples) eventType = 'code-examples-generated';
    else if (input.researchImpact) eventType = 'research-impact-evaluated';
    else if (input.relatedPapers) eventType = 'related-papers-recommended';
    
    const { id, title, authors, pdfUrl, doi, uploadedAt } = input;
    
    console.log(`Building knowledge graph for paper: ${title} (${eventType})`);
    
    // Clean up existing data for this paper if it exists to prevent duplication
    if (knowledgeGraph.papers[id]) {
      cleanPaperData(knowledgeGraph, id, 'BuildKnowledgeGraph');
    }
    
    // Create or update base paper data
    knowledgeGraph.papers[id] = {
      id,
      title,
      authors,
      pdfUrl,
      doi,
      uploadedAt
    };
    
    if (eventType === 'concepts-extracted') {
      const { concepts, analysis } = input;
      
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        analysis,
        mainTopic: analysis.mainTopic,
        disciplines: analysis.disciplines
      };
      
      concepts.forEach((concept: any) => {
        if (!knowledgeGraph.concepts[concept.name]) {
          knowledgeGraph.concepts[concept.name] = {
            name: concept.name,
            description: concept.description,
            papers: [id]
          };
        } else {
          if (!knowledgeGraph.concepts[concept.name].papers.includes(id)) {
            knowledgeGraph.concepts[concept.name].papers.push(id);
          }
        }
        
        knowledgeGraph.relationships.push({
          source: id,
          target: concept.name,
          type: 'mentions',
          confidence: concept.confidence
        });
      });
    }
    
    if (eventType === 'summary-generated') {
      const { summary } = input;
      
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        summary
      };
    }
    
    if (eventType === 'related-literature-analyzed') {
      const { relatedLiterature } = input;
      
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        relatedLiterature,
        relatedLiteratureAnalyzedAt: input.relatedLiteratureAnalyzedAt
      };
      
      // Add relationships for related papers, if they exist in our graph
      relatedLiterature.forEach((relatedWork: any) => {
        // Create a concept for each related work if it doesn't exist
        const relatedWorkName = `Related: ${relatedWork.title}`;
        
        if (!knowledgeGraph.concepts[relatedWorkName]) {
          knowledgeGraph.concepts[relatedWorkName] = {
            name: relatedWorkName,
            description: relatedWork.relevance,
            papers: [id]
          };
        } else if (!knowledgeGraph.concepts[relatedWorkName].papers.includes(id)) {
          knowledgeGraph.concepts[relatedWorkName].papers.push(id);
        }
        
        // Add relationship to knowledge graph
        knowledgeGraph.relationships.push({
          source: id,
          target: relatedWorkName,
          type: 'related-to',
          relevance: relatedWork.relevance,
          comparison: relatedWork.comparison,
          potentialInsights: relatedWork.potentialInsights
        });
      });
    }
    
    if (eventType === 'code-examples-generated') {
      const { codeExamples } = input;
      
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        codeExamples,
        codeExamplesGeneratedAt: input.codeExamplesGeneratedAt
      };
    }
    
    if (eventType === 'research-impact-evaluated') {
      const { researchImpact } = input;
      
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        researchImpact,
        researchImpactEvaluatedAt: input.researchImpactEvaluatedAt
      };
      
      // Create concepts for practical applications if they don't exist
      if (researchImpact.practicalApplications) {
        researchImpact.practicalApplications.forEach((application: string) => {
          const applicationName = `Application: ${application.split(' ').slice(0, 3).join(' ')}`;
          
          if (!knowledgeGraph.concepts[applicationName]) {
            knowledgeGraph.concepts[applicationName] = {
              name: applicationName,
              description: application,
              papers: [id]
            };
          } else if (!knowledgeGraph.concepts[applicationName].papers.includes(id)) {
            knowledgeGraph.concepts[applicationName].papers.push(id);
          }
          
          // Add relationship to knowledge graph
          knowledgeGraph.relationships.push({
            source: id,
            target: applicationName,
            type: 'application',
            confidence: researchImpact.impactScore / 10 // Normalize to 0-1 range
          });
        });
      }
    }
    
    if (eventType === 'related-papers-recommended') {
      const { relatedPapers, metadata } = input;
      
      console.log(`Adding ${relatedPapers.length} related papers to knowledge graph for paper: ${title}`);
      
      // Store the related papers in the knowledge graph
      knowledgeGraph.papers[id] = {
        ...knowledgeGraph.papers[id],
        internetRelatedPapers: relatedPapers,
        relatedPapersRecommendedAt: metadata.recommendedAt
      };
      
      // Create a concept for each related paper and connect it to the original paper
      relatedPapers.forEach((paper: any) => {
        const paperName = `Related Paper: ${paper.title.substring(0, 50)}${paper.title.length > 50 ? '...' : ''}`;
        
        // Create concept for this paper if it doesn't exist
        if (!knowledgeGraph.concepts[paperName]) {
          knowledgeGraph.concepts[paperName] = {
            name: paperName,
            description: paper.relevance,
            authors: paper.authors,
            year: paper.year,
            url: paper.url,
            keyInsights: paper.keyInsights,
            papers: [id]
          };
        } else if (!knowledgeGraph.concepts[paperName].papers.includes(id)) {
          knowledgeGraph.concepts[paperName].papers.push(id);
        }
        
        // Add relationship to knowledge graph
        knowledgeGraph.relationships.push({
          source: id,
          target: paperName,
          type: 'related-internet-paper',
          relevance: paper.relevance,
          insights: paper.keyInsights
        });
      });
    }
    
    const papersArray = Object.values(knowledgeGraph.papers);
    for (let i = 0; i < papersArray.length; i++) {
      for (let j = i + 1; j < papersArray.length; j++) {
        const paper1 = papersArray[i];
        const paper2 = papersArray[j];
        
        const relationshipExists = knowledgeGraph.relationships.some(
          r => (r.source === paper1.id && r.target === paper2.id) || 
              (r.source === paper2.id && r.target === paper1.id)
        );
        
        if (!relationshipExists) {
          const paper1Concepts = knowledgeGraph.relationships
            .filter(r => r.source === paper1.id)
            .map(r => r.target);
          
          const paper2Concepts = knowledgeGraph.relationships
            .filter(r => r.source === paper2.id)
            .map(r => r.target);
          
          const sharedConcepts = paper1Concepts.filter(c => paper2Concepts.includes(c));
          
          if (sharedConcepts.length > 0) {
            knowledgeGraph.relationships.push({
              source: paper1.id,
              target: paper2.id,
              type: 'related',
              sharedConcepts,
              strength: sharedConcepts.length
            });
          }
        }
      }
    }
    
    // Save the updated knowledge graph to disk
    saveKnowledgeGraph(knowledgeGraph, graphPath);
    
    await emit({
      topic: 'knowledge-graph-updated',
      data: {
        paperId: id,
        graphSnapshot: knowledgeGraph,
        updatedAt: new Date().toISOString()
      }
    });
    
    console.log(`Knowledge graph updated for paper: ${title}`);
    
  } catch (error) {
    console.error('Error building knowledge graph:', error);
  }
}
