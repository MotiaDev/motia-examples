import { EventConfig, StepHandler } from 'motia'
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
    subscribes: ['eval-image-generation-dataset'],
    emits: ['eval-image-generation-dataset-score'],
    input: inputSchema,
    flows: ['eval-agent'],
}

export const handler: StepHandler<typeof config> = async (input, { traceId, emit, logger }) => {
  logger.info('evaluate the entire flow')

  const openai = new OpenAI()

  try {
    // Read all files from tmp directory
    const files = await fs.readdir('tmp')
    
    const datasetReport = []

    // For this example we consider a success if the integrity score is greater or queal than 8 and the vision score is greater or equal to 85
    const finalScore = {
      success: 0,
      failure: 0,
    }

    for (const file of files) {
      const reportMatch = file.match(/^(.+?)_report\.txt$/)
      if (reportMatch) {
        logger.info('evaluating file: ' + file)
        const [, id] = reportMatch
        
        const reportContent = await fs.readFile('tmp/' +file, 'utf-8')
        const reportData = JSON.parse(reportContent)

        if (reportData.image_path && reportData.prompt && reportData.original_prompt && reportData.score) {
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
                content: `Original prompt: "${reportData.original_prompt}"\nGenerated prompt: "${reportData.prompt}"\n\nProvide only a number from 0-10 as response.`
              }
            ],
            temperature: 0.3,
          })
          const integrityScore = parseFloat(integrityResponse.choices[0].message.content ?? '0')

          // Evaluate image-prompt alignment
          const imageBuffer = await fs.readFile(reportData.image_path)
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
                    text: `Prompt: "${reportData.prompt}"\n\nAnalyze how well this image matches the prompt. Provide only a number from 0-100 as response.`
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

          datasetReport.push({
            traceId: id,
            prompt: reportData.prompt,
            original_prompt: reportData.original_prompt,
            score: reportData.score,
            image_path: reportData.image_path,
            integrity_score: integrityScore,
            vision_score: visionScore
          })

          if (integrityScore >= 8 && visionScore >= 85) {
            finalScore.success++
          } else {
            finalScore.failure++
          }
        }
      }
    }

    // Write evaluation results to file
    const reportPath = path.join(process.cwd(), 'eval-reports', `${traceId}.eval.json`)
    
    // Create eval-reports directory if it doesn't exist
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    
    await fs.writeFile(
      reportPath,
      JSON.stringify(datasetReport, null, 2),
      'utf-8'
    )

    logger.info(`evaluation results written to: ${reportPath}`)

    // For now we only emit the report path and the confidence percentage, for a future use case you can trigger
    // a webhook to notify the user that the evaluation is ready, or to enable a new flow, or to allow CI to proceed
    await emit({
      type: 'eval-image-generation-dataset-score',
      data: {
        reportPath,
        confidencePercentage: (finalScore.success * 100) / datasetReport.length,
      },
    })
    
  } catch (error) {
    logger.error('Error processing files:', error)
    throw error
  }
}