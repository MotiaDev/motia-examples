import {ApiRouteConfig, StepHandler} from 'motia';
import { GoogleService } from '../../services/google.service';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Gmail Get Auth URL',
  description: 'Get the auth URL for Gmail',
  path: '/api/get-auth-url',
  method: 'GET',
  emits: ['gmail.auth-url'],
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (_, {logger, state}) => {
  const googleService = new GoogleService(logger, state)
  
  try {
    const authUrl = await googleService.getAuthUrl()
    return {
      status: 200,
      body: {
        authUrl
      },
    }
  } catch (error) {
    logger.error(`Error fetching tokens: ${error}`)
    return {
      status: 500,
      body: {
        message: 'Error fetching tokens'
      }
    }
  }
} 