// No external dependencies needed

export const config = {
  type: 'event',
  name: 'ExtractEnhancedConcepts',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-enhanced-concepts-extracted'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`ExtractEnhancedConcepts: Extracting enhanced concepts from paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let enhancedConcepts;
    
    if (apiKey) {
      // Use Gemini for advanced extraction
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Extract a comprehensive set of concepts, entities, and their relationships from the following research paper.
        Identify key technical terms, methodologies, algorithms, datasets, metrics, and their definitions.
        Also extract relationships between these concepts (e.g., "Algorithm X uses Dataset Y").
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "entities": [
            {
              "name": "entity name",
              "type": "algorithm/dataset/metric/methodology/framework/component/technique/tool",
              "description": "brief definition or explanation",
              "aliases": ["alternative name 1", "alternative name 2"]
            }
          ],
          "relationships": [
            {
              "source": "source entity name",
              "target": "target entity name",
              "type": "uses/implements/extends/evaluates/compares/outperforms/contains/applies",
              "description": "brief description of relationship"
            }
          ],
          "hierarchies": [
            {
              "parent": "parent entity name",
              "children": ["child entity 1", "child entity 2"]
            }
          ]
        }
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      try {
        // Extract JSON from the response
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                         responseText.match(/{[\s\S]*}/);
                         
        if (jsonMatch) {
          enhancedConcepts = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        enhancedConcepts = extractEnhancedConceptsBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      enhancedConcepts = extractEnhancedConceptsBasic(text);
    }
    
    // Emit the extracted enhanced concepts
    await emit({
      topic: 'paper-enhanced-concepts-extracted',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        enhancedConcepts
      }
    });
    
    console.log(`ExtractEnhancedConcepts: Enhanced concepts extracted from paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`ExtractEnhancedConcepts: Error extracting enhanced concepts:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractEnhancedConceptsBasic(text: string) {
  // Extract technical terms (capitalized phrases, often with acronyms)
  const technicalTermRegex = /(?:([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+\(([A-Z0-9]+)\))?)|(?:([A-Z0-9]{2,})(?:\s+\(([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\))?)/g;
  const technicalTermMatches = text.matchAll(technicalTermRegex);
  
  const entities = [];
  const seenEntities = new Set();
  
  // Process technical terms
  for (const match of technicalTermMatches) {
    let name = '';
    let acronym = '';
    
    if (match[1]) { // Full name followed by acronym
      name = match[1].trim();
      acronym = match[2] ? match[2].trim() : '';
    } else if (match[3]) { // Acronym followed by full name
      name = match[4] ? match[4].trim() : match[3].trim();
      acronym = match[3].trim();
    }
    
    if (name && !seenEntities.has(name.toLowerCase())) {
      seenEntities.add(name.toLowerCase());
      
      // Try to determine entity type based on common patterns
      let type = 'concept';
      if (name.includes('Algorithm') || name.includes('Method') || name.includes('Approach')) {
        type = 'algorithm';
      } else if (name.includes('Dataset') || name.includes('Corpus') || name.includes('Benchmark')) {
        type = 'dataset';
      } else if (name.includes('Framework') || name.includes('System')) {
        type = 'framework';
      } else if (name.includes('Metric') || name.includes('Score') || name.includes('Rate')) {
        type = 'metric';
      }
      
      entities.push({
        name,
        type,
        description: `Extracted from paper: ${name}${acronym ? ` (${acronym})` : ''}`,
        aliases: acronym ? [acronym] : []
      });
    }
  }
  
  // Extract potential relationships between entities
  const relationships = [];
  const entityNames = entities.map(e => e.name);
  
  for (const sourceEntity of entityNames) {
    // Look for sentences containing this entity and another entity
    const pattern = new RegExp(`[^.!?]*\\b${sourceEntity}\\b[^.!?]*\\b(${entityNames.filter(e => e !== sourceEntity).join('|')})\\b[^.!?]*[.!?]`, 'gi');
    const relationMatches = text.matchAll(pattern);
    
    for (const match of relationMatches) {
      if (match[0] && match[1]) {
        const sentence = match[0].trim();
        const targetEntity = match[1].trim();
        
        // Determine relationship type based on verbs in the sentence
        let type = 'relates to';
        if (sentence.match(/\buses\b|\busing\b|\bused\b|\butilizes\b|\butilizing\b|\butilized\b/i)) {
          type = 'uses';
        } else if (sentence.match(/\bimplements\b|\bimplementing\b|\bimplemented\b/i)) {
          type = 'implements';
        } else if (sentence.match(/\bextends\b|\bextending\b|\bextended\b|\bbased on\b/i)) {
          type = 'extends';
        } else if (sentence.match(/\bevaluates\b|\bevaluating\b|\bevaluated\b|\btest(s|ed|ing)?\b/i)) {
          type = 'evaluates';
        } else if (sentence.match(/\bcontains\b|\bcontaining\b|\bcontained\b|\bconsists of\b/i)) {
          type = 'contains';
        } else if (sentence.match(/\boutperforms\b|\bbetter than\b|\bimproves\b|\bimproving\b|\bimproved\b/i)) {
          type = 'outperforms';
        }
        
        relationships.push({
          source: sourceEntity,
          target: targetEntity,
          type,
          description: sentence.substring(0, 100) + (sentence.length > 100 ? '...' : '')
        });
      }
    }
  }
  
  // Try to extract hierarchical relationships
  const hierarchies = [];
  const hierarchyRegex = /\b([\w\s]+)\b(?:\s+consists of|\s+contains|\s+includes|\s+has)(?:\s+(?:the\s+)?(?:following|these))?(?:\s+(?:components|parts|elements|modules|sub-components))?\s*:\s*(?:[^.!?]*?(?:(?:\d+\)|\d+\.|\*|\-)\s*([\w\s]+)[,;]?)+)/gi;
  const hierarchyMatches = text.matchAll(hierarchyRegex);
  
  for (const match of hierarchyMatches) {
    if (match[0] && match[1]) {
      const parent = match[1].trim();
      const childrenText = match[0].substring(match[0].indexOf(':') + 1);
      const childrenMatches = childrenText.match(/(?:\d+\)|\d+\.|\*|\-)\s*([\w\s]+)[,;]?/g);
      
      if (childrenMatches) {
        const children = childrenMatches
          .map(m => m.replace(/(?:\d+\)|\d+\.|\*|\-)\s*/, '').trim())
          .filter(Boolean);
        
        if (children.length > 0) {
          hierarchies.push({
            parent,
            children
          });
        }
      }
    }
  }
  
  return {
    entities,
    relationships,
    hierarchies
  };
}
