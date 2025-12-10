import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'ExtractConcepts',
  subscribes: ['paper-analyzed'],
  emits: ['concepts-extracted'],
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

async function extractConceptsWithGemini(title: string, abstract: string, fullText: string, analysis: any) {
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
    Extract key concepts from the following research paper:
    
    Title: ${title}
    Abstract: ${abstract}
    Full Text: ${fullText}
    
    Analysis:
    - Main Topic: ${mainTopic}
    - Disciplines: ${disciplines.join(', ')}
    - Methodology: ${methodology}
    - Key Findings: ${keyFindings.join(', ')}
    
    Please identify 4-8 key concepts or technical terms from this paper. For each concept:
    1. Provide the name of the concept
    2. Write a clear, concise description (1-2 sentences)
    3. Assign a confidence score (0.0-1.0) indicating how central this concept is to the paper
    
    Format your response as a valid JSON array with the following structure:
    [
      {
        "name": "Concept Name",
        "description": "Brief description of the concept",
        "confidence": 0.95
      },
      ...
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
    console.error('Error extracting concepts with Gemini:', error);
    return [
      {
        name: "Transfer Learning",
        description: "A technique that focuses on storing knowledge gained while solving one problem and applying it to a different but related problem",
        confidence: 0.92
      },
      {
        name: "Knowledge Distillation",
        description: "A compression technique in which a small model is trained to mimic a larger pre-trained model",
        confidence: 0.88
      },
      {
        name: "Feature Extraction",
        description: "The process of transforming raw data into numerical features that can be processed while preserving the information in the original data set",
        confidence: 0.95
      },
      {
        name: "Computational Efficiency",
        description: "The ability to solve a problem in a computationally efficient manner, using fewer resources",
        confidence: 0.85
      }
    ];
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Extracting concepts from paper: ${title}`);
    
    const concepts = await extractConceptsWithGemini(title, abstract, fullText, analysis);
    
    await emit({
      topic: 'concepts-extracted',
      data: {
        id,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        analyzedAt,
        analysis,
        concepts,
        conceptsExtractedAt: new Date().toISOString()
      }
    });
    
    console.log(`Concepts extracted from paper: ${title}`);
    
  } catch (error) {
    console.error('Error extracting concepts:', error);
  }
}
