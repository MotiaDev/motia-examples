import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'
import todoTesterPlugin from './plugins/todo-tester/index'
import { RedisStateAdapter } from '@motiadev/adapter-redis-state'
import { RedisStreamAdapterManager } from '@motiadev/adapter-redis-streams'
import { RedisCronAdapter } from '@motiadev/adapter-redis-cron'
import { BullMQEventAdapter } from '@motiadev/adapter-bullmq-events'

// Parse Redis connection from environment
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL
  const redisPrivateUrl = process.env.REDIS_PRIVATE_URL // Railway internal
  const effectiveUrl = redisPrivateUrl || redisUrl

  // Debug logging
  console.log('[motia] Redis config:', {
    REDIS_URL: redisUrl ? 'set' : 'not set',
    REDIS_PRIVATE_URL: redisPrivateUrl ? 'set' : 'not set',
    REDIS_HOST: process.env.REDIS_HOST || 'not set',
    NODE_ENV: process.env.NODE_ENV,
    USE_REDIS: process.env.USE_REDIS,
  })

  // If we have a Redis URL, use it directly
  if (effectiveUrl) {
    try {
      const url = new URL(effectiveUrl)
      const host = url.hostname
      const port = parseInt(url.port || '6379', 10)
      const password = url.password || undefined
      const useTls = url.protocol === 'rediss:' // rediss:// means TLS

      console.log(`[motia] Parsed Redis URL - host: ${host}, port: ${port}, tls: ${useTls}`)

      return {
        host,
        port,
        password,
        useTls,
      }
    } catch (e) {
      console.error('[motia] Failed to parse REDIS_URL:', e)
    }
  }

  // Fallback to individual env vars
  return {
    host: process.env.REDIS_HOST || process.env.REDISHOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
    useTls: false,
  }
}

const redisConfig = getRedisConfig()

// USE_REDIS takes priority: 'false' disables, 'true' enables, otherwise check NODE_ENV
const useRedis = process.env.USE_REDIS === 'true' || 
  (process.env.USE_REDIS !== 'false' && process.env.NODE_ENV === 'production')

// node-redis v4 format (used by State, Streams, Cron adapters)
const nodeRedisConfig = redisConfig.useTls
  ? {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        tls: true as const,
      },
      ...(redisConfig.password && { password: redisConfig.password }),
    }
  : {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
      },
      ...(redisConfig.password && { password: redisConfig.password }),
    }

// IORedis format (used by BullMQ adapter)
const ioRedisConfig = {
  host: redisConfig.host,
  port: redisConfig.port,
  ...(redisConfig.password && { password: redisConfig.password }),
  ...(redisConfig.useTls && { tls: {} }),
  maxRetriesPerRequest: null, // Required for BullMQ
}

// Only create adapters when Redis is enabled
const getAdapters = () => {
  if (!useRedis) {
    console.log('[motia] Using in-memory adapters (USE_REDIS=false or development mode)')
    return undefined
  }

  console.log('[motia] Using Redis adapters')
  console.log(`[motia] Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`)

  return {
    state: new RedisStateAdapter(nodeRedisConfig),
    streams: new RedisStreamAdapterManager(nodeRedisConfig),
    events: new BullMQEventAdapter({ connection: ioRedisConfig }),
    cron: new RedisCronAdapter(nodeRedisConfig),
  }
}

export default defineConfig({
  plugins: [
    observabilityPlugin,
    statesPlugin,
    endpointPlugin,
    logsPlugin,
    bullmqPlugin,
    todoTesterPlugin,
  ],
  adapters: getAdapters(),
})
