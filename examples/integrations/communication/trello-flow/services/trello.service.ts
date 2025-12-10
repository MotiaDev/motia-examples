import axios, { AxiosInstance } from 'axios'
import { Logger } from 'motia'
import { TrelloCardDetails, TrelloConfig } from '../types/trello'

export class TrelloService {
  private baseUrl = 'https://api.trello.com/1'
  private api: AxiosInstance
  private logger: Logger

  constructor(private config: TrelloConfig, logger: Logger) {
    this.api = axios.create({
      baseURL: this.baseUrl,
      params: {
        key: this.config.apiKey,
        token: this.config.token,
      },
    })
    this.logger = logger
  }

  async moveCard(cardId: string, listId: string) {
    try {
      const answer = await this.api.put(`/cards/${cardId}`, {
        idList: listId,
      })

      return answer.data
    } catch (error) {
      this.logger.error('Error moving card:', error)
      throw this.handleError(error)
    }
  }

  async addComment(cardId: string, text: string) {
    try {
      const encodedText = encodeURIComponent(text)
      await this.api.post(`/cards/${cardId}/actions/comments?text=${encodedText}`)
    } catch (error) {
      this.logger.error('Error adding comment:', error)
      throw this.handleError(error)
    }
  }

  async getCard(
    cardId: string,
    options?: {
      fields?: string[]
      actions?: boolean
      attachments?: boolean
    },
  ): Promise<TrelloCardDetails> {
    try {
      const response = await this.api.get<TrelloCardDetails>(`/cards/${cardId}`, {
        params: {
          fields: options?.fields?.join(',') || 'all',
          members: true,
          customFieldItems: true,
          actions: options?.actions,
          attachments: options?.attachments,
        },
      })
      return response.data
    } catch (error) {
      this.logger.error('Error getting card:', error)
      throw this.handleError(error)
    }
  }

  async getCardsInList(
    listId: string,
    options?: {
      fields?: string[]
      limit?: number
      before?: string
      since?: string
    },
  ) {
    try {
      const response = await this.api.get(`/lists/${listId}/cards`, {
        params: {
          fields: options?.fields?.join(',') || 'id,name,desc,due,idList,idBoard,labels',
          members: true,
          limit: options?.limit || 1000,
          before: options?.before,
          since: options?.since,
        },
      })
      return response.data
    } catch (error) {
      this.logger.error('Error getting cards in list:', error)
      throw this.handleError(error)
    }
  }

  private handleError(error: any) {
    if (axios.isAxiosError(error)) {
      switch (error.response?.status) {
        case 400:
          return new Error('Invalid request parameters')
        case 401:
          return new Error('Authentication failed - invalid API key or token')
        case 403:
          return new Error('Authorization failed - insufficient permissions')
        case 404:
          return new Error('Resource not found')
        case 429:
          return new Error(
            'Rate limit exceeded - see https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/',
          )
        default:
          return new Error(`Trello API error: ${error.message}`)
      }
    }
    return error
  }
}
