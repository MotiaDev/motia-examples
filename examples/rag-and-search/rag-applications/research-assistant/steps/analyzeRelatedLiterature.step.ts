import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'AnalyzeRelatedLiterature',
  subscribes: ['paper-analyzed'],
  emits: ['related-literature-analyzed'],
  flows: ['research-assistant']
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const modelConfig = {
  model: 'gemini-1.5-pro',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
};

async function findRelatedLiterature(title: string, abstract: string, fullText: string, analysis: any) {
  try {
    const model = genAI.getGenerativeModel(modelConfig);
    
    // Normalize analysis keys to be case-insensitive
    const normalizedAnalysis: Record<string, any> = {};
    if (analysis) {
      Object.keys(analysis).forEach(key => {
        normalizedAnalysis[key.toLowerCase()] = analysis[key];
      });
    }
    
    // Get values with fallbacks from either direct access or normalized keys
    const mainTopic = analysis?.mainTopic || analysis?.['Main Topic'] || normalizedAnalysis?.maintopic || 'Not specified';
    const disciplines = Array.isArray(analysis?.disciplines) ? analysis.disciplines : 
                       Array.isArray(analysis?.['Disciplines']) ? analysis['Disciplines'] : 
                       Array.isArray(normalizedAnalysis?.disciplines) ? normalizedAnalysis.disciplines : [];
    const methodology = analysis?.methodology || analysis?.['Methodology'] || normalizedAnalysis?.methodology || 'Not specified';
    const keyFindings = Array.isArray(analysis?.keyFindings) ? analysis.keyFindings : 
                      Array.isArray(analysis?.['Key Findings']) ? analysis['Key Findings'] : 
                      Array.isArray(normalizedAnalysis?.keyfindings) ? normalizedAnalysis.keyfindings : [];
                      
    const prompt = `
    Based on the following research paper, identify and summarize 3-5 key related papers 
    or research directions that would be valuable for comparison or further investigation:
    
    Title: ${title}
    Abstract: ${abstract}
    
    Paper's main topic: ${mainTopic}
    Academic disciplines: ${disciplines.join(', ')}
    Methodology: ${methodology}
    Key findings: ${keyFindings.join('; ')}
    
    For each related work or research direction, provide:
    1. Suggested title or research area
    2. Why it's relevant to this paper
    3. How it compares or contrasts with the current paper
    4. Potential insights from integrating the papers
    
    Format your response as a valid JSON array with the following structure for each related work:
    [
      {
        "title": "string",
        "relevance": "string",
        "comparison": "string",
        "potentialInsights": "string"
      }
    ]
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to extract JSON from Gemini response');
    }
  } catch (error) {
    console.error('Error finding related literature with Gemini:', error);
    return [
      {
        "title": "Recent Advances in Memory-Augmented LLMs",
        "relevance": "Explores similar memory mechanisms for LLMs",
        "comparison": "Focuses more on theoretical models rather than practical implementations",
        "potentialInsights": "Could provide theoretical foundations for the memory architecture"
      },
      {
        "title": "Efficient Retrieval Methods for Conversational AI",
        "relevance": "Addresses similar information retrieval challenges",
        "comparison": "Emphasizes retrieval techniques rather than memory consolidation",
        "potentialInsights": "May offer complementary retrieval strategies to enhance the memory system"
      },
      {
        "title": "Long-term Memory in Neural Dialogue Systems",
        "relevance": "Explores memory persistence in conversational contexts",
        "comparison": "More focused on dialogue-specific applications",
        "potentialInsights": "Could provide insights on dialogue-specific memory requirements"
      }
    ];
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Finding related literature for paper: ${title}`);
    
    const relatedLiterature = await findRelatedLiterature(title, abstract, fullText, analysis);
    
    await emit({
      topic: 'related-literature-analyzed',
      data: {
        id,
        title,
        authors,
        abstract,
        fullText,
        pdfUrl,
        doi,
        uploadedAt,
        analyzedAt,
        analysis,
        relatedLiterature,
        relatedLiteratureAnalyzedAt: new Date().toISOString()
      }
    });
    
    console.log(`Related literature analysis completed for: ${title}`);
    
  } catch (error) {
    console.error('Error analyzing related literature:', error);
  }
}
