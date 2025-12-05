import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from 'motia'
import { RedisStateAdapter } from '@motiadev/adapter-redis-state'
import { RedisCronAdapter } from '@motiadev/adapter-redis-cron'
import { RedisStreamAdapterManager } from '@motiadev/adapter-redis-streams'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')
const bullmqPlugin = require('@motiadev/plugin-bullmq/plugin')

function gameViewerPlugin(motia: MotiaPluginContext): MotiaPlugin {
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/game-viewer/games',
    },
    async (_req, ctx) => {
      try {
        const allFlows = await ctx.state.getGroup<any>('game-flows')
        
        const games = allFlows.map(flow => ({
          flowId: flow.metadata?.flowId || flow.flowId,
          title: flow.spec?.title || 'Untitled',
          genre: flow.spec?.genre || 'Unknown',
          complexity: flow.spec?.complexity || 'Unknown',
          status: flow.metadata?.status || 'unknown',
          createdAt: flow.metadata?.createdAt || new Date().toISOString(),
          completedAt: flow.metadata?.completedAt,
          qaScore: flow.qaReport?.overallScore,
          qualityGrade: flow.finalValidation?.qualityGrade,
        }))

        // Sort by creation date (newest first)
        games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        return {
          status: 200,
          body: { games, total: games.length },
        }
      } catch (error: any) {
        ctx.logger.error('Failed to list games', { error: error.message })
        return {
          status: 500,
          body: { error: 'Failed to list games' },
        }
      }
    }
  )

  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/game-viewer/games/:flowId',
    },
    async (req, ctx) => {
      try {
        const { flowId } = req.pathParams
        const flowState = await ctx.state.get<any>('game-flows', flowId)

        if (!flowState) {
          return {
            status: 404,
            body: { error: `Game not found: ${flowId}` },
          }
        }

        // Check if game is complete
        if (flowState.metadata?.status !== 'completed') {
          return {
            status: 425,
            body: {
              error: 'Game is still generating',
              status: flowState.metadata?.status,
            },
          }
        }

        // Check if we have code
        if (!flowState.code) {
          return {
            status: 404,
            body: { error: 'Game code not found' },
          }
        }

        return {
          status: 200,
          body: {
            flowId,
            gameTitle: flowState.spec?.title || 'Untitled',
            status: 'completed',
            files: flowState.code.files?.map((f: any) => ({
              filename: f.filename,
              content: f.content,
            })) || [],
            mainFile: flowState.code.mainEntrypoint || 'main.py',
            runInstructions: flowState.code.runInstructions || 'python main.py',
            metadata: {
              genre: flowState.spec?.genre || 'Unknown',
              complexity: flowState.spec?.complexity || 'Unknown',
              qaScore: flowState.qaReport?.overallScore,
              qualityGrade: flowState.finalValidation?.qualityGrade,
              generatedAt: flowState.metadata?.completedAt || flowState.metadata?.updatedAt,
              revisionCount: flowState.metadata?.revisionCount || 0,
            },
            design: flowState.design ? {
              overview: flowState.design.overview || '',
              dependencies: flowState.design.dependencies || [],
              architectNotes: flowState.design.architectNotes || '',
            } : undefined,
          },
        }
      } catch (error: any) {
        ctx.logger.error('Failed to get game details', { error: error.message })
        return {
          status: 500,
          body: { error: 'Failed to get game details' },
        }
      }
    }
  )

  return {
    dirname: path.join(__dirname, 'plugins'),
    workbench: [
      {
        componentName: 'default',
        packageName: '~/plugins/components/game-viewer',
        label: 'Game Viewer',
        labelIcon: 'gamepad-2',
        position: 'bottom',
      },
    ],
  }
}

const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = process.env.REDIS_PORT || '6379'
const redisPassword = process.env.REDIS_PASSWORD
const redisUsername = process.env.REDIS_USERNAME
const redisDatabase = process.env.REDIS_DATABASE || '0'

let redisUrl = `redis://${redisHost}:${redisPort}/${redisDatabase}`
if (redisUsername && redisPassword) {
  redisUrl = `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}/${redisDatabase}`
} else if (redisPassword) {
  redisUrl = `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDatabase}`
}

export default config({
  plugins: [
    observabilityPlugin,
    statesPlugin,
    endpointPlugin,
    logsPlugin,
    bullmqPlugin,
    gameViewerPlugin,
  ],
  adapters: {
    state: new RedisStateAdapter(
      { url: redisUrl },
      {
        keyPrefix: process.env.STATE_KEY_PREFIX || 'motia:game-gen:state:',
        ttl: parseInt(process.env.STATE_TTL || '86400'),
      }
    ),
    cron: new RedisCronAdapter(
      { url: redisUrl },
      {
        keyPrefix: process.env.CRON_KEY_PREFIX || 'motia:game-gen:cron:lock:',
        lockTTL: parseInt(process.env.CRON_LOCK_TTL || '300000'),
      }
    ),
    streams: new RedisStreamAdapterManager({ url: redisUrl }),
  },
})
