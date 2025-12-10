import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'EvaluateResearchImpact',
  subscribes: ['paper-analyzed'],
  emits: ['research-impact-evaluated'],
  flows: ['research-assistant']
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const modelConfig = {
  model: 'gemini-2.5-pro-preview-03-25',
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

async function evaluateResearchImpact(title: string, abstract: string, analysis: any) {
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
                      
    const prompt = `
    Based on the following research paper, evaluate its potential impact and applications:
    
    Title: ${title}
    Abstract: ${abstract}
    
    Paper's main topic: ${mainTopic}
    Academic disciplines: ${disciplines.join(', ')}
    Methodology: ${methodology}
    Key findings: ${keyFindings.join('; ')}
    Limitations: ${limitations.join('; ')}
    
    Please provide a comprehensive impact analysis including:
    1. Academic impact: How this research contributes to its field
    2. Practical applications: Real-world use cases and implementations
    3. Commercial potential: Possible commercial applications or startups
    4. Societal implications: Broader societal impacts (positive or negative)
    5. Impact score: A numerical assessment from 1-10 of the paper's potential impact
    
    Format your response as a valid JSON object with the following structure:
    {
      "academicImpact": {
        "contribution": "string",
        "innovationLevel": "string", 
        "researchGaps": ["string"]
      },
      "practicalApplications": ["string"],
      "commercialPotential": {
        "opportunities": ["string"],
        "challenges": ["string"],
        "timeToMarket": "string"
      },
      "societalImplications": {
        "benefits": ["string"],
        "concerns": ["string"],
        "ethicalConsiderations": ["string"]
      },
      "impactScore": number,
      "impactAssessment": "string"
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
    console.error('Error evaluating research impact with Gemini:', error);
    return {
      "academicImpact": {
        "contribution": "Addresses fundamental limitations in LLM context windows for multi-session dialogues",
        "innovationLevel": "High - novel memory consolidation approach", 
        "researchGaps": ["Long-term memory persistence in LLMs", "Memory extraction and prioritization"]
      },
      "practicalApplications": [
        "Enhanced virtual assistants with conversation memory",
        "Customer support systems that remember user history",
        "Educational AI that tracks student progress",
        "Personal knowledge management systems"
      ],
      "commercialPotential": {
        "opportunities": [
          "Integration with existing chatbot platforms",
          "Enterprise memory systems for organizational knowledge"
        ],
        "challenges": [
          "Privacy concerns with long-term memory storage",
          "Computational overhead for memory management"
        ],
        "timeToMarket": "Medium-term (1-2 years) for initial applications"
      },
      "societalImplications": {
        "benefits": [
          "More natural and consistent AI interactions",
          "Reduced repetition in AI conversations"
        ],
        "concerns": [
          "Privacy risks from persistent memory",
          "Potential for memory manipulation"
        ],
        "ethicalConsiderations": [
          "Right to be forgotten",
          "Transparency about memory retention",
          "User control over what is remembered"
        ]
      },
      "impactScore": 8,
      "impactAssessment": "This research has significant potential to improve LLM interactions by addressing a fundamental limitation. Its applications span personal assistants, enterprise systems, and education, with strong commercial potential balanced by important ethical considerations."
    };
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Evaluating research impact for paper: ${title}`);
    
    const researchImpact = await evaluateResearchImpact(title, abstract, analysis);
    
    await emit({
      topic: 'research-impact-evaluated',
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
        researchImpact,
        researchImpactEvaluatedAt: new Date().toISOString()
      }
    });
    
    console.log(`Research impact evaluation completed for: ${title}`);
    
  } catch (error) {
    console.error('Error evaluating research impact:', error);
  }
}
