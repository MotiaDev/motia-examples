import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeGraph, cleanPaperData, loadKnowledgeGraph, saveKnowledgeGraph } from '../utils/knowledgeGraphUtils';

export const config = {
  type: 'event',
  name: 'BuildEnhancedKnowledgeGraph',
  subscribes: [
    'paper-core-concepts-analyzed',
    'paper-methodology-analyzed',
    'paper-results-analyzed',
    'paper-benchmarks-analyzed',
    'paper-implementation-analyzed',
    'paper-enhanced-concepts-extracted',
    'research-gaps-analyzed',
    'code-examples-generated',
    'related-papers-recommended'
  ],
  emits: ['knowledge-graph-updated'],
  flows: ['research-assistant']
};

const dataDir = path.join(process.cwd(), 'data');
const graphPath = path.join(dataDir, 'knowledge-graph.json');

// Define the enhanced knowledge graph structure with relationships and entities
interface EnhancedKnowledgeGraph extends KnowledgeGraph {
  papers: {
    [key: string]: {
      id: string;
      title: string;
      authors: string;
      pdfUrl: string;
      doi: string;
      uploadedAt: string;
      mainTopic?: string;
      disciplines?: string[];
      researchGaps?: any;
      researchGapsAnalyzedAt?: string | null;
      analysis: {
        mainTopic?: string;
        disciplines?: string[];
        methodology?: string;
        keyFindings?: string[];
        limitations?: string[];
        futureDirections?: string[];
        
        // Enhanced sections
        coreConcepts?: {
          mainConcepts?: string[];
          theoreticalFrameworks?: string[];
          technicalInnovations?: string[];
          fundamentalPrinciples?: string[];
          keyTerminology?: Array<{term: string, definition: string}>;
        };
        
        methodologyDetails?: {
          researchApproach?: string;
          experimentalDesign?: string;
          algorithmDetails?: Array<{
            name: string; 
            description: string;
            steps?: string[];
          }>;
          systemArchitecture?: {
            components?: string[];
            dataFlow?: string;
            implementations?: string[];
          };
          dataCollectionMethods?: string[];
          evaluationMetrics?: string[];
          novelMethodologicalContributions?: string[];
        };
        
        results?: {
          performanceMetrics?: Array<{
            name: string;
            value: string;
            unit: string;
            context: string;
          }>;
          benchmarkResults?: Array<{
            benchmark: string;
            score?: string;
            comparisonToBaseline?: string;
          }>;
          improvementPercentages?: Array<{
            metric: string;
            improvement: string;
            baseline: string;
          }>;
          ablationStudies?: Array<{
            component: string;
            impact: string;
          }>;
          statisticalSignificance?: Array<{
            test: string;
            pValue: string;
            significanceLevel: string;
          }>;
          efficiencyMetrics?: Array<{
            name: string;
            value: string;
            unit: string;
            context: string;
          }>;
        };
        
        benchmarks?: {
          benchmarkDatasets?: Array<{
            name: string;
            description: string;
            datasetSize?: string;
          }>;
          baselineMethods?: Array<{
            name: string;
            description: string;
          }>;
          benchmarkResults?: Array<{
            benchmark: string;
            metrics?: Array<{
              name: string;
              value: string;
              unit: string;
            }>;
            comparisonResults?: Array<{
              baselineMethod: string;
              score: string;
              difference: string;
            }>;
          }>;
          statistically_significant?: boolean;
          benchmarkCode?: string;
        };
        
        implementation?: {
          systemArchitecture?: {
            overallArchitecture?: string;
            components?: Array<{
              name: string;
              purpose: string;
              details: string;
            }>;
            dataFlow?: string;
            variants?: Array<{
              name: string;
              differences: string;
            }>;
          };
          algorithms?: Array<{
            name: string;
            purpose: string;
            pseudocode?: string[];
            complexity?: string;
            optimizations?: string[];
          }>;
          dataStructures?: Array<{
            name: string;
            purpose: string;
            details: string;
          }>;
          deploymentConsiderations?: string[];
          implementationChallenges?: string[];
          technicalRequirements?: {
            hardware?: string[];
            software?: string[];
            dependencies?: string[];
          };
        };
      };
    };
  };
  
  concepts: {
    [key: string]: {
      name: string;
      description: string;
      papers: string[];
      type?: string;
      aliases?: string[];
      relatedConcepts?: Array<{
        concept: string;
        relationship: string;
      }>;
      hierarchicalPosition?: {
        isSubconceptOf?: string[];
        hasParts?: string[];
      };
    };
  };
  
  entities?: {
    [key: string]: {
      name: string;
      type: string;
      description: string;
      aliases: string[];
      papers: string[];
      relationships?: Array<{
        target: string;
        type: string;
        description: string;
      }>;
      hierarchicalPosition?: {
        isSubconceptOf?: string[];
        hasParts?: string[];
      };
    };
  };
}

export const handler = async (event: any, { emit }: any) => {
  try {
    console.log('BuildEnhancedKnowledgeGraph: Received event:', JSON.stringify(event, null, 2));
    
    // Check if event exists and has the expected structure
    if (!event) {
      console.error('BuildEnhancedKnowledgeGraph: Event is null or undefined');
      return { success: false, error: 'Event is null or undefined' };
    }

    // Handle both direct data and event.data patterns
    const eventData = event.data || event;
    const topic = event.topic || 'unknown';
    
    if (!eventData || typeof eventData !== 'object') {
      console.error('BuildEnhancedKnowledgeGraph: No valid data in event:', event);
      return { success: false, error: 'No valid data in event' };
    }

    const paperId = eventData.id;
    if (!paperId) {
      console.error('BuildEnhancedKnowledgeGraph: No paper ID in data:', eventData);
      return { success: false, error: 'No paper ID in data' };
    }

    // Extract all possible fields from eventData
    const {
      title,
      authors,
      pdfUrl,
      doi,
      uploadedAt,
      analysis = {},
      researchGaps,
      researchGapsAnalyzedAt
    } = eventData;

    console.log(`BuildEnhancedKnowledgeGraph: Processing paper '${title || paperId}' for event ${topic}`);
    
    // Initialize data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize knowledgeGraph with proper typing
    let knowledgeGraph: EnhancedKnowledgeGraph = { 
      papers: {}, 
      concepts: {},
      entities: {}, 
      relationships: []
    };

    try {
      if (fs.existsSync(graphPath)) {
        const graphContent = fs.readFileSync(graphPath, 'utf-8');
        // Add error handling for JSON parsing
        try {
          knowledgeGraph = JSON.parse(graphContent);
          console.log(`BuildEnhancedKnowledgeGraph: Loaded existing knowledge graph: Papers: ${Object.keys(knowledgeGraph.papers).length} Concepts: ${Object.keys(knowledgeGraph.concepts).length}`);
        } catch (jsonError) {
          console.error('BuildEnhancedKnowledgeGraph: Error parsing knowledge graph JSON:', jsonError);
          // Keep using the initialized empty graph
        }
      }
    } catch (fsError) {
      console.error('BuildEnhancedKnowledgeGraph: Error reading knowledge graph file:', fsError);
      // Keep using the initialized empty graph
    }
    
    // NOW use knowledgeGraph for cleanup
    if (knowledgeGraph.papers[paperId]) {
      console.log(`BuildEnhancedKnowledgeGraph: Cleaning up existing data for paper '${title}'`);
      
      // Remove existing relationships
      knowledgeGraph.relationships = knowledgeGraph.relationships.filter(rel => 
        !(rel.source === paperId || (typeof rel.source === 'object' && rel.source.id === paperId) ||
          rel.target === paperId || (typeof rel.target === 'object' && rel.target.id === paperId))
      );
      
      // Clean up concepts that only referenced this paper
      Object.keys(knowledgeGraph.concepts).forEach(conceptName => {
        const concept = knowledgeGraph.concepts[conceptName];
        if (concept.papers && concept.papers.includes(paperId)) {
          concept.papers = concept.papers.filter((pid: string) => pid !== paperId);
          if (concept.papers.length === 0) {
            delete knowledgeGraph.concepts[conceptName];
          }
        }
      });
      
      // Clean up entities that only referenced this paper
      if (knowledgeGraph.entities) {
        Object.keys(knowledgeGraph.entities).forEach(entityKey => {
          const entity = knowledgeGraph.entities?.[entityKey];
          if (entity?.papers && entity.papers.includes(paperId)) {
            entity.papers = entity.papers.filter((pid: string) => pid !== paperId);
            if (entity.papers.length === 0 && knowledgeGraph.entities) {
              delete knowledgeGraph.entities[entityKey];
            }
          }
        });
      }
    }
    
    // Ensure the paper exists in the knowledge graph
    if (!knowledgeGraph.papers[paperId]) {
      knowledgeGraph.papers[paperId] = {
        id: paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        analysis: {}
      };
    }
    
    // Initialize entities if not present
    if (!knowledgeGraph.entities) {
      knowledgeGraph.entities = {};
    }
    
    // Update the knowledge graph based on the event topic
    switch (topic) {
      case 'paper-core-concepts-analyzed':
        const { coreConcepts } = eventData;
        knowledgeGraph.papers[paperId].analysis.coreConcepts = coreConcepts;
        
        // Add main concepts to the concepts section of the knowledge graph
        if (coreConcepts?.mainConcepts) {
          for (const concept of coreConcepts.mainConcepts) {
            if (!knowledgeGraph.concepts[concept]) {
              knowledgeGraph.concepts[concept] = {
                name: concept,
                description: `Concept identified in paper: ${title}`,
                papers: [paperId]
              };
            } else if (!knowledgeGraph.concepts[concept].papers.includes(paperId)) {
              knowledgeGraph.concepts[concept].papers.push(paperId);
            }
          }
        }
        
        // Add key terminology to the concepts section
        if (coreConcepts?.keyTerminology) {
          for (const { term, definition } of coreConcepts.keyTerminology) {
            if (!knowledgeGraph.concepts[term]) {
              knowledgeGraph.concepts[term] = {
                name: term,
                description: definition,
                papers: [paperId]
              };
            } else {
              if (!knowledgeGraph.concepts[term].papers.includes(paperId)) {
                knowledgeGraph.concepts[term].papers.push(paperId);
              }
              // Update the description if it's more detailed
              if (definition && definition.length > knowledgeGraph.concepts[term].description.length) {
                knowledgeGraph.concepts[term].description = definition;
              }
            }
          }
        }
        break;
        
      case 'paper-methodology-analyzed':
        const { methodologyAnalysis } = eventData;
        knowledgeGraph.papers[paperId].analysis.methodologyDetails = methodologyAnalysis;
        
        // Add algorithm details to the entities section
        if (methodologyAnalysis?.algorithmDetails) {
          for (const algo of methodologyAnalysis.algorithmDetails) {
            const algoKey = `algorithm-${algo.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            if (!knowledgeGraph.entities[algoKey]) {
              knowledgeGraph.entities[algoKey] = {
                name: algo.name,
                type: 'algorithm',
                description: algo.description || `Algorithm described in paper: ${title}`,
                aliases: [],
                papers: [paperId]
              };
            } else if (!knowledgeGraph.entities[algoKey].papers.includes(paperId)) {
              knowledgeGraph.entities[algoKey].papers.push(paperId);
            }
          }
        }
        
        // Add evaluation metrics to concepts
        if (methodologyAnalysis?.evaluationMetrics) {
          for (const metric of methodologyAnalysis.evaluationMetrics) {
            const metricKey = typeof metric === 'string' ? metric : metric.name;
            if (metricKey && !knowledgeGraph.concepts[metricKey]) {
              knowledgeGraph.concepts[metricKey] = {
                name: metricKey,
                description: `Evaluation metric used in paper: ${title}`,
                papers: [paperId],
                type: 'metric'
              };
            } else if (metricKey && !knowledgeGraph.concepts[metricKey].papers.includes(paperId)) {
              knowledgeGraph.concepts[metricKey].papers.push(paperId);
            }
          }
        }
        break;
        
      case 'paper-results-analyzed':
        const { resultsAnalysis } = eventData;
        knowledgeGraph.papers[paperId].analysis.results = resultsAnalysis;
        
        // Add performance metrics to concepts
        if (resultsAnalysis?.performanceMetrics) {
          for (const metric of resultsAnalysis.performanceMetrics) {
            if (!knowledgeGraph.concepts[metric.name]) {
              knowledgeGraph.concepts[metric.name] = {
                name: metric.name,
                description: `Performance metric: ${metric.value}${metric.unit} (${metric.context})`,
                papers: [paperId],
                type: 'metric'
              };
            } else if (!knowledgeGraph.concepts[metric.name].papers.includes(paperId)) {
              knowledgeGraph.concepts[metric.name].papers.push(paperId);
              // Update description with more specific information
              knowledgeGraph.concepts[metric.name].description += `\nIn paper "${title}": ${metric.value}${metric.unit} (${metric.context})`;
            }
          }
        }
        
        // Add benchmark results to concepts
        if (resultsAnalysis?.benchmarkResults) {
          for (const benchmark of resultsAnalysis.benchmarkResults) {
            if (!knowledgeGraph.concepts[benchmark.benchmark]) {
              knowledgeGraph.concepts[benchmark.benchmark] = {
                name: benchmark.benchmark,
                description: `Benchmark used in paper: ${title}`,
                papers: [paperId],
                type: 'benchmark'
              };
            } else if (!knowledgeGraph.concepts[benchmark.benchmark].papers.includes(paperId)) {
              knowledgeGraph.concepts[benchmark.benchmark].papers.push(paperId);
            }
          }
        }
        break;
        
      case 'paper-benchmarks-analyzed':
        const { benchmarksAnalysis } = eventData;
        knowledgeGraph.papers[paperId].analysis.benchmarks = benchmarksAnalysis;
        
        // Add benchmark datasets to concepts
        if (benchmarksAnalysis?.benchmarkDatasets) {
          for (const dataset of benchmarksAnalysis.benchmarkDatasets) {
            if (!knowledgeGraph.concepts[dataset.name]) {
              knowledgeGraph.concepts[dataset.name] = {
                name: dataset.name,
                description: dataset.description || `Benchmark dataset used in paper: ${title}`,
                papers: [paperId],
                type: 'dataset'
              };
            } else if (!knowledgeGraph.concepts[dataset.name].papers.includes(paperId)) {
              knowledgeGraph.concepts[dataset.name].papers.push(paperId);
            }
          }
        }
        
        // Add baseline methods to entities
        if (benchmarksAnalysis?.baselineMethods) {
          for (const method of benchmarksAnalysis.baselineMethods) {
            const methodKey = `method-${method.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            if (!knowledgeGraph.entities[methodKey]) {
              knowledgeGraph.entities[methodKey] = {
                name: method.name,
                type: 'method',
                description: method.description || `Baseline method mentioned in paper: ${title}`,
                aliases: [],
                papers: [paperId]
              };
            } else if (!knowledgeGraph.entities[methodKey].papers.includes(paperId)) {
              knowledgeGraph.entities[methodKey].papers.push(paperId);
            }
          }
        }
        break;
        
      case 'paper-implementation-analyzed':
        const { implementationAnalysis } = eventData;
        knowledgeGraph.papers[paperId].analysis.implementation = implementationAnalysis;
        
        // Add system architecture components to entities
        if (implementationAnalysis?.systemArchitecture?.components) {
          for (const component of implementationAnalysis.systemArchitecture.components) {
            const componentName = typeof component === 'string' ? component : component.name;
            const componentDesc = typeof component === 'string' ? 
              `Component used in paper: ${title}` : 
              component.details || component.purpose || `Component used in paper: ${title}`;
            
            const componentKey = `component-${componentName.toLowerCase().replace(/\s+/g, '-')}`;
            
            if (!knowledgeGraph.entities[componentKey]) {
              knowledgeGraph.entities[componentKey] = {
                name: componentName,
                type: 'component',
                description: componentDesc,
                aliases: [],
                papers: [paperId]
              };
            } else if (!knowledgeGraph.entities[componentKey].papers.includes(paperId)) {
              knowledgeGraph.entities[componentKey].papers.push(paperId);
            }
          }
        }
        
        // Add variants to entities
        if (implementationAnalysis?.systemArchitecture?.variants) {
          for (const variant of implementationAnalysis.systemArchitecture.variants) {
            const variantKey = `variant-${variant.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            if (!knowledgeGraph.entities[variantKey]) {
              knowledgeGraph.entities[variantKey] = {
                name: variant.name,
                type: 'variant',
                description: variant.differences || `Variant mentioned in paper: ${title}`,
                aliases: [],
                papers: [paperId]
              };
            } else if (!knowledgeGraph.entities[variantKey].papers.includes(paperId)) {
              knowledgeGraph.entities[variantKey].papers.push(paperId);
            }
          }
        }
        break;
        
      case 'paper-enhanced-concepts-extracted':
        const { enhancedConcepts } = eventData;
        
        // Add entities
        if (enhancedConcepts?.entities) {
          for (const entity of enhancedConcepts.entities) {
            const entityKey = `entity-${entity.name.toLowerCase().replace(/\s+/g, '-')}`;
            
            if (!knowledgeGraph.entities[entityKey]) {
              knowledgeGraph.entities[entityKey] = {
                name: entity.name,
                type: entity.type,
                description: entity.description,
                aliases: entity.aliases || [],
                papers: [paperId]
              };
            } else {
              if (!knowledgeGraph.entities[entityKey].papers.includes(paperId)) {
                knowledgeGraph.entities[entityKey].papers.push(paperId);
              }
              
              // Merge aliases if not already present
              for (const alias of (entity.aliases || [])) {
                if (!knowledgeGraph.entities[entityKey].aliases.includes(alias)) {
                  knowledgeGraph.entities[entityKey].aliases.push(alias);
                }
              }
            }
          }
        }
        
        // Add relationships between entities
        if (enhancedConcepts?.relationships) {
          for (const relationship of enhancedConcepts.relationships) {
            const sourceKey = `entity-${relationship.source.toLowerCase().replace(/\s+/g, '-')}`;
            const targetKey = `entity-${relationship.target.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Ensure both entities exist
            if (knowledgeGraph.entities[sourceKey] && knowledgeGraph.entities[targetKey]) {
              if (!knowledgeGraph.entities[sourceKey].relationships) {
                knowledgeGraph.entities[sourceKey].relationships = [];
              }
              
              // Check if relationship already exists
              const existingRelationship = knowledgeGraph.entities[sourceKey].relationships.find(
                r => r.target === relationship.target && r.type === relationship.type
              );
              
              if (!existingRelationship) {
                knowledgeGraph.entities[sourceKey].relationships.push({
                  target: relationship.target,
                  type: relationship.type,
                  description: relationship.description
                });
              }
            }
          }
        }
        
        // Add hierarchies
        if (enhancedConcepts?.hierarchies) {
          for (const hierarchy of enhancedConcepts.hierarchies) {
            const parentKey = `entity-${hierarchy.parent.toLowerCase().replace(/\s+/g, '-')}`;
            
            // Ensure parent entity exists
            if (!knowledgeGraph.entities[parentKey]) {
              knowledgeGraph.entities[parentKey] = {
                name: hierarchy.parent,
                type: 'concept',
                description: `Parent concept identified in paper: ${title}`,
                aliases: [],
                papers: [paperId]
              };
            }
            
            // Add hierarchical relationships
            for (const child of hierarchy.children) {
              const childKey = `entity-${child.toLowerCase().replace(/\s+/g, '-')}`;
              
              // Ensure child entity exists
              if (!knowledgeGraph.entities[childKey]) {
                knowledgeGraph.entities[childKey] = {
                  name: child,
                  type: 'concept',
                  description: `Sub-concept identified in paper: ${title}`,
                  aliases: [],
                  papers: [paperId]
                };
              }
              
              // Add hierarchical position to child
              if (!knowledgeGraph.entities[childKey].hierarchicalPosition) {
                knowledgeGraph.entities[childKey].hierarchicalPosition = {
                  isSubconceptOf: [hierarchy.parent]
                };
              } else if (!knowledgeGraph.entities[childKey].hierarchicalPosition.isSubconceptOf) {
                knowledgeGraph.entities[childKey].hierarchicalPosition.isSubconceptOf = [hierarchy.parent];
              } else if (!knowledgeGraph.entities[childKey].hierarchicalPosition.isSubconceptOf.includes(hierarchy.parent)) {
                knowledgeGraph.entities[childKey].hierarchicalPosition.isSubconceptOf.push(hierarchy.parent);
              }
              
              // Add hierarchical position to parent
              if (!knowledgeGraph.entities[parentKey].hierarchicalPosition) {
                knowledgeGraph.entities[parentKey].hierarchicalPosition = {
                  hasParts: [child]
                };
              } else if (!knowledgeGraph.entities[parentKey].hierarchicalPosition.hasParts) {
                knowledgeGraph.entities[parentKey].hierarchicalPosition.hasParts = [child];
              } else if (!knowledgeGraph.entities[parentKey].hierarchicalPosition.hasParts.includes(child)) {
                knowledgeGraph.entities[parentKey].hierarchicalPosition.hasParts.push(child);
              }
            }
          }
        }
        break;
        
      case 'research-gaps-analyzed':
        const { researchGaps } = eventData;
        
        // Update paper data with research gaps
        knowledgeGraph.papers[paperId].researchGaps = researchGaps || null;
        knowledgeGraph.papers[paperId].researchGapsAnalyzedAt = researchGapsAnalyzedAt || null;

        // Process research gaps if present
        if (researchGaps) {
          // Process unexplored aspects
          researchGaps.unexploredAspects?.forEach((aspect: string) => {
            const conceptId = `gap-${aspect.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            if (!knowledgeGraph.concepts[conceptId]) {
              knowledgeGraph.concepts[conceptId] = {
                name: aspect,
                description: `Unexplored research aspect: ${aspect}`,
                papers: [paperId],
                type: 'research_gap'
              };
            } else if (!knowledgeGraph.concepts[conceptId].papers.includes(paperId)) {
              knowledgeGraph.concepts[conceptId].papers.push(paperId);
            }
          });

          // Process future research directions
          researchGaps.futureResearchDirections?.forEach((direction: string) => {
            const conceptId = `direction-${direction.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
            if (!knowledgeGraph.concepts[conceptId]) {
              knowledgeGraph.concepts[conceptId] = {
                name: direction,
                description: `Future research direction: ${direction}`,
                papers: [paperId],
                type: 'future_direction'
              };
            } else if (!knowledgeGraph.concepts[conceptId].papers.includes(paperId)) {
              knowledgeGraph.concepts[conceptId].papers.push(paperId);
            }
          });
        }
        break;
    }
    
    // Also update the basic fields for compatibility with null checks
    const mainTopic = knowledgeGraph.papers[paperId]?.analysis?.mainTopic || 
                     (knowledgeGraph.papers[paperId]?.analysis?.coreConcepts?.mainConcepts?.[0]);
                     
    if (mainTopic) {
      knowledgeGraph.papers[paperId].mainTopic = mainTopic;
    }
    
    const disciplines = knowledgeGraph.papers[paperId]?.analysis?.disciplines || 
                      (knowledgeGraph.papers[paperId]?.analysis?.coreConcepts?.theoreticalFrameworks);
                      
    if (disciplines) {
      knowledgeGraph.papers[paperId].disciplines = disciplines;
    }
    
    // Save updated knowledge graph
    fs.writeFileSync(graphPath, JSON.stringify(knowledgeGraph, null, 4));
    console.log(`BuildEnhancedKnowledgeGraph: Knowledge graph saved to file with ${Object.keys(knowledgeGraph.papers).length} papers`);
    
    // Emit the updated knowledge graph
    await emit({
      topic: 'knowledge-graph-updated',
      data: {
        id: paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        knowledgeGraph,
        updatedAt: new Date().toISOString()
      }
    });

    console.log(`BuildEnhancedKnowledgeGraph: Successfully processed paper '${title || paperId}'`);
    return { success: true };
  } catch (error) {
    console.error(`BuildEnhancedKnowledgeGraph: Error updating knowledge graph:`, error);
    throw error;
  }
};
