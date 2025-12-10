import {ApiRouteConfig, StepHandler} from 'motia';
import { GoogleService } from '../../services/google.service';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Gmail Token Status',
  description: 'Checks the status of the Gmail token',
  path: '/api/token-status',
  method: 'GET',
  emits: ['gmail.token.status'],
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (req, {logger, state}) => {
  const googleService = new GoogleService(logger, state)
  
  try {
    const tokens = await googleService.getTokens()
    const expiryDate = tokens?.expiry_date ? new Date(tokens.expiry_date) : null
    const isExpired = expiryDate ? expiryDate < new Date() : false
    
    return {
      status: 200,
      body: {
        message: 'Successfully got tokens',
        expiryDate: tokens?.expiry_date,
        isExpired
      }
    }
  } catch (error) {
    logger.error(`Error getting tokens: ${error}`)
    return {
      status: 500,
      body: {
        message: 'Error getting tokens'
      }
    }
  }
} 