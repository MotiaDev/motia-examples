import { ApiMiddleware } from 'motia'

/**
 * Request logging middleware
 * 
 * Logs all incoming requests and their responses
 */
export const requestLogger: ApiMiddleware<any, any, any> = async (req, context, next) => {
  const startTime = Date.now()
  
  context.logger.info('Incoming request', {
    method: req.pathParams,
    path: Object.keys(req.pathParams).length > 0 ? req.pathParams : 'root',
    query: req.queryParams,
    traceId: context.trace_id
  })
  
  const response = await next()
  
  const duration = Date.now() - startTime
  
  context.logger.info('Request completed', {
    status: response.status,
    duration: `${duration}ms`,
    traceId: context.trace_id
  })
  
  return response
}

