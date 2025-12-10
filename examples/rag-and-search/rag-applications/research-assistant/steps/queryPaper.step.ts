import * as fs from 'fs';
import * as path from 'path';

export const config = {
  type: 'api',
  name: 'QueryPaper',
  path: '/api/paper',
  method: 'GET',
  emits: ['paper-queried', 'paper-request-received'],
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

export const handler = async (request: any, { emit }: { emit: any }) => {
  try {
    console.log('Request structure:', JSON.stringify(request, null, 2));
    
    const paperId = request.queryParams?.paperId;
    
    if (!paperId) {
      console.error('No paperId found in request queryParams');
      return {
        status: 400,
        body: { error: 'Missing paperId parameter' }
      };
    }
    
    console.log(`Querying for paper ID: ${paperId}`);
    
    loadKnowledgeGraph();
    
    if (!localGraph || Object.keys(localGraph.papers).length === 0) {
      return {
        status: 200,
        body: { 
          message: 'Knowledge graph is empty',
          graphExists: !!localGraph
        }
      };
    }
    
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
    
    try {
      await emit({
        topic: 'paper-queried',
        data: {
          paperId,
          queriedAt: new Date().toISOString()
        }
      });
      
      return {
        status: 200,
        body: {
          paper
        }
      };
    } catch (emitError) {
      console.error('Error emitting paper-queried event:', emitError);
      return {
        status: 200,
        body: {
          paper
        }
      };
    }
  } catch (error) {
    console.error('Error querying paper:', error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
}
