import * as fs from 'fs';
import * as path from 'path';

export const config = {
  type: 'api',
  name: 'QueryConcepts',
  path: '/api/query',
  method: 'GET',
  emits: ['query-result', 'concept-queried'],
  flows: ['research-assistant']
}

const dataDir = path.join(process.cwd(), 'data');
const graphPath = path.join(dataDir, 'knowledge-graph.json');

let localGraph: any = {
  papers: {},
  concepts: {},
  relationships: []
};

function loadKnowledgeGraph() {
  try {
    if (fs.existsSync(graphPath)) {
      const data = fs.readFileSync(graphPath, 'utf8');
      localGraph = JSON.parse(data);
      console.log('Loaded knowledge graph from file:', 
        `Papers: ${Object.keys(localGraph.papers).length}`,
        `Concepts: ${Object.keys(localGraph.concepts).length}`
      );
    } else {
      console.log('Knowledge graph file not found');
    }
  } catch (error) {
    console.error('Error loading knowledge graph:', error);
  }
}

loadKnowledgeGraph();

export const subscribe = {
  'knowledge-graph-updated': (event: any) => {
    console.log('Knowledge graph updated event received:', 
      `Papers: ${Object.keys(event.data.graphSnapshot.papers).length}`,
      `Concepts: ${Object.keys(event.data.graphSnapshot.concepts).length}`
    );
    
    localGraph = event.data.graphSnapshot;
  }
}

export const handler = async (request: any) => {
  try {
    console.log('Query request received:', request.queryParams);
    
    loadKnowledgeGraph();
    
    const query = request.queryParams || {};
    const { concept, paperId } = query;
    
    if (!localGraph || Object.keys(localGraph.papers).length === 0) {
      return {
        status: 200,
        body: { 
          message: 'Knowledge graph is empty',
          query: request.query,
          graphExists: !!localGraph,
          graphData: {
            paperCount: 0,
            conceptCount: 0,
            relationshipCount: 0
          }
        }
      };
    }
    
    if (concept) {
      console.log(`Querying for concept: "${concept}"`);
      console.log(`Available concepts: ${Object.keys(localGraph.concepts).join(', ')}`);
      
      let conceptInfo = localGraph.concepts[concept];
      
      if (!conceptInfo) {
        const conceptKey = Object.keys(localGraph.concepts).find(
          key => key.toLowerCase() === concept.toLowerCase()
        );
        
        if (conceptKey) {
          conceptInfo = localGraph.concepts[conceptKey];
          console.log(`Found concept using case-insensitive match: ${conceptKey}`);
        }
      }
      
      if (!conceptInfo) {
        return {
          status: 404,
          body: { 
            error: 'Concept not found',
            message: `The concept "${concept}" was not found in the knowledge graph`,
            availableConcepts: Object.keys(localGraph.concepts)
          }
        };
      }
      
      const relatedPapers = conceptInfo.papers.map((id: string) => localGraph.papers[id]);
      
      return {
        status: 200,
        body: {
          concept: conceptInfo,
          relatedPapers
        }
      };
    }
    
    if (paperId) {
      console.log(`Querying for paper ID: ${paperId}`);
      console.log(`Available papers: ${Object.keys(localGraph.papers).join(', ')}`);
      
      const paper = localGraph.papers[paperId];
      
      if (!paper) {
        return {
          status: 404,
          body: { 
            error: 'Paper not found',
            message: `The paper with ID "${paperId}" was not found in the knowledge graph`,
            availablePapers: Object.keys(localGraph.papers)
          }
        };
      }
      
      return {
        status: 200,
        body: {
          paper
        }
      };
    }
    
    return {
      status: 200,
      body: {
        paperCount: Object.keys(localGraph.papers).length,
        conceptCount: Object.keys(localGraph.concepts).length,
        relationshipCount: localGraph.relationships.length,
        papers: Object.values(localGraph.papers).map((p: any) => ({ id: p.id, title: p.title })),
        concepts: Object.keys(localGraph.concepts)
      }
    };
  } catch (error) {
    console.error('Error querying knowledge graph:', error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
}
