export const config = {
  type: 'event',
  name: 'AnalyzeMethodology',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-methodology-analyzed'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`AnalyzeMethodology: Analyzing methodology for paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let methodologyAnalysis;
    
    if (apiKey) {
      // Use Gemini for advanced analysis
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Analyze the methodology of the following research paper in detail.
        Extract information about the research approach, experimental design, data collection methods,
        algorithms, system architecture, and any novel methodological contributions.
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "researchApproach": "Description of the overall approach",
          "experimentalDesign": "Description of experimental setup",
          "algorithmDetails": [
            {"name": "Algorithm name 1", "description": "Algorithm description 1", "steps": ["step1", "step2"]},
            {"name": "Algorithm name 2", "description": "Algorithm description 2", "steps": ["step1", "step2"]}
          ],
          "systemArchitecture": {
            "components": ["component1", "component2"],
            "dataFlow": "Description of data flow between components",
            "implementations": ["implementation detail 1", "implementation detail 2"]
          },
          "dataCollectionMethods": ["method1", "method2"],
          "evaluationMetrics": ["metric1", "metric2"],
          "novelMethodologicalContributions": ["contribution1", "contribution2"]
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
          methodologyAnalysis = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        methodologyAnalysis = extractMethodologyBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      methodologyAnalysis = extractMethodologyBasic(text);
    }
    
    // Emit the analyzed methodology
    await emit({
      topic: 'paper-methodology-analyzed',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        methodologyAnalysis
      }
    });
    
    console.log(`AnalyzeMethodology: Methodology analyzed for paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`AnalyzeMethodology: Error analyzing methodology:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractMethodologyBasic(text: string) {
  // Identify methodology section using common headings
  const methodologySectionRegex = /(?:methodology|methods|approach|experimental setup|research design|system design|procedure|implementation)(?:\s*\n)+(?:[\s\S]*?)(?:\n\s*(?:[0-9]+\.|[A-Z][\w\s]+:|conclusion|results|discussion|references))/i;
  const methodologyMatch = text.match(methodologySectionRegex);
  
  let methodologyText = '';
  if (methodologyMatch && methodologyMatch[0]) {
    methodologyText = methodologyMatch[0];
  } else {
    // If no methodology section found, use a portion of the paper that might contain methodology
    const paperSections = text.split(/\n\s*(?:[0-9]+\.|[A-Z][\w\s]+:)/);
    if (paperSections.length > 2) {
      // Use the second section as it often contains methodology after introduction
      methodologyText = paperSections[1];
    } else {
      methodologyText = text.substring(text.length / 4, text.length / 2); // Use the second quarter of the paper
    }
  }
  
  // Extract algorithm names (often in bold, italics, or capital letters)
  const algorithmRegex = /(?:\*\*|\*|__)([\w\s\-]+(?:algorithm|method|approach|framework|architecture))(?:\*\*|\*|__)/gi;
  const algorithmMatches = methodologyText.matchAll(algorithmRegex);
  const algorithms = Array.from(algorithmMatches, match => match[1].trim()).filter(Boolean);
  
  // Look for evaluation metrics
  const metricsRegex = /(?:evaluated|measured|assessed|using metrics?|performance metrics?|evaluation metrics?)(?:[\s\W]+)([\w\s,\-\/\%]+)(?:\.)/i;
  const metricsMatch = methodologyText.match(metricsRegex);
  const metrics = metricsMatch ? 
    metricsMatch[1].split(/,|\sand\s/) : 
    ["accuracy", "precision", "recall", "F1 score"]; // Default metrics
  
  return {
    researchApproach: "Extracted from paper",
    experimentalDesign: "",
    algorithmDetails: algorithms.map(algo => ({
      name: algo,
      description: "Algorithm identified in paper",
      steps: []
    })),
    systemArchitecture: {
      components: [],
      dataFlow: "",
      implementations: []
    },
    dataCollectionMethods: [],
    evaluationMetrics: metrics.map(m => m.trim()).filter(Boolean),
    novelMethodologicalContributions: []
  };
}
