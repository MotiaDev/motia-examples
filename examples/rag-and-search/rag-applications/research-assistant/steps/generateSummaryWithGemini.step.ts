export const config = {
  type: 'event',
  name: 'GenerateSummaryWithGemini',
  subscribes: ['paper-analyzed'],
  emits: ['summary-generated'],
  flows: ['research-assistant']
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Generating summary with Gemini for paper: ${title}`);
    
    const apiKey = (process as any).env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables');
      throw new Error('Gemini API key not found');
    }
    
    const prompt = `
    You are a research paper summarization assistant. Generate a concise summary of the following research paper:
    
    Title: ${title}
    Authors: ${Array.isArray(authors) ? authors.join(', ') : authors}
    Abstract: ${abstract}
    Full Text: ${fullText}
    Analysis: ${JSON.stringify(analysis)}
    
    Please provide the following:
    
    ## Short Summary
    A one-sentence summary of the paper (max 30 words)
    
    ## Detailed Summary
    A paragraph summarizing the key points (max 150 words)
    
    ## Key Points
    - Bullet point 1
    - Bullet point 2
    - Bullet point 3
    - Bullet point 4 (optional)
    - Bullet point 5 (optional)
    
    Use markdown formatting with headers as shown above.
    `;
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Gemini API response:', JSON.stringify(responseData, null, 2));
    
    let summary;
    try {
      if (!responseData.candidates || 
          responseData.candidates.length === 0 || 
          !responseData.candidates[0].content || 
          !responseData.candidates[0].content.parts || 
          responseData.candidates[0].content.parts.length === 0 || 
          !responseData.candidates[0].content.parts[0].text ||
          responseData.candidates[0].content.parts[0].text.trim() === '') {
        
        console.error('GenerateSummaryWithGemini: Invalid or empty response structure received from Gemini API.', responseData);
        
        if (responseData.candidates && 
            responseData.candidates.length > 0 && 
            responseData.candidates[0].finishReason === 'MAX_TOKENS' &&
            responseData.candidates[0].content?.parts?.[0]?.text) {
            
          console.log('GenerateSummaryWithGemini: MAX_TOKENS reached, attempting to use partial response');
        } else {
          throw new Error('Invalid or empty response structure from Gemini API');
        }
      }
      
      const responseText = responseData.candidates[0].content.parts[0].text;
      console.log('GenerateSummaryWithGemini raw response:', responseText.substring(0, 200) + '...');
      
      if (!responseText || responseText.length < 10) {
        console.error('GenerateSummaryWithGemini: Empty or too short response received');
        throw new Error('Empty or too short response from Gemini API');
      }

      const shortSummary = extractSection(responseText, 
        /(?:^|\n)## Short Summary\s*\n/i, 
        /(?:^|\n)##/i
      ) || `Summary of ${title}`;
      
      const detailedSummary = extractSection(responseText, 
        /(?:^|\n)## Detailed Summary\s*\n/i, 
        /(?:^|\n)##/i
      ) || `Analysis of ${title}`;
      
      const keyPointsSection = extractSection(responseText, 
        /(?:^|\n)## Key Points\s*\n/i, 
        /(?:^|\n)##|$/i
      );
      
      const keyPoints = extractBulletPoints(keyPointsSection);
      
      summary = {
        shortSummary: shortSummary.trim(),
        detailedSummary: detailedSummary.trim(),
        keyPoints: keyPoints.length > 0 ? keyPoints : ["No key points identified"]
      };
      
      if (!summary.shortSummary || summary.shortSummary.trim() === '') {
        summary.shortSummary = `Summary of ${title}`;
      }
      
      if (!summary.detailedSummary || summary.detailedSummary.trim() === '') {
        summary.detailedSummary = `Analysis of ${title}`;
      }
      
      if (!summary.keyPoints || !Array.isArray(summary.keyPoints) || summary.keyPoints.length === 0) {
        summary.keyPoints = [
          "Key point 1",
          "Key point 2",
          "Key point 3"
        ];
      }
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      
      summary = {
        shortSummary: `Analysis of ${title || 'research paper'}`,
        detailedSummary: "This research paper explores important concepts and methodologies in its field. Due to processing limitations, a detailed summary could not be generated at this time.",
        keyPoints: [
          "The paper presents novel research findings",
          "It builds upon existing work in the field",
          "It suggests directions for future research"
        ]
      };
    }
    
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
    
    console.log(`Summary generated with Gemini for paper: ${title}`);
    
  } catch (error) {
    console.error('Error generating summary with Gemini:', error);
  }
}

function extractSection(text: string, startPattern: RegExp, endPattern: RegExp): string {
  const startMatch = text.match(startPattern);
  if (!startMatch) return "";
  
  const startIndex = startMatch.index! + startMatch[0].length;
  const endMatch = text.slice(startIndex).match(endPattern);
  
  if (endMatch && endMatch.index !== undefined) {
    return text.slice(startIndex, startIndex + endMatch.index).trim();
  } else {
    return text.slice(startIndex).trim();
  }
}

function extractBulletPoints(sectionText: string): string[] {
  if (!sectionText) return [];
  
  const bulletMatches = sectionText.match(/(?:^|\n)(?:[-•*]|\d+\.)\s+([^\n]+)/g);
  
  if (bulletMatches && bulletMatches.length > 0) {
    return bulletMatches.map(line => {
      return line.replace(/(?:^|\n)(?:[-•*]|\d+\.)\s+/, '').trim();
    }).filter(line => line.length > 0);
  } else {
    const lines = sectionText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length > 0) {
      return lines;
    } else {
      return [sectionText.trim()];
    }
  }
}
