import OpenAI from 'openai'
import { TeamMember, PRClassification, IssueClassification } from '../../types/github'

export class OpenAIClient {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async classifyIssue(title: string, body: string): Promise<IssueClassification> {
    const prompt = `
      Analyze this GitHub issue and classify it:
      Title: ${title}
      Body: ${body}
      
      Provide classification in JSON format with these fields:
      - type: "bug", "feature", "question", or "documentation"
      - priority: "low", "medium", "high", or "critical"
      - complexity: "simple", "moderate", or "complex"
      
      Base your classification on the content and context of the issue.
    `

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  }

  async suggestAssignees(
    title: string,
    body: string,
    availableAssignees: Array<{ login: string; expertise: string[] }>
  ): Promise<string[]> {
    const prompt = `
      Based on this GitHub issue and available team members, suggest up to 2 assignees:
      
      Issue:
      Title: ${title}
      Body: ${body}
      
      Available team members and their expertise:
      ${availableAssignees.map(a => `- ${a.login}: ${a.expertise.join(', ')}`).join('\n')}
      
      Return only an array of suggested assignee usernames in JSON format.
    `

    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    })

    return JSON.parse(response.choices[0].message.content || '[]')
  }

  async suggestReviewers(
    title: string,
    body: string,
    teamMembers: TeamMember[],
    classification: PRClassification
  ): Promise<string[]> {
    const prompt = `Based on the following PR details, suggest the most appropriate reviewers from the team:
    
    Title: ${title}
    Description: ${body}
    Type: ${classification.type}
    Impact: ${classification.impact}
    Areas: ${classification.areas.join(', ')}
    
    Team members and their expertise:
    ${teamMembers.map(member => `- ${member.login}: ${member.expertise.join(', ')}`).join('\n')}
    
    Return only the usernames of the 1-2 most suitable reviewers based on expertise match.`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    })

    const suggestedReviewers = response.choices[0].message.content
      ?.split(/[\s,]+/)
      .filter(reviewer => teamMembers.some(member => member.login === reviewer))
      .slice(0, 2)

    return suggestedReviewers || []
  }

  async classifyPR(title: string, body: string): Promise<PRClassification> {
    const prompt = `Analyze this Pull Request and classify it:
    
    Title: ${title}
    Description: ${body}
    
    Provide classification in JSON format with these fields:
    - type: one of ["bug-fix", "feature", "documentation", "refactor"]
    - impact: one of ["low", "medium", "high"]
    - areas: array of affected areas (e.g. ["frontend", "api", "database", "authentication"])
    
    Base the classification on:
    - type: determine from PR content whether it's fixing a bug, adding feature, updating docs, or refactoring
    - impact: assess potential risk and scope of changes
    - areas: identify technical areas affected by changes
    
    Return only valid JSON matching the specified format.`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })

    try {
      const classification = JSON.parse(response.choices[0].message.content || '{}')

      // Validate the response matches our expected schema
      return {
        type: classification.type,
        impact: classification.impact,
        areas: Array.isArray(classification.areas) ? classification.areas : [],
      } as PRClassification
    } catch (error) {
      throw new Error('Failed to parse PR classification response')
    }
  }
}
