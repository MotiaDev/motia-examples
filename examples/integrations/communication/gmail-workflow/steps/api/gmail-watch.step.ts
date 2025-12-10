import {ApiRouteConfig, StepHandler} from 'motia';
import { GoogleService } from '../../services/google.service';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'Gmail Watch',
  description: 'Watches Gmail for new emails',
  path: '/api/watch',
  method: 'GET',
  emits: ['gmail.watch'],
  flows: ['gmail-flow'],
}

export const handler: StepHandler<typeof config> = async (req, {logger, state}) => {
  const googleService = new GoogleService(logger, state)
  
  try {
    await googleService.watchEmail()
  } catch (error) {
    logger.error(`Error watching emails: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      status: 500,
      body: {
        message: 'Error watching emails'
      }
    }
  }
  
  return {
    status: 200,
    body: {
      message: 'Successfully watched emails'
    },
  }
} 