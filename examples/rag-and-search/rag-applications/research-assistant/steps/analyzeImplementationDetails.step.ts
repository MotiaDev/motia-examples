// No external dependencies needed

export const config = {
  type: 'event',
  name: 'AnalyzeImplementationDetails',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-implementation-analyzed'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`AnalyzeImplementationDetails: Analyzing implementation details for paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let implementationAnalysis;
    
    if (apiKey) {
      // Use Gemini for advanced analysis
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Extract detailed implementation information from the following research paper.
        Focus on technical architecture, system components, algorithms, data structures, optimization techniques,
        deployment considerations, and any implementation variants mentioned.
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "systemArchitecture": {
            "overallArchitecture": "Description of the architecture",
            "components": [
              {"name": "component name", "purpose": "purpose of component", "details": "technical details"}
            ],
            "dataFlow": "Description of data flow between components",
            "variants": [
              {"name": "variant name", "differences": "how this variant differs from main approach"}
            ]
          },
          "algorithms": [
            {
              "name": "algorithm name",
              "purpose": "purpose of algorithm",
              "pseudocode": ["step 1", "step 2", ...],
              "complexity": "time/space complexity if mentioned",
              "optimizations": ["optimization 1", "optimization 2"]
            }
          ],
          "dataStructures": [
            {"name": "data structure name", "purpose": "purpose", "details": "implementation details"}
          ],
          "deploymentConsiderations": ["consideration 1", "consideration 2"],
          "implementationChallenges": ["challenge 1", "challenge 2"],
          "technicalRequirements": {
            "hardware": ["requirement 1", "requirement 2"],
            "software": ["requirement 1", "requirement 2"],
            "dependencies": ["dependency 1", "dependency 2"]
          }
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
          implementationAnalysis = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        implementationAnalysis = extractImplementationDetailsBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      implementationAnalysis = extractImplementationDetailsBasic(text);
    }
    
    // Emit the analyzed implementation details
    await emit({
      topic: 'paper-implementation-analyzed',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        implementationAnalysis
      }
    });
    
    console.log(`AnalyzeImplementationDetails: Implementation details analyzed for paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`AnalyzeImplementationDetails: Error analyzing implementation details:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractImplementationDetailsBasic(text: string) {
  // Look for implementation or system sections
  const implementationSectionRegex = /(?:implementation|system|architecture|design|framework)(?:\s*\n)+(?:[\s\S]*?)(?:\n\s*(?:evaluation|results|experiments|conclusion|discussion|references))/i;
  const implementationMatch = text.match(implementationSectionRegex);
  
  let implementationText = '';
  if (implementationMatch && implementationMatch[0]) {
    implementationText = implementationMatch[0];
  } else {
    // If no implementation section found, use a portion of the paper that might contain implementation details
    const paperSections = text.split(/\n\s*(?:[0-9]+\.|[A-Z][\w\s]+:)/);
    if (paperSections.length > 2) {
      // Use the second section as it often contains implementation after introduction
      implementationText = paperSections[1];
    } else {
      implementationText = text.substring(text.length / 4, text.length / 2); // Use the second quarter of the paper
    }
  }
  
  // Extract system components (often in lists or bullet points)
  const componentRegex = /(?:•|\*|-|[0-9]+\.)\s+([\w\s\-\_]+)(?::|\s+-\s+|\s+is|\s+are|\s+consists)/gi;
  const componentMatches = implementationText.matchAll(componentRegex);
  const components = Array.from(componentMatches, match => ({
    name: match[1].trim(),
    purpose: "Component of the system",
    details: ""
  }));
  
  // Extract algorithm names
  const algorithmRegex = /(?:algorithm|procedure|function|method)\s+(?:\d+|:)?\s*([\w\s\-\_]+)/gi;
  const algorithmMatches = implementationText.matchAll(algorithmRegex);
  const algorithms = Array.from(algorithmMatches, match => ({
    name: match[1].trim(),
    purpose: "Algorithm mentioned in paper",
    pseudocode: [],
    complexity: "",
    optimizations: []
  }));
  
  // Look for variants of the system
  const variantRegex = /([\w\s\-\_]+)\s+(?:variant|version|extension|enhanced version)/gi;
  const variantMatches = implementationText.matchAll(variantRegex);
  const variants = Array.from(variantMatches, match => ({
    name: match[1].trim(),
    differences: "Variant mentioned in paper"
  }));
  
  // Extract data structures
  const dataStructureRegex = /(hash\s+table|tree|graph|array|vector|matrix|queue|stack|heap|database|index|cache)/gi;
  const dataStructureMatches = implementationText.matchAll(dataStructureRegex);
  const dataStructures = Array.from(dataStructureMatches, match => ({
    name: match[1].trim(),
    purpose: "Data structure used in implementation",
    details: ""
  }));
  
  // Look for deployment considerations
  const deploymentRegex = /(?:deployment|production|scaling|performance consideration|resource requirement|latency|throughput)(?:[^.!?]*[.!?])/gi;
  const deploymentMatches = implementationText.matchAll(deploymentRegex);
  const deploymentConsiderations = Array.from(deploymentMatches, match => match[0].trim());
  
  // Extract technical requirements
  const hardwareRegex = /(?:hardware|GPU|CPU|memory|RAM|storage|server|cluster)(?:[^.!?]*[.!?])/gi;
  const hardwareMatches = implementationText.matchAll(hardwareRegex);
  const hardwareRequirements = Array.from(hardwareMatches, match => match[0].trim());
  
  const softwareRegex = /(?:software|framework|library|platform|environment|runtime|dependency)(?:[^.!?]*[.!?])/gi;
  const softwareMatches = implementationText.matchAll(softwareRegex);
  const softwareRequirements = Array.from(softwareMatches, match => match[0].trim());
  
  return {
    systemArchitecture: {
      overallArchitecture: "Extracted from paper",
      components: components.filter((c, i, arr) => 
        arr.findIndex(item => item.name === c.name) === i
      ).slice(0, 10), // Remove duplicates and limit to 10
      dataFlow: "",
      variants: variants.filter((v, i, arr) => 
        arr.findIndex(item => item.name === v.name) === i
      ).slice(0, 5) // Remove duplicates and limit to 5
    },
    algorithms: algorithms.filter((a, i, arr) => 
      arr.findIndex(item => item.name === a.name) === i
    ).slice(0, 5), // Remove duplicates and limit to 5
    dataStructures: dataStructures.filter((d, i, arr) => 
      arr.findIndex(item => item.name === d.name) === i
    ).slice(0, 5), // Remove duplicates and limit to 5
    deploymentConsiderations: deploymentConsiderations.slice(0, 5), // Limit to 5
    implementationChallenges: [],
    technicalRequirements: {
      hardware: hardwareRequirements.slice(0, 3), // Limit to 3
      software: softwareRequirements.slice(0, 3), // Limit to 3
      dependencies: []
    }
  };
}
