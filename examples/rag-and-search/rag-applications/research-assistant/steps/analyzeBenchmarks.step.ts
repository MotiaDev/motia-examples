// No external dependencies needed

export const config = {
  type: 'event',
  name: 'AnalyzeBenchmarks',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-benchmarks-analyzed'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`AnalyzeBenchmarks: Analyzing benchmarks for paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let benchmarksAnalysis;
    
    if (apiKey) {
      // Use Gemini for advanced analysis
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
        Analyze the benchmarking information in the following research paper.
        Focus specifically on benchmark datasets used, baseline comparisons, and detailed performance metrics.
        Extract the names of benchmarks, comparison methods, and specific quantitative results.
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "benchmarkDatasets": [
            {"name": "dataset name", "description": "what this benchmark measures", "datasetSize": "size if mentioned"},
            ...
          ],
          "baselineMethods": [
            {"name": "baseline method", "description": "description of baseline approach"},
            ...
          ],
          "benchmarkResults": [
            {
              "benchmark": "benchmark name",
              "metrics": [
                {"name": "metric name", "value": "proposed method score", "unit": "unit type"},
                ...
              ],
              "comparisonResults": [
                {"baselineMethod": "method name", "score": "baseline score", "difference": "difference from proposed"},
                ...
              ]
            },
            ...
          ],
          "statistically_significant": true/false,
          "benchmarkCode": "URL to code repository if available"
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
          benchmarksAnalysis = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        benchmarksAnalysis = extractBenchmarksBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      benchmarksAnalysis = extractBenchmarksBasic(text);
    }
    
    // Emit the analyzed benchmarks
    await emit({
      topic: 'paper-benchmarks-analyzed',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        benchmarksAnalysis
      }
    });
    
    console.log(`AnalyzeBenchmarks: Benchmarks analyzed for paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`AnalyzeBenchmarks: Error analyzing benchmarks:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractBenchmarksBasic(text: string) {
  // Common benchmark dataset keywords
  const datasetKeywords = [
    'MNIST', 'ImageNet', 'CIFAR', 'COCO', 'Pascal VOC', 'SQuAD', 'GLUE', 
    'WMT', 'PTB', 'WikiText', 'BLEU', 'ROUGE', 'METEOR', 'CoNLL', 'TREC',
    'MS MARCO', 'SemEval', 'LOCOMO'
  ];
  
  // Common baseline method keywords
  const baselineKeywords = [
    'baseline', 'state-of-the-art', 'SOTA', 'previous work', 'existing', 
    'compared to', 'outperforms', 'compared with'
  ];
  
  // Extract benchmark dataset names using common benchmark names and patterns
  const benchmarkDatasets = [];
  const benchmarkResults: Array<{
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
  }> = [];
  
  // Check for common benchmark datasets
  for (const dataset of datasetKeywords) {
    if (text.includes(dataset)) {
      benchmarkDatasets.push({
        name: dataset,
        description: `Standard benchmark in the field`,
        datasetSize: "Not directly extracted"
      });
      
      // Look for results related to this dataset
      const resultsRegex = new RegExp(`${dataset}[\\s\\S]{1,200}?(\\d+(?:\\.\\d+)?\\s*(?:%|percent))`, 'i');
      const resultsMatch = text.match(resultsRegex);
      
      if (resultsMatch) {
        benchmarkResults.push({
          benchmark: dataset,
          metrics: [{
            name: "Performance",
            value: resultsMatch[1].trim(),
            unit: resultsMatch[1].includes('%') ? "%" : ""
          }],
          comparisonResults: []
        });
      }
    }
  }
  
  // Extract baseline methods
  const baselineMethods = [];
  
  for (const keyword of baselineKeywords) {
    const baselineRegex = new RegExp(`(${keyword}[\\s\\S]{1,50}?)(?:\\.|,|\\n)`, 'gi');
    const matches = text.matchAll(baselineRegex);
    
    for (const match of matches) {
      if (match[1] && match[1].length > 10 && match[1].length < 100) {
        baselineMethods.push({
          name: match[1].trim(),
          description: "Baseline method mentioned in paper"
        });
      }
    }
  }
  
  // Extract comparison statements
  for (const result of benchmarkResults) {
    // Look for comparison statements for this benchmark
    const comparisonRegex = new RegExp(`(compared to|versus|vs\\.)[\\s\\S]{1,50}?(\\d+(?:\\.\\d+)?\\s*(?:%|percent))[\\s\\S]{1,50}?${result.benchmark}`, 'gi');
    const comparisonMatches = text.matchAll(comparisonRegex);
    
    for (const match of comparisonMatches) {
      if (match[0]) {
        // Initialize comparisonResults array if it doesn't exist
        if (!result.comparisonResults) {
          result.comparisonResults = [];
        }
        
        // Now push to the array
        result.comparisonResults.push({
          baselineMethod: match[0].substring(0, 50).trim(),
          score: match[2] ? match[2].trim() : "Not extracted",
          difference: "Not directly extracted"
        });
      }
    }
  }
  
  // Look for statistical significance statements
  const significanceRegex = /statistically significant|p\s*<\s*0\.0[0-9]|significance level|significant difference/i;
  const hasStatisticalSignificance = significanceRegex.test(text);
  
  // Look for code repository links
  const codeRegex = /(github\.com|gitlab\.com|bitbucket\.org)[^\s)]+/i;
  const codeMatch = text.match(codeRegex);
  const benchmarkCode = codeMatch ? codeMatch[0] : "Not available";
  
  return {
    benchmarkDatasets,
    baselineMethods: baselineMethods.slice(0, 5), // Limit to top 5 to avoid duplicates
    benchmarkResults,
    statistically_significant: hasStatisticalSignificance,
    benchmarkCode
  };
}
