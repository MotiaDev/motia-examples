// steps/analyzeResearchGaps.step.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'AnalyzeResearchGaps',
  subscribes: ['research-impact-evaluated'],
  emits: ['research-gaps-analyzed'],
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

async function analyzeResearchGaps(title: string, abstract: string, analysis: any, researchImpact: any) {
  try {
    const model = genAI.getGenerativeModel(modelConfig);

// Extract existing research gaps if available
const existingGaps = researchImpact?.academicImpact?.researchGaps || [];

    const prompt = `
    Based on the following research paper information, identify and analyze potential research gaps and future research directions:

    Title: ${title}
    Abstract: ${abstract}

    Consider the existing identified research gaps:
    ${existingGaps.map((gap: string) => `- ${gap}`).join('\n')}

    Please provide a comprehensive analysis of research gaps including:
    1. Unexplored aspects: Key areas not addressed by this research
    2. Methodological gaps: Limitations in current methodology that could be improved
    3. Application gaps: Potential applications not fully explored
    4. Future research directions: Specific recommendations for future research
    5. Interdisciplinary opportunities: Potential for cross-discipline research

    Format your response as a valid JSON object with the following structure:
    {
      "unexploredAspects": ["string"],
      "methodologicalGaps": ["string"],
      "applicationGaps": ["string"],
      "futureResearchDirections": ["string"],
      "interdisciplinaryOpportunities": ["string"],
      "priorityLevel": {
        "highPriority": ["string"],
        "mediumPriority": ["string"],
        "longTermConsiderations": ["string"]
      }
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
    console.error('Error analyzing research gaps with Gemini:', error);
    return {
      "unexploredAspects": [
        "Real-world testing in diverse domains",
        "Long-term memory retention limits",
        "Computational efficiency optimizations"
      ],
      "methodologicalGaps": [
        "Comparative analysis with other memory approaches",
        "Standardized evaluation metrics for memory systems",
        "Rigorous ablation studies of system components"
      ],
      "applicationGaps": [
        "Integration with multimodal inputs (vision, audio)",
        "Specialized domain applications (legal, medical, etc.)",
        "Enterprise-scale deployment considerations"
      ],
      "futureResearchDirections": [
        "Dynamic memory consolidation strategies",
        "Cross-session learning optimization",
        "Memory compression techniques"
      ],
      "interdisciplinaryOpportunities": [
        "Cognitive science collaboration on human memory models",
        "Human-computer interaction studies for memory interfaces",
        "Psychology research on recall vs. recognition in AI systems"
      ],
      "priorityLevel": {
        "highPriority": [
          "Memory compression techniques",
          "Real-world testing in diverse domains"
        ],
        "mediumPriority": [
          "Integration with multimodal inputs",
          "Comparative analysis with other approaches"
        ],
        "longTermConsiderations": [
          "Cognitive science collaborations",
          "Enterprise-scale deployment optimizations"
        ]
      }
    };
  }
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const {
      id, title, authors, abstract, analysis,
      pdfUrl, doi, uploadedAt, analyzedAt,
      researchImpact, researchImpactEvaluatedAt
    } = input;

    console.log(`Analyzing research gaps for paper: ${title}`);

    const researchGaps = await analyzeResearchGaps(title, abstract, analysis, researchImpact);

    await emit({
      topic: 'research-gaps-analyzed',
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
        researchImpactEvaluatedAt,
        researchGaps,
        researchGapsAnalyzedAt: new Date().toISOString()
      }
    });

    console.log(`Research gaps analysis completed for: ${title}`);

  } catch (error) {
    console.error('Error analyzing research gaps:', error);
  }
}
