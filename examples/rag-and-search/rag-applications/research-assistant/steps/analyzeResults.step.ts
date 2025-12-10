// No external dependencies needed

export const config = {
  type: 'event',
  name: 'AnalyzeResults',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-results-analyzed'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`AnalyzeResults: Analyzing results for paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let resultsAnalysis;
    
    if (apiKey) {
      // Use Gemini for advanced analysis
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Perform a detailed analysis of the results section of the following research paper.
        Focus on quantitative performance metrics, benchmark comparisons, and statistical significance.
        Extract specific numbers, percentages, and comparative results.
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "performanceMetrics": [
            {"name": "metric name", "value": "numeric value", "unit": "unit type", "context": "what this metric represents"},
            ...
          ],
          "benchmarkResults": [
            {"benchmark": "benchmark name", "score": "score value", "comparisonToBaseline": "comparison details"},
            ...
          ],
          "improvementPercentages": [
            {"metric": "metric name", "improvement": "percentage", "baseline": "compared to what"},
            ...
          ],
          "ablationStudies": [
            {"component": "component name", "impact": "impact on performance"},
            ...
          ],
          "statisticalSignificance": [
            {"test": "test name", "pValue": "p-value", "significanceLevel": "significance threshold"},
            ...
          ],
          "efficiencyMetrics": [
            {"name": "metric name", "value": "value", "unit": "unit", "context": "what this represents"},
            ...
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
          resultsAnalysis = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        resultsAnalysis = extractResultsBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      resultsAnalysis = extractResultsBasic(text);
    }
    
    // Emit the analyzed results
    await emit({
      topic: 'paper-results-analyzed',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        resultsAnalysis
      }
    });
    
    console.log(`AnalyzeResults: Results analyzed for paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`AnalyzeResults: Error analyzing results:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractResultsBasic(text: string) {
  // Identify results section
  const resultsSectionRegex = /(?:results|evaluation|performance|experiments|findings)(?:\s*\n)+(?:[\s\S]*?)(?:\n\s*(?:conclusion|discussion|future|limitations|references))/i;
  const resultsMatch = text.match(resultsSectionRegex);
  
  let resultsText = '';
  if (resultsMatch && resultsMatch[0]) {
    resultsText = resultsMatch[0];
  } else {
    // If no results section found, use a portion of the paper that might contain results
    const paperSections = text.split(/\n\s*(?:[0-9]+\.|[A-Z][\w\s]+:)/);
    if (paperSections.length > 3) {
      // Use the third section as it often contains results after methodology
      resultsText = paperSections[2];
    } else {
      resultsText = text.substring(text.length / 2, text.length * 3 / 4); // Use the third quarter of the paper
    }
  }
  
  // Extract performance metrics (numbers followed by % or common metric names)
  const performanceRegex = /(\d+(?:\.\d+)?)(?:\s*%|\s*percent|\s+accuracy|\s+precision|\s+recall|\s+F1|\s+mAP|\s+BLEU|\s+ROUGE)/gi;
  const performanceMatches = resultsText.matchAll(performanceRegex);
  const performanceMetrics = [];
  
  for (const match of performanceMatches) {
    const fullMatch = match[0];
    const value = match[1];
    let unit = '%';
    let name = 'Metric';
    
    if (fullMatch.includes('accuracy')) {
      unit = '';
      name = 'Accuracy';
    } else if (fullMatch.includes('precision')) {
      unit = '';
      name = 'Precision';
    } else if (fullMatch.includes('recall')) {
      unit = '';
      name = 'Recall';
    } else if (fullMatch.includes('F1')) {
      unit = '';
      name = 'F1 Score';
    } else if (fullMatch.includes('mAP')) {
      unit = '';
      name = 'mAP';
    } else if (fullMatch.includes('BLEU')) {
      unit = '';
      name = 'BLEU Score';
    } else if (fullMatch.includes('ROUGE')) {
      unit = '';
      name = 'ROUGE Score';
    }
    
    performanceMetrics.push({
      name,
      value,
      unit,
      context: `Extracted from paper results`
    });
  }
  
  // Extract improvement percentages
  const improvementRegex = /(\d+(?:\.\d+)?)(?:\s*%|\s*percent)(?:\s+(?:improvement|increase|better|higher|decrease|lower|reduction|faster))/gi;
  const improvementMatches = resultsText.matchAll(improvementRegex);
  const improvements = [];
  
  for (const match of improvementMatches) {
    const fullMatch = match[0];
    const value = match[1];
    
    let metric = 'Performance';
    if (fullMatch.includes('faster')) {
      metric = 'Speed';
    } else if (fullMatch.includes('lower') || fullMatch.includes('reduction') || fullMatch.includes('decrease')) {
      metric = 'Reduction';
    }
    
    improvements.push({
      metric,
      improvement: value,
      baseline: "Compared to baseline"
    });
  }
  
  // Find benchmark names (often capitalized)
  const benchmarkRegex = /((?:[A-Z][a-z]*){2,}(?:-?\d*))\s+(?:benchmark|dataset|corpus|evaluation|test)/gi;
  const benchmarkMatches = resultsText.matchAll(benchmarkRegex);
  const benchmarks = Array.from(benchmarkMatches, match => ({
    benchmark: match[1],
    score: "N/A",
    comparisonToBaseline: "N/A"
  }));
  
  return {
    performanceMetrics,
    benchmarkResults: benchmarks,
    improvementPercentages: improvements,
    ablationStudies: [],
    statisticalSignificance: [],
    efficiencyMetrics: []
  };
}
