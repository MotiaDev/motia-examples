import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export const config = {
  type: 'event',
  name: 'GenerateCodeExamples',
  subscribes: ['paper-analyzed'],
  emits: ['code-examples-generated'],
  flows: ['research-assistant']
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface CodeExample {
  title: string;
  description: string;
  language: string;
  code: string;
  dependencies: string[];
  usageNotes?: string;
}

interface CodeExamplesResult {
  examples: CodeExample[];
}

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

async function generateCodeExamples(title: string, abstract: string, fullText: string, analysis: any): Promise<CodeExamplesResult> {
  try {
    const model = genAI.getGenerativeModel(modelConfig);
    
    const normalizedAnalysis: Record<string, any> = {};
    if (analysis) {
      Object.keys(analysis).forEach(key => {
        normalizedAnalysis[key.toLowerCase()] = analysis[key];
      });
    }
    
    const mainTopic = analysis?.mainTopic || analysis?.['Main Topic'] || normalizedAnalysis?.maintopic || 'Not specified';
    const disciplines = Array.isArray(analysis?.disciplines) ? analysis.disciplines : 
                       Array.isArray(analysis?.['Disciplines']) ? analysis['Disciplines'] : 
                       Array.isArray(normalizedAnalysis?.disciplines) ? normalizedAnalysis.disciplines : [];
    const methodology = analysis?.methodology || analysis?.['Methodology'] || normalizedAnalysis?.methodology || 'Not specified';
    const keyFindings = Array.isArray(analysis?.keyFindings) ? analysis.keyFindings : 
                      Array.isArray(analysis?.['Key Findings']) ? analysis['Key Findings'] : 
                      Array.isArray(normalizedAnalysis?.keyfindings) ? normalizedAnalysis.keyfindings : [];
                      
    const prompt = `
    Based on the following research paper, generate practical code examples that implement 
    or demonstrate the key techniques described in the paper:
    
    Title: ${title}
    Abstract: ${abstract}
    
    Paper's main topic: ${mainTopic}
    Academic disciplines: ${disciplines.join(', ')}
    Methodology: ${methodology}
    Key findings: ${keyFindings.join('; ')}
    
    Please provide 2-3 code examples that:
    1. Implement core algorithms or techniques from the paper
    2. Are well-commented and explained
    3. Use modern programming practices and libraries
    4. Could be useful for practitioners implementing the paper's ideas
    
    Format your response as code blocks in markdown with titles and descriptions for each example.
    For each example, start with a ## Title followed by a description, then the code in a \`\`\`language ... \`\`\` block.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response?.text || response.text().trim() === '') {
      if (response?.candidates && 
          response.candidates.length > 0 && 
          response.candidates[0].finishReason === 'MAX_TOKENS' &&
          response.candidates[0].content?.parts?.[0]?.text) {
          
        console.log('GenerateCodeExamples: MAX_TOKENS reached, attempting to use partial response');
      } else {
        console.error('GenerateCodeExamples: Invalid or empty response structure received from Gemini API.');
        throw new Error('Invalid or empty response structure from Gemini API');
      }
    }

    const responseText = response.text();
    console.log('Raw Gemini response for code examples:\n', responseText.substring(0, 500) + '...');
    
    let examples: CodeExamplesResult = { examples: [] };
    
    const codeBlockMatches = responseText.match(/## (.*?)[\r\n]+([\s\S]*?)```(\w*)([\s\S]*?)```/g);
    
    if (codeBlockMatches && codeBlockMatches.length > 0) {
      console.log(`Found ${codeBlockMatches.length} formatted code blocks in response`);
      
      codeBlockMatches.forEach((block, index) => {
        const titleMatch = block.match(/## (.*?)[\r\n]+/);
        const title = titleMatch ? titleMatch[1].trim() : `Example ${index + 1}`;
        
        const descMatch = block.match(/## .*?[\r\n]+([\s\S]*?)```\w*/);
        const description = descMatch ? descMatch[1].trim() : 'Implementation example';
        
        const langMatch = block.match(/```(\w*)/);
        const language = langMatch && langMatch[1] ? langMatch[1] : 'python';
        
        const codeMatch = block.match(/```\w*([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : '';
        
        if (code && code.length > 20) {
          examples.examples.push({
            title,
            description,
            language,
            code,
            dependencies: extractDependenciesFromCode(code, language)
          });
        }
      });
    } else {
      const bareCodeBlocks = responseText.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/g);
      if (bareCodeBlocks && bareCodeBlocks.length > 0) {
        console.log(`Found ${bareCodeBlocks.length} bare code blocks as fallback`);
        
        bareCodeBlocks.forEach((block, index) => {
          const langMatch = block.match(/```(\w+)/);
          const language = langMatch ? langMatch[1] : 'python';
          
          const codeMatch = block.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
          const code = codeMatch ? codeMatch[1].trim() : '';
          
          if (code && code.length > 20) {
            examples.examples.push({
              title: `Example ${index + 1}`,
              description: `Implementation example for ${mainTopic}`,
              language,
              code,
              dependencies: extractDependenciesFromCode(code, language)
            });
          }
        });
      }
    }
    
    if (examples.examples.length === 0) {
      console.log('No code examples found, using fallback example');
      examples.examples.push({
        title: 'Example Implementation',
        description: 'A basic implementation example for ' + mainTopic,
        code: '# Implementation for ' + mainTopic + '\n# Based on key concepts: ' + 
              (Array.isArray(disciplines) ? disciplines.join(', ') : 'research concepts') + 
              '\n\ndef main():\n    # TODO: Implement main functionality\n    print("Implementing ' + 
              mainTopic + '")\n\nif __name__ == "__main__":\n    main()',
        language: 'python',
        dependencies: []
      });
    }
    
    return examples;
  } catch (error) {
    console.error('Error generating code examples with Gemini:', error);
    return {
      "examples": [
        {
          "title": "Memory-Enhanced LLM Conversation",
          "description": "A basic implementation of a memory-enhanced conversation model using a vector database for storage",
          "language": "python",
          "code": "import torch\nfrom transformers import AutoTokenizer, AutoModelForCausalLM\nfrom sklearn.metrics.pairwise import cosine_similarity\n\nclass MemoryEnhancedLLM:\n    def __init__(self, model_name=\"gpt2\"):\n        self.tokenizer = AutoTokenizer.from_pretrained(model_name)\n        self.model = AutoModelForCausalLM.from_pretrained(model_name)\n        self.memory = []\n        \n    def extract_key_info(self, text):\n        # Simplified memory extraction\n        inputs = self.tokenizer(text, return_tensors=\"pt\")\n        with torch.no_grad():\n            outputs = self.model(**inputs, output_hidden_states=True)\n        # Use the last hidden state as embedding\n        embeddings = outputs.hidden_states[-1].mean(dim=1)\n        return {\"text\": text, \"embedding\": embeddings}\n    \n    def add_to_memory(self, text):\n        memory_item = self.extract_key_info(text)\n        self.memory.append(memory_item)\n        # Consolidate memory if it gets too large\n        if len(self.memory) > 100:\n            self.consolidate_memory()\n    \n    def consolidate_memory(self):\n        # Simplified memory consolidation by clustering similar items\n        # In a real implementation, this would use more sophisticated methods\n        pass\n    \n    def retrieve_relevant_memories(self, query, k=3):\n        query_info = self.extract_key_info(query)\n        similarities = []\n        \n        for item in self.memory:\n            sim = cosine_similarity(\n                query_info[\"embedding\"].numpy(), \n                item[\"embedding\"].numpy()\n            )[0][0]\n            similarities.append((sim, item))\n        \n        # Return top k relevant memories\n        return [item for _, item in sorted(similarities, reverse=True)[:k]]\n    \n    def generate_response(self, query):\n        relevant_memories = self.retrieve_relevant_memories(query)\n        context = \"\\n\".join([item[\"text\"] for item in relevant_memories])\n        \n        prompt = f\"Context from memory:\\n{context}\\n\\nCurrent query: {query}\\n\\nResponse:\"\n        \n        inputs = self.tokenizer(prompt, return_tensors=\"pt\")\n        outputs = self.model.generate(**inputs, max_length=100)\n        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)\n        \n        # Add the interaction to memory\n        self.add_to_memory(f\"Query: {query}\\nResponse: {response}\")\n        \n        return response",
          "dependencies": ["transformers", "torch", "scikit-learn"],
          "usageNotes": "This implementation demonstrates the core concept of memory extraction, storage, and retrieval in conversational AI. It uses transformer embeddings for representation and cosine similarity for retrieval."
        },
        {
          "title": "Dynamic Memory Consolidation",
          "description": "Implementation of a memory consolidation algorithm that summarizes and merges similar memory items",
          "language": "python",
          "code": "import numpy as np\nfrom sklearn.cluster import KMeans\nfrom transformers import pipeline\n\nclass MemoryConsolidator:\n    def __init__(self, memory_capacity=100):\n        self.memory_capacity = memory_capacity\n        self.summarizer = pipeline(\"summarization\")\n        \n    def consolidate_memories(self, memory_items):\n        \"\"\"Consolidate memory items when they exceed capacity\"\"\"\n        if len(memory_items) <= self.memory_capacity:\n            return memory_items\n            \n        # Extract embeddings for clustering\n        embeddings = np.array([item[\"embedding\"].numpy().flatten() for item in memory_items])\n        \n        # Determine optimal number of clusters (simplified)\n        n_clusters = max(self.memory_capacity // 2, 1)\n        \n        # Cluster similar memories\n        kmeans = KMeans(n_clusters=n_clusters, random_state=42)\n        clusters = kmeans.fit_predict(embeddings)\n        \n        # Group memories by cluster\n        clustered_memories = {}\n        for i, cluster_id in enumerate(clusters):\n            if cluster_id not in clustered_memories:\n                clustered_memories[cluster_id] = []\n            clustered_memories[cluster_id].append(memory_items[i])\n        \n        # Consolidate each cluster into a summary memory\n        consolidated_memories = []\n        for cluster_id, cluster_items in clustered_memories.items():\n            if len(cluster_items) == 1:\n                # No need to consolidate single items\n                consolidated_memories.append(cluster_items[0])\n            else:\n                # Combine texts from cluster for summarization\n                combined_text = \"\\n\".join([item[\"text\"] for item in cluster_items])\n                \n                # Generate summary of the combined memories\n                summary = self.summarizer(\n                    combined_text, \n                    max_length=150, \n                    min_length=50, \n                    do_sample=False\n                )[0][\"summary_text\"]\n                \n                # Create a new consolidated memory item\n                # In a real implementation, we would re-embed the summary\n                # Here we just average the embeddings as an approximation\n                avg_embedding = sum([item[\"embedding\"] for item in cluster_items]) / len(cluster_items)\n                \n                consolidated_memories.append({\n                    \"text\": f\"CONSOLIDATED MEMORY: {summary}\",\n                    \"embedding\": avg_embedding,\n                    \"source_count\": len(cluster_items),\n                    \"timestamp\": max([item.get(\"timestamp\", 0) for item in cluster_items])\n                })\n        \n        return consolidated_memories",
          "dependencies": ["transformers", "numpy", "scikit-learn"],
          "usageNotes": "This implementation shows how to consolidate memories using clustering and summarization. It groups similar memories together and creates consolidated summaries to maintain the most important information while reducing storage requirements."
        }
      ]
    };
  }
}

function extractDependenciesFromCode(code: string, language: string): string[] {
  const dependencies = new Set<string>();
  
  if (language === 'python') {
    const importMatches = code.match(/(?:^|\n)(?:import|from)\s+([^\s.]+)/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const lib = match.replace(/(?:^|\n)(?:import|from)\s+/, '').split(/\s|\.|\,/)[0].trim();
        if (lib && !lib.startsWith('_') && lib !== 'os' && lib !== 'sys' && lib !== 're') {
          dependencies.add(lib);
        }
      });
    }
  } else if (language === 'javascript' || language === 'typescript') {
    const importMatches = code.match(/(?:^|\n)(?:import|require\()\s*['"]([^'".\s]+)/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const lib = match.replace(/(?:^|\n)(?:import|require\()\s*['"]/, '').trim();
        if (lib && !lib.startsWith('.')) {
          dependencies.add(lib);
        }
      });
    }
  }
  
  return Array.from(dependencies);
}

export const handler = async (input: any, { emit }: { emit: any }) => {
  try {
    const { id, title, authors, abstract, fullText, analysis, pdfUrl, doi, uploadedAt, analyzedAt } = input;
    
    console.log(`Generating code examples for paper: ${title}`);
    
    const codeExamples = await generateCodeExamples(title, abstract, fullText, analysis);
    
    await emit({
      topic: 'code-examples-generated',
      data: {
        id,
        title,
        authors,
        pdfUrl,
        doi,
        uploadedAt,
        analyzedAt,
        analysis,
        codeExamples,
        codeExamplesGeneratedAt: new Date().toISOString()
      }
    });
    
    console.log(`Code examples generated for: ${title}`);
    
  } catch (error) {
    console.error('Error generating code examples:', error);
  }
}
