import path from 'node:path'
import type { MotiaPlugin, MotiaPluginContext } from '@motiadev/core'

export default function apiTesterPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register API endpoint to proxy requests (to avoid CORS issues)
  motia.registerApi(
    {
      method: 'POST',
      path: '/__motia/api-tester/proxy',
    },
    async (req, ctx) => {
      try {
        const { method, url, headers, body } = req.body as any
        
        const startTime = Date.now()
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        })
        
        const endTime = Date.now()
        const responseData = await response.text()
        
        let parsedData
        try {
          parsedData = JSON.parse(responseData)
        } catch {
          parsedData = responseData
        }

        return {
          status: 200,
          body: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: parsedData,
            time: endTime - startTime,
          },
        }
      } catch (error: any) {
        return {
          status: 500,
          body: {
            error: error.message,
            status: 0,
          },
        }
      }
    },
  )

  // Register endpoint to save/load requests
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/api-tester/saved-requests',
    },
    async (req, ctx) => {
      const requests = await motia.state.get('api-tester-requests') || []
      return {
        status: 200,
        body: requests,
      }
    },
  )

  motia.registerApi(
    {
      method: 'POST',
      path: '/__motia/api-tester/saved-requests',
    },
    async (req, ctx) => {
      const request = req.body
      const requests = await motia.state.get('api-tester-requests') || []
      requests.push({ ...request, id: Date.now(), savedAt: new Date().toISOString() })
      await motia.state.set('api-tester-requests', requests)
      
      return {
        status: 200,
        body: { success: true },
      }
    },
  )

  motia.registerApi(
    {
      method: 'DELETE',
      path: '/__motia/api-tester/saved-requests/:id',
    },
    async (req, ctx) => {
      const id = parseInt(req.params.id)
      const requests = await motia.state.get('api-tester-requests') || []
      const filtered = requests.filter((r: any) => r.id !== id)
      await motia.state.set('api-tester-requests', filtered)
      
      return {
        status: 200,
        body: { success: true },
      }
    },
  )

  return {
    dirname: path.join(__dirname, '../..'),
    workbench: [
      {
        componentName: 'ApiTester',
        packageName: '~/plugins/api-tester',
        label: 'API Tester',
        position: 'top',
        labelIcon: 'bug-play',
      },
    ],
  }
}

