import OpenAI from 'openai'
import { Logger } from 'motia'

export class OpenAIService {
  private openai: OpenAI
  private logger: Logger
  private model: string

  constructor(logger: Logger, apiKey: string, model: string) {
    this.openai = new OpenAI({
      apiKey,
    })
    this.model = model
    this.logger = logger
  }

  async generateSummary(title: string, description: string): Promise<string> {
    this.logger.info('Generating summary for task', { title })

    // complete prompt suggestion
    //   const prompt = `Generate a concise, professional technical summary of this Trello ticket.
    // Follow these guidelines:
    // - Capture the core technical objective
    // - Highlight key implementation details
    // - Use clear, precise language
    // - Focus on the problem being solved
    // - Maintain a neutral, professional tone

    // Ticket Details:
    // Title: ${title}
    // Description: ${description}

    // Summary Format:
    // - Start with the primary technical goal
    // - Briefly explain the technical approach or solution
    // - Mention any critical constraints or considerations

    // Output a single, crisp sentence that a senior engineer would find informative.`

    const prompt = `Summarize the following Trello task:
      Title: ${title}
      Description: ${description}

      Summarize in one sentence.`

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 50,
      })

      const summary = completion.choices[0]?.message?.content?.trim() || 'No summary generated'
      this.logger.info('Summary generated successfully')

      return summary
    } catch (error) {
      this.logger.error('Failed to generate summary', { error })
      throw new Error('Unable to generate summary at this time')
    }
  }
}
