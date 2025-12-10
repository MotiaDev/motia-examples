import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeGraph {
  papers: Record<string, any>;
  concepts: Record<string, any>;
  relationships: any[];
  entities?: Record<string, any>;
}

/**
 * Removes all references to a paper from a knowledge graph
 * @param graph The knowledge graph object
 * @param paperId The ID of the paper to clean
 * @param graphName Name of the graph (for logging)
 */
export function cleanPaperData(graph: KnowledgeGraph, paperId: string, graphName: string): void {
  console.log(`${graphName}: Cleaning existing data for paper ID ${paperId}`);

  // Store paper title for logging
  const paperTitle = graph.papers[paperId]?.title || 'Unknown Title';
  
  // 1. Remove existing relationships
  if (graph.relationships && Array.isArray(graph.relationships)) {
    const originalCount = graph.relationships.length;
    graph.relationships = graph.relationships.filter(rel => {
      // Check for relationships where the paper is a source or target
      const isSource = rel.source === paperId || 
                      (typeof rel.source === 'object' && rel.source?.id === paperId);
      const isTarget = rel.target === paperId ||
                      (typeof rel.target === 'object' && rel.target?.id === paperId);
      
      return !(isSource || isTarget);
    });
    
    console.log(`${graphName}: Removed ${originalCount - graph.relationships.length} relationships for paper '${paperTitle}'`);
  }
  
  // 2. Clean up concepts that only referenced this paper
  if (graph.concepts) {
    let conceptsRemoved = 0;
    
    Object.keys(graph.concepts).forEach(conceptName => {
      const concept = graph.concepts[conceptName];
      
      // Remove this paper from the concept's papers array
      if (concept.papers && Array.isArray(concept.papers) && concept.papers.includes(paperId)) {
        concept.papers = concept.papers.filter(pid => pid !== paperId);
        
        // If this concept no longer references any papers, remove it
        if (concept.papers.length === 0) {
          delete graph.concepts[conceptName];
          conceptsRemoved++;
        }
      }
    });
    
    console.log(`${graphName}: Removed ${conceptsRemoved} orphaned concepts for paper '${paperTitle}'`);
  }
  
  // 3. Clean up entities that only referenced this paper (for enhanced graph)
  if (graph.entities) {
    let entitiesRemoved = 0;
    
    Object.keys(graph.entities).forEach(entityKey => {
      const entity = graph.entities![entityKey];
      
      // Remove this paper from the entity's papers array
      if (entity.papers && Array.isArray(entity.papers) && entity.papers.includes(paperId)) {
        entity.papers = entity.papers.filter(pid => pid !== paperId);
        
        // If this entity no longer references any papers, remove it
        if (entity.papers.length === 0) {
          delete graph.entities![entityKey];
          entitiesRemoved++;
        }
      }
    });
    
    console.log(`${graphName}: Removed ${entitiesRemoved} orphaned entities for paper '${paperTitle}'`);
  }
  
  // 4. Finally remove the paper itself
  if (graph.papers[paperId]) {
    delete graph.papers[paperId];
    console.log(`${graphName}: Removed paper '${paperTitle}' from graph`);
  }
}

/**
 * Save a knowledge graph to disk
 * @param graph The knowledge graph to save
 * @param outputPath The path to save the graph to
 */
export function saveKnowledgeGraph(graph: KnowledgeGraph, outputPath: string): void {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2), 'utf8');
    console.log(`Knowledge graph saved to ${outputPath}`);
    console.log(`  - Papers: ${Object.keys(graph.papers).length}`);
    console.log(`  - Concepts: ${Object.keys(graph.concepts).length}`);
    console.log(`  - Relationships: ${graph.relationships.length}`);
    if (graph.entities) {
      console.log(`  - Entities: ${Object.keys(graph.entities).length}`);
    }
  } catch (error) {
    console.error('Error saving knowledge graph:', error);
  }
}

/**
 * Load a knowledge graph from disk
 * @param inputPath The path to load the graph from
 * @returns The loaded knowledge graph or a new empty graph
 */
export function loadKnowledgeGraph(inputPath: string): KnowledgeGraph {
  const defaultGraph: KnowledgeGraph = {
    papers: {},
    concepts: {},
    relationships: [],
    entities: {}
  };
  
  try {
    if (fs.existsSync(inputPath)) {
      const data = fs.readFileSync(inputPath, 'utf8');
      const savedGraph = JSON.parse(data);
      console.log(`Loaded existing knowledge graph from ${inputPath}`);
      return savedGraph;
    }
  } catch (error) {
    console.error('Error loading knowledge graph:', error);
  }
  
  console.log('No existing knowledge graph found, creating new one');
  return defaultGraph;
}
