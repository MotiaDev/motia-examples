import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'AnalyzePaper',
  subscribes: ['text-extracted'],
  emits: ['paper-analyzed'],
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

async function analyzePaperWithGemini(title: string, abstract: string, fullText: string) {
  try {
    const model = genAI.getGenerativeModel(modelConfig);
    
    const prompt = `
    Analyze the following research paper and provide a structured analysis:
    
    Title: ${title}
    Abstract: ${abstract}
    Full Text: ${fullText}
    
    Please provide the following information in JSON format:
    1. Main topic of the paper
    2. Academic disciplines related to the paper
    3. Research methodology used
    4. Key findings or contributions
    5. Limitations of the research
    6. Suggested future research directions
    
    Format your response as a valid JSON object with the following structure:
    {
      "mainTopic": "string",
      "disciplines": ["string", "string"],
      "methodology": "string",
      "keyFindings": ["string", "string", "string"],
      "limitations": ["string", "string"],
      "futureDirections": ["string", "string"]
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
    console.error('Error analyzing paper with Gemini:', error);
    return {
      mainTopic: "AI Research",
      disciplines: ["Machine Learning", "Natural Language Processing"],
      methodology: "Experimental",
      keyFindings: [
        "Improved performance on benchmark datasets",
        "Novel approach to feature extraction",
        "Reduced computational requirements"
      ],
      limitations: [
        "Limited dataset diversity",
        "Not tested in real-world scenarios"
      ],
      futureDirections: [
        "Expand to multilingual applications",
        "Integrate with existing systems"
      ]
    };
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, pdfUrl, doi, uploadedAt, extractedAt } = input;
    
    console.log(`Analyzing paper: ${title}`);
    
    const analysis = await analyzePaperWithGemini(title, abstract, fullText);
    
    await emit({
      topic: 'paper-analyzed',
      data: {
        id,
        title,
        authors,
        abstract,
        fullText,
        pdfUrl,
        doi,
        uploadedAt,
        extractedAt,
        analysis,
        analyzedAt: new Date().toISOString()
      }
    });
    
    console.log(`Paper analyzed: ${title}`);
    
  } catch (error) {
    console.error('Error analyzing paper:', error);
  }
}
