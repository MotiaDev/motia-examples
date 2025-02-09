import { EventConfig, StepHandler } from '@motiadev/core'
import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'
import OpenAI from 'openai'

const inputSchema = z.object({})

type Input = typeof inputSchema

// Add this helper function at the top level, before the handler
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const config: EventConfig<Input> = {
    type: 'event',
    name: 'eval entire flow',
    description: 'evaluate the entire flow',
    subscribes: ['eval-agent-results'],
    emits: [],
    input: inputSchema,
    flows: ['generate-image'],
}

export const handler: StepHandler<typeof config> = async (input, { traceId, emit, logger }) => {
  logger.info('evaluate the entire flow')

  const openai = new OpenAI()

  try {
    // Read all files from tmp directory
    const files = await fs.readdir('tmp')
    
    // Group files by traceId
    const fileGroups = new Map<string, { png?: string, txt?: string, score?: string }>()
    
    for (const file of files) {
      const match = file.match(/^(.+?)(\.png|\.txt|_score\.txt)$/)
      if (match) {
        const [, id, ext] = match
        if (!fileGroups.has(id)) {
          fileGroups.set(id, {})
        }
        
        const group = fileGroups.get(id)!
        if (ext === '.png') group.png = file
        else if (ext === '.txt') group.txt = file
        else if (ext === '_score.txt') group.score = file
      }
    }

    const results = []
    
    // Process each complete group with OpenAI evaluations
    for (const [id, group] of fileGroups) {
      if (group.txt && group.score && group.png) {
        const txtContent = await fs.readFile(path.join('tmp', group.txt), 'utf-8')
        const { prompt, original_prompt } = JSON.parse(txtContent)
        const scoreContent = await fs.readFile(path.join('tmp', group.score), 'utf-8')
        const scoreMatch = scoreContent.match(/Score: (\d+(\.\d+)?)/)
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : null
        
        // Evaluate prompt integrity
        const integrityResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an evaluator comparing an original prompt with a generated prompt. Score the integrity from 0 to 10, where 10 means perfect preservation of meaning and 0 means complete hallucination."
            },
            {
              role: "user",
              content: `Original prompt: "${original_prompt}"\nGenerated prompt: "${prompt}"\n\nProvide only a number from 0-10 as response.`
            }
          ],
          temperature: 0.3,
        })
        const integrityScore = parseFloat(integrityResponse.choices[0].message.content ?? '0')

        // Evaluate image-prompt alignment
        const imageBuffer = await fs.readFile(path.join('tmp', group.png))
        const base64Image = imageBuffer.toString('base64')
        
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an evaluator comparing an image with its prompt. Score the alignment from 0 to 100, where 100 means perfect match and 0 means completely misaligned."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Prompt: "${prompt}"\n\nAnalyze how well this image matches the prompt. Provide only a number from 0-100 as response.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          temperature: 0.3,
        })
        const visionScore = parseFloat(visionResponse.choices[0].message.content ?? '0')

        // Add sleep after API calls
        await sleep(1000) // Sleep for 30 seconds

        results.push({
          traceId: id,
          prompt,
          original_prompt,
          score,
          image_path: path.join('tmp', group.png),
          integrity_score: integrityScore,
          vision_score: visionScore
        })

        // 
      }
    }

    // Emit the results
    // Write evaluation results to file
    await fs.writeFile(
      path.join(process.cwd(), 'tmp', `${traceId}.eval.json`),
      JSON.stringify(results, null, 2),
      'utf-8'
    )
    
  } catch (error) {
    logger.error('Error processing files:', error)
    throw error
  }
}