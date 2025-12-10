export const config = {
  type: 'event',
  name: 'AnalyzePaperWithGemini',
  subscribes: ['text-extracted'],
  emits: ['paper-analyzed'],
  flows: ['research-assistant']
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, pdfUrl, doi, uploadedAt, extractedAt } = input;
    
    console.log(`Analyzing paper with Gemini: ${title}`);
    
    const apiKey = (process as any).env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables');
      throw new Error('Gemini API key not found');
    }
    
    const prompt = `
    You are a research paper analysis assistant. Analyze the following research paper and extract key information:
    
    Title: ${title}
    Authors: ${Array.isArray(authors) ? authors.join(', ') : authors}
    Abstract: ${abstract}
    Full Text: ${fullText}
    
    Please provide the following analysis:
    1. Main Topic: What is the primary subject of this paper?
    2. Disciplines: What academic disciplines does this paper relate to?
    3. Methodology: What research methodology is used?
    4. Key Findings: What are the main discoveries or conclusions?
    5. Limitations: What limitations or constraints are mentioned?
    6. Future Directions: What future research is suggested?
    
    Format your response as a JSON object with these fields.
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
          maxOutputTokens: 1024
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
    
    interface Analysis {
      mainTopic: string;
      disciplines: string[];
      methodology: string;
      keyFindings: string[];
      limitations: string[];
      futureDirections: string[];
      [key: string]: string | string[];
    }
    
    let analysis: Analysis;
    try {
      const responseText = responseData.candidates[0].content.parts[0].text;
      console.log('AnalyzePaperWithGemini raw response:', responseText.substring(0, 200) + '...');
      
      if (!responseText || responseText.length < 10) {
        console.error('AnalyzePaperWithGemini: Empty or too short response received');
        throw new Error('Empty or too short response from Gemini API');
      }

      if (!responseData.candidates || 
          responseData.candidates.length === 0 || 
          !responseData.candidates[0].content || 
          !responseData.candidates[0].content.parts || 
          responseData.candidates[0].content.parts.length === 0 || 
          !responseData.candidates[0].content.parts[0].text ||
          responseData.candidates[0].content.parts[0].text.trim() === '') {
            
        console.error('AnalyzePaperWithGemini: Invalid or empty response structure received from Gemini API.', responseData);
        
        if (responseData.candidates && 
            responseData.candidates.length > 0 && 
            responseData.candidates[0].finishReason === 'MAX_TOKENS' &&
            responseData.candidates[0].content?.parts?.[0]?.text) {
            
          console.log('AnalyzePaperWithGemini: MAX_TOKENS reached, attempting to use partial response');
        } else {
          throw new Error('Invalid or empty response structure from Gemini API');
        }
      }

      let mainTopic = '';
      let disciplines = [];
      let methodology = '';
      let keyFindings = [];
      let limitations = [];
      let futureDirections = [];

      const mainTopicMatch = responseText.match(/Main Topic:?\s*([^\n]+)/i);
      if (mainTopicMatch) mainTopic = mainTopicMatch[1].trim();
      
      const disciplinesMatch = responseText.match(/Disciplines:?\s*([^\n]+)/i);
      if (disciplinesMatch) disciplines = disciplinesMatch[1].split(/,|;/).map((d: string) => d.trim());
      
      const methodologyMatch = responseText.match(/Methodology:?\s*([^\n]+)/i);
      if (methodologyMatch) methodology = methodologyMatch[1].trim();
      
      const findItems = (sectionName: string): string[] => {
        const regex = new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\d+\\.|\\w+:|$)`, 'i');
        const match = responseText.match(regex);
        if (!match) return [];
        
        const itemsText = match[1].trim();
        const items = itemsText.split(/\n-|\n\d+\./).map((item: string) => item.trim()).filter((item: string) => item.length > 0);
        return items.length > 0 ? items : [itemsText];
      };
      
      keyFindings = findItems('Key Findings');
      limitations = findItems('Limitations');
      futureDirections = findItems('Future Directions');

      let jsonText;
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].includes('{')) {
        jsonText = codeBlockMatch[1].trim();
      } else {
        const start = responseText.indexOf('{');
        const end = responseText.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonText = responseText.slice(start, end + 1);
        } else {
          console.warn('No JSON structure found, building one from extracted text');
          jsonText = JSON.stringify({
            mainTopic,
            disciplines,
            methodology,
            keyFindings,
            limitations,
            futureDirections
          });
        }
      }

      jsonText = jsonText
        .replace(/[\u201C\u201D\u2018\u2019]/g, '"')
        .replace(/[\n\r]+/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        .replace(/"\s*\+\s*"/g, '')
        .replace(/\\"/g, '"')
        .replace(/"{/g, '{').replace(/}"/g, '}');

      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Initial JSON parsing failed:', parseError);
        
        try {
          jsonText = jsonText
            .replace(/([{,][^,{}\[\]:"']*?)(['"])?(\w+)(['"])?:/g, '$1"$3":')
            .replace(/:\s*([^{}\[\],"'\s][^{}\[\],]*?)([,}])/g, ':"$1"$2')
            .replace(/([{,])\s*"([^"]+)"\s*:\s*"([^"]+)"\s*([,}])/g, '$1"$2":"$3"$4');
          
          analysis = JSON.parse(jsonText);
        } catch (error) {
          console.error('All JSON parsing attempts failed, using extracted data');
          
          analysis = {
            mainTopic: mainTopic || title || "Research Paper Analysis",
            disciplines: disciplines.length > 0 ? disciplines : ["Computer Science"],
            methodology: methodology || "Not specified",
            keyFindings: keyFindings.length > 0 ? keyFindings : ["Analysis failed to parse response"],
            limitations: limitations.length > 0 ? limitations : ["Unable to extract detailed analysis"],
            futureDirections: futureDirections.length > 0 ? futureDirections : ["Retry analysis with improved parsing"]
          };
        }
      }

      const requiredFields = ['mainTopic', 'disciplines', 'methodology', 'keyFindings', 'limitations', 'futureDirections'];
      const missingFields = requiredFields.filter(field => !analysis[field]);
      
      if (missingFields.length > 0) {
        console.warn(`Missing required fields in analysis: ${missingFields.join(', ')}`);
        missingFields.forEach(field => {
          analysis[field] = field === 'disciplines' ? ['Not specified'] : 'Not specified';
        });
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      console.log('Raw response text:', responseData.candidates[0].content.parts[0].text);
      
      analysis = {
        mainTopic: title || "Research Paper Analysis",
        disciplines: ["Computer Science"],
        methodology: "Not specified",
        keyFindings: ["Analysis failed to parse response"],
        limitations: ["Unable to extract detailed analysis"],
        futureDirections: ["Retry analysis with improved parsing"]
      };
    }
    
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
    
    console.log(`Paper analyzed with Gemini: ${title}`);
    
  } catch (error) {
    console.error('Error analyzing paper with Gemini:', error);
  }
}
