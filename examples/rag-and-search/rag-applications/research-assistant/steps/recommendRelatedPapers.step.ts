export const config = {
  type: 'event',
  name: 'RecommendRelatedPapers',
  subscribes: ['paper-analyzed'],
  emits: ['related-papers-recommended'],
  flows: ['research-assistant']
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Finding related papers for: ${title}`);
    
    const apiKey = (process as any).env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables');
      throw new Error('Gemini API key not found');
    }
    
    // Create a targeted prompt to find related papers with internet search capabilities
    const prompt = `
    You are a research paper recommendation assistant. Your task is to find and recommend 5 relevant academic papers related to the following research paper:
    
    Title: ${title}
    Authors: ${Array.isArray(authors) ? authors.join(', ') : authors}
    Abstract: ${abstract}
    
    Analysis:
    ${JSON.stringify(analysis, null, 2)}
    
    INSTRUCTIONS:
    1. Search the internet for 5 highly relevant academic papers that are most related to this paper.
    2. Focus on papers that either:
       - Build upon similar concepts/techniques
       - Provide alternative approaches to the same problem
       - Are foundational works that this paper likely builds upon
       - Represent the most recent advancements in this area
    3. For each paper, provide:
       - Title: The full title of the paper
       - Authors: The list of authors
       - Year: Publication year
       - URL: Link to the paper (preferably a direct PDF link or DOI)
       - Relevance: A brief explanation of how this paper relates to the original paper
       - Key insights: 2-3 key points that would be valuable to someone studying the original paper
    
    Format your response as a JSON array with these fields.
    DO NOT make up papers - only include real papers that exist and can be accessed.
    If possible, include papers published within the last 3 years to ensure recency.
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
          maxOutputTokens: 8192 // Increased token limit for comprehensive search results
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('Gemini API response received for related papers recommendation');
    
    let relatedPapers;
    try {
      const responseText = responseData.candidates[0].content.parts[0].text;
      console.log('Raw Gemini response text for debugging:', responseText.substring(0, 500) + '...');
      
      // Try to extract structured data from the response even if not perfectly formatted JSON
      let structuredPapers = [];
      
      // First attempt: Try parsing as proper JSON using multiple techniques
      const extractJsonApproaches = [
        // Approach 1: Try to extract JSON array using regex with balanced brackets
        () => {
          const jsonArrayRegex = /\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]/g;
          const jsonMatches = responseText.match(jsonArrayRegex);
          if (jsonMatches && jsonMatches.length > 0) {
            // Use the longest match as it's likely the complete JSON
            const longestMatch = jsonMatches.reduce((a: string, b: string) => a.length > b.length ? a : b);
            return JSON.parse(longestMatch);
          }
          throw new Error('No JSON array found');
        },
        
        // Approach 2: Try to extract JSON object and get its array property
        () => {
          const jsonObjectRegex = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g;
          const jsonMatches = responseText.match(jsonObjectRegex);
          if (jsonMatches && jsonMatches.length > 0) {
            const longestMatch = jsonMatches.reduce((a: string, b: string) => a.length > b.length ? a : b);
            const obj = JSON.parse(longestMatch);
            
            // Check if the object contains an array property
            for (const key in obj) {
              if (Array.isArray(obj[key])) {
                return obj[key];
              }
            }
            
            // If no array property, but object has expected paper properties, wrap it in array
            if (obj.title || obj.Title) {
              return [obj];
            }
          }
          throw new Error('No JSON object with array property found');
        },
        
        // Approach 3: Try to extract content between markdown code fences if present
        () => {
          const markdownJsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (markdownJsonMatch && markdownJsonMatch[1]) {
            // Try both - as array or as object with array property
            const content = markdownJsonMatch[1].trim();
            if (content.startsWith('[')) {
              return JSON.parse(content);
            } else if (content.startsWith('{')) {
              const obj = JSON.parse(content);
              for (const key in obj) {
                if (Array.isArray(obj[key])) {
                  return obj[key];
                }
              }
              if (obj.title || obj.Title) return [obj];
            }
          }
          throw new Error('No valid JSON in code blocks');
        },
        
        // Approach 4: As a last resort, try to parse the entire text as JSON
        () => {
          const trimmedText = responseText.trim();
          if (trimmedText.startsWith('[') && trimmedText.endsWith(']')) {
            return JSON.parse(trimmedText);
          }
          throw new Error('Full text is not a JSON array');
        }
      ];
      
      // Try all approaches in sequence
      for (const approach of extractJsonApproaches) {
        try {
          structuredPapers = approach();
          if (structuredPapers && structuredPapers.length > 0) {
            console.log(`Successfully extracted ${structuredPapers.length} papers using JSON parsing`);
            break; // Exit the loop if successful
          }
        } catch (error) {
          // Continue to the next approach
          continue;
        }
      }
      
      // If JSON parsing failed, fall back to manual parsing
      try {
        // Extract JSON from the response if it's in a code block
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                          responseText.match(/```\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
          const jsonText = jsonMatch[1].trim();
          structuredPapers = JSON.parse(jsonText);
        } else {
          // Try direct parsing if no code blocks
          structuredPapers = JSON.parse(responseText);
        }
      } catch (jsonError: unknown) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
        console.log('Initial JSON parsing failed, trying alternative extraction:', errorMessage);
        
        // Second attempt: Try to extract information using regex patterns
        // Look for patterns like numbered lists of papers with title, authors, etc.
        const paperBlocks = responseText.split(/\d\.\s+(?=Title:|TITLE:)/i);
        
        if (paperBlocks.length > 1) {
          console.log(`Found ${paperBlocks.length - 1} paper blocks using regex splitting`);
          
          // Skip the first element as it's likely introductory text
          for (let i = 1; i < paperBlocks.length; i++) {
            const block = paperBlocks[i];
            
            // Extract title
            const titleMatch = block.match(/Title:?\s*([^\n]+)/i) || 
                              block.match(/"?title"?:?\s*"?([^"\n]+)"?/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
            
            // Extract authors
            const authorsMatch = block.match(/Authors?:?\s*([^\n]+)/i) || 
                                block.match(/"?authors?"?:?\s*"?([^"\n]+)"?/i);
            const authors = authorsMatch ? authorsMatch[1].trim() : 'Unknown Authors';
            
            // Extract year
            const yearMatch = block.match(/Year:?\s*([^\n]+)/i) || 
                            block.match(/"?year"?:?\s*"?([^"\n]+)"?/i) ||
                            block.match(/(20\d{2})/); // Find a year like 2023
            const year = yearMatch ? yearMatch[1].trim() : 'Unknown Year';
            
            // Extract URL or DOI
            const urlMatch = block.match(/URL:?\s*([^\s\n]+)/i) || 
                           block.match(/DOI:?\s*([^\s\n]+)/i) ||
                           block.match(/Link:?\s*([^\s\n]+)/i) ||
                           block.match(/https?:\/\/[^\s\n"]+/);
            const url = urlMatch ? urlMatch[1] || urlMatch[0] : null;
            
            // Extract relevance
            const relevanceMatch = block.match(/Relevance:?\s*([^\n]+(?:\n[^\n#]+)*)/i) ||
                                  block.match(/Relation(ship)?:?\s*([^\n]+(?:\n[^\n#]+)*)/i);
            const relevance = relevanceMatch ? relevanceMatch[1] || relevanceMatch[2] : '';
            
            // Extract key insights
            const insightsText = block.match(/Key Insights:?\s*([^#]+)/i) || 
                                block.match(/Insights:?\s*([^#]+)/i);
            let keyInsights = [];
            if (insightsText && insightsText[1]) {
              keyInsights = insightsText[1]
                .split(/\n\s*[-•*]\s*/)
                .map((insight: string) => insight.trim())
                .filter((insight: string) => insight.length > 0);
            }
            
            structuredPapers.push({
              title,
              authors,
              year,
              url,
              relevance: relevance.trim(),
              keyInsights: keyInsights.length > 0 ? keyInsights : []
            });
          }
        }
      }
      
      // Validate and normalize the format of each paper
      relatedPapers = structuredPapers.map((paper: any) => {
        // Handle case-insensitive keys by creating a normalized version
        const normalizedPaper: Record<string, any> = {};
        Object.keys(paper).forEach(key => {
          normalizedPaper[key.toLowerCase()] = paper[key];
        });
        
        // Extract information with fallbacks for various key formats
        return {
          title: normalizedPaper.title || paper.Title || paper.TITLE || 'Unknown Title',
          authors: normalizedPaper.authors || paper.Authors || paper.AUTHORS || normalizedPaper.author || paper.Author || 'Unknown Authors',
          year: normalizedPaper.year || paper.Year || paper.YEAR || normalizedPaper.date || paper.Date || 'Unknown Year',
          url: normalizedPaper.url || paper.URL || normalizedPaper.doi || paper.DOI || normalizedPaper.link || paper.Link || null,
          relevance: normalizedPaper.relevance || paper.Relevance || normalizedPaper.relationship || normalizedPaper.relevancetooriginal || 
                   paper.Relationship || paper['Relation to Original'] || '',
          keyInsights: Array.isArray(normalizedPaper.keyinsights) ? normalizedPaper.keyinsights : 
                      Array.isArray(normalizedPaper.insights) ? normalizedPaper.insights :
                      Array.isArray(normalizedPaper.key_insights) ? normalizedPaper.key_insights :
                      Array.isArray(paper['Key insights']) ? paper['Key insights'] :
                      Array.isArray(paper['Key Insights']) ? paper['Key Insights'] : []
        };
      });
      
      console.log(`Successfully extracted ${relatedPapers.length} related papers`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error parsing Gemini response for related papers:', errorMessage);
      // Provide a fallback in case of parsing error
      relatedPapers = [];
    }
    
    // Add metadata about the recommendation
    const recommendationMetadata = {
      recommendedAt: new Date().toISOString(),
      recommendationMethod: 'gemini-internet-search',
      originalPaperId: id,
      originalPaperTitle: title
    };
    
    // Emit the recommendations
    await emit({
      topic: 'related-papers-recommended',
      data: {
        id,
        title,
        relatedPapers,
        metadata: recommendationMetadata
      }
    });
    
    console.log(`Recommended ${relatedPapers.length} related papers for: ${title}`);
    
    return {
      success: true,
      paperCount: relatedPapers.length
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error recommending related papers:', error);
    return {
      success: false,
      error: errorMessage
    };
  }
}
