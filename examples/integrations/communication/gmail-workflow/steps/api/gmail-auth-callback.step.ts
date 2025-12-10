import {ApiRouteConfig, StepHandler} from 'motia';
import { GoogleService } from '../../services/google.service';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Gmail Auth',
  description: 'Handles OAuth2 callback from Google to complete Gmail authentication flow',
  path: '/api/auth/callback',
  method: 'GET',
  emits: ['gmail.auth'],
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (req, {logger, state}) => {
  const {code} = req.queryParams

  logger.info(`Received OAuth2 callback with code ${code}`)

  const googleService = new GoogleService(logger, state)
  
  try {
    await googleService.fetchTokens(code as string)
  } catch (error) {
    logger.error(`Error fetching tokens: ${error}`)
    return {
      status: 500,
      body: {
        message: 'Error fetching tokens'
      }
    }
  }
  
  return {
    status: 200,
    body: {
      message: 'Successfully authenticated'
    },
  }
} 