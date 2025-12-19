import { config } from 'motia'
import statesPlugin from '@motiadev/plugin-states/plugin'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'
import todoTesterPlugin from './plugins/todo-tester/index'

// Determine Redis configuration based on environment
const getRedisConfig = () => {
  const useExternalRedis = process.env.USE_REDIS === 'true' || 
    (process.env.USE_REDIS !== 'false' && process.env.NODE_ENV === 'production')

  if (!useExternalRedis) {
    // Use Motia's built-in in-memory Redis for development
    return { useMemoryServer: true as const }
  }

  // Parse Redis URL for production
  const redisUrl = process.env.REDIS_PRIVATE_URL || process.env.REDIS_URL
  
  if (redisUrl) {
    try {
      const url = new URL(redisUrl)
      return {
        useMemoryServer: false as const,
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password || undefined,
        username: url.username || undefined,
      }
    } catch (e) {
      console.error('[motia] Failed to parse REDIS_URL:', e)
    }
  }

  // Fallback to individual env vars
  return {
    useMemoryServer: false as const,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    username: process.env.REDIS_USERNAME,
  }
}

export default config({
  plugins: [
    observabilityPlugin,
    statesPlugin,
    endpointPlugin,
    logsPlugin,
    bullmqPlugin,
    todoTesterPlugin,
  ],
  redis: getRedisConfig(),
})
