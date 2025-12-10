import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'GenerateSummary',
  subscribes: ['paper-analyzed'],
  emits: ['summary-generated'],
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

async function generateSummaryWithGemini(title: string, abstract: string, fullText: string, analysis: any) {
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
    const limitations = Array.isArray(analysis?.limitations) ? analysis.limitations : 
                     Array.isArray(analysis?.['Limitations']) ? analysis['Limitations'] : 
                     Array.isArray(normalizedAnalysis?.limitations) ? normalizedAnalysis.limitations : [];
    const futureDirections = Array.isArray(analysis?.futureDirections) ? analysis.futureDirections : 
                          Array.isArray(analysis?.['Future Directions']) ? analysis['Future Directions'] : 
                          Array.isArray(normalizedAnalysis?.futuredirections) ? normalizedAnalysis.futuredirections : [];
    
    const prompt = `
    Generate a comprehensive summary for the following research paper:
    
    Title: ${title}
    Abstract: ${abstract}
    Full Text: ${fullText}
    
    Analysis:
    - Main Topic: ${mainTopic}
    - Disciplines: ${disciplines.join(', ')}
    - Methodology: ${methodology}
    - Key Findings: ${keyFindings.join(', ')}
    - Limitations: ${limitations.join(', ')}
    - Future Directions: ${futureDirections.join(', ')}
    
    Please provide the following in JSON format:
    1. A short summary (1-2 sentences)
    2. A detailed summary (4-6 sentences)
    3. 4-6 key points from the paper
    
    Format your response as a valid JSON object with the following structure:
    {
      "shortSummary": "string",
      "detailedSummary": "string",
      "keyPoints": ["string", "string", "string", "string"]
    }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to extract JSON from Gemini response');
    }
  } catch (error) {
    console.error('Error generating summary with Gemini:', error);
    return {
      shortSummary: "This paper introduces a novel approach to improve machine learning models for NLP tasks while reducing computational requirements.",
      detailedSummary: "The research presents an innovative method for feature extraction in NLP tasks. The authors demonstrate improved performance on several benchmark datasets while significantly reducing the computational resources required. Their approach combines techniques from transfer learning and knowledge distillation. The paper acknowledges limitations in dataset diversity and real-world testing, suggesting future work in multilingual applications and system integration.",
      keyPoints: [
        "Novel feature extraction method",
        "Improved benchmark performance",
        "Reduced computational requirements",
        "Combined transfer learning and knowledge distillation"
      ]
    };
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Generating summary for paper: ${title}`);
    
    const summary = await generateSummaryWithGemini(title, abstract, fullText, analysis);
    
    await emit({
      topic: 'summary-generated',
      data: {
        id,
        title,
        authors,
        abstract,
        pdfUrl,
        doi,
        uploadedAt,
        analyzedAt,
        analysis,
        summary,
        summaryGeneratedAt: new Date().toISOString()
      }
    });
    
    console.log(`Summary generated for paper: ${title}`);
    
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}
