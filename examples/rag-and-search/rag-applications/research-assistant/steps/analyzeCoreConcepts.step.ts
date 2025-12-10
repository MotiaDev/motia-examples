// No external dependencies needed

export const config = {
  type: 'event',
  name: 'AnalyzeCoreConcepts',
  subscribes: ['paper-text-extracted'],
  emits: ['paper-core-concepts-analyzed'],
  flows: ['research-assistant']
};

export const handler = async (event: any, { emit }: any) => {
  try {
    const { paperId, title, text, authors, pdfUrl, doi, uploadedAt } = event.data;
    console.log(`AnalyzeCoreConcepts: Analyzing core concepts for paper: ${title}`);
    
    // Use Gemini if API key is available, otherwise use simpler extraction
    const apiKey = process.env.GEMINI_API_KEY;
    let coreConcepts;
    
    if (apiKey) {
      // Use Gemini for advanced analysis
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-03-25" });
      
      const prompt = `
        Analyze the following research paper and identify its core concepts, theoretical frameworks, and fundamental innovations.
        Extract the main technical contributions, novel approaches, and key theoretical underpinnings.
        
        Paper Title: ${title}
        Authors: ${authors}
        
        Paper Text:
        ${text.substring(0, 30000)} // Limiting text length to avoid token limits
        
        Format your response as a JSON object with the following structure:
        {
          "mainConcepts": ["concept1", "concept2", ...],
          "theoreticalFrameworks": ["framework1", "framework2", ...],
          "technicalInnovations": ["innovation1", "innovation2", ...],
          "fundamentalPrinciples": ["principle1", "principle2", ...],
          "keyTerminology": [
            {"term": "term1", "definition": "definition1"},
            {"term": "term2", "definition": "definition2"},
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
          coreConcepts = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (jsonError) {
        console.error('Error parsing JSON from Gemini response:', jsonError);
        // Fallback to basic extraction
        coreConcepts = extractCoreConceptsBasic(text);
      }
    } else {
      // Use basic extraction if no API key
      console.log('Gemini API key not found. Using basic extraction instead.');
      coreConcepts = extractCoreConceptsBasic(text);
    }
    
    // Emit the analyzed core concepts
    await emit({
      topic: 'paper-core-concepts-analyzed',
      data: {
        paperId,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        coreConcepts
      }
    });
    
    console.log(`AnalyzeCoreConcepts: Core concepts analyzed for paper: ${title}`);
    return { success: true };
  } catch (error) {
    console.error(`AnalyzeCoreConcepts: Error analyzing core concepts:`, error);
    throw error;
  }
};

// Basic extraction function for when Gemini is not available
function extractCoreConceptsBasic(text: string) {
  // Extract main concepts based on frequency and positioning
  const words = text.toLowerCase().split(/\W+/);
  const wordFrequency: {[key: string]: number} = {};
  
  // Count word frequency, ignoring common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as']);
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  // Get top concepts based on frequency
  const topConcepts = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
  
  // Extract potential technical terms (capitalized multi-word phrases)
  const technicalTerms = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
  const uniqueTerms = Array.from(new Set(technicalTerms)).slice(0, 10);
  
  return {
    mainConcepts: topConcepts,
    theoreticalFrameworks: [],
    technicalInnovations: uniqueTerms,
    fundamentalPrinciples: [],
    keyTerminology: []
  };
}
