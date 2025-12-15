import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MotiaPlugin, MotiaPluginContext } from 'motia'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Todo Tester Plugin
 *
 * Provides a quick testing interface for the Todo API.
 * Registers test endpoints and adds a Workbench panel with preset test cases.
 */
export default function todoTesterPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register a test health endpoint
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/todo-tester/health',
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          message: 'Todo Tester Plugin is running',
        },
      }
    }
  )

  // Register endpoint to get test presets
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/todo-tester/presets',
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          presets: [
            {
              name: 'Create High Priority Todo',
              method: 'POST',
              path: '/todos',
              body: {
                title: 'Urgent: Review PR',
                description: 'Review the authentication PR before release',
                priority: 'high',
              },
            },
            {
              name: 'Create Medium Priority Todo',
              method: 'POST',
              path: '/todos',
              body: {
                title: 'Update documentation',
                description: 'Add API documentation for new endpoints',
                priority: 'medium',
              },
            },
            {
              name: 'Create Low Priority Todo',
              method: 'POST',
              path: '/todos',
              body: {
                title: 'Refactor utils',
                priority: 'low',
              },
            },
            {
              name: 'List All Todos',
              method: 'GET',
              path: '/todos',
            },
            {
              name: 'List Pending Todos',
              method: 'GET',
              path: '/todos?status=pending',
            },
            {
              name: 'List Completed Todos',
              method: 'GET',
              path: '/todos?status=completed',
            },
            {
              name: 'Get Todo Stats',
              method: 'GET',
              path: '/todo-stats',
            },
          ],
        },
      }
    }
  )

  // Register endpoint to run a full test suite
  motia.registerApi(
    {
      method: 'POST',
      path: '/__motia/todo-tester/run-suite',
    },
    async (_req, ctx) => {
      const results: Array<{
        test: string
        success: boolean
        response?: unknown
        error?: string
      }> = []

      try {
        // Test 1: Create a todo
        ctx.logger.info('Running test: Create Todo')
        const createResponse = await fetch('http://localhost:3000/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Todo ' + Date.now(),
            description: 'Created by test suite',
            priority: 'high',
          }),
        })
        const createData = await createResponse.json()
        results.push({
          test: 'Create Todo',
          success: createResponse.ok,
          response: createData,
        })

        // Test 2: List todos
        ctx.logger.info('Running test: List Todos')
        const listResponse = await fetch('http://localhost:3000/todos')
        const listData = await listResponse.json()
        results.push({
          test: 'List Todos',
          success: listResponse.ok,
          response: { count: listData.count },
        })

        // Test 3: Get stats
        ctx.logger.info('Running test: Get Stats')
        const statsResponse = await fetch('http://localhost:3000/todo-stats')
        const statsData = await statsResponse.json()
        results.push({
          test: 'Get Stats',
          success: statsResponse.ok,
          response: statsData,
        })

        // Test 4: Update todo (if we have one)
        if (createData.id) {
          ctx.logger.info('Running test: Update Todo')
          const updateResponse = await fetch(`http://localhost:3000/todos/${createData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          })
          const updateData = await updateResponse.json()
          results.push({
            test: 'Update Todo (Complete)',
            success: updateResponse.ok,
            response: { status: updateData.status },
          })

          // Test 5: Delete todo
          ctx.logger.info('Running test: Delete Todo')
          const deleteResponse = await fetch(`http://localhost:3000/todos/${createData.id}`, {
            method: 'DELETE',
          })
          const deleteData = await deleteResponse.json()
          results.push({
            test: 'Delete Todo',
            success: deleteResponse.ok,
            response: deleteData,
          })
        }
      } catch (error) {
        results.push({
          test: 'Test Suite',
          success: false,
          error: String(error),
        })
      }

      const passed = results.filter((r) => r.success).length
      const failed = results.filter((r) => !r.success).length

      return {
        status: 200,
        body: {
          summary: {
            total: results.length,
            passed,
            failed,
            status: failed === 0 ? 'PASSED' : 'FAILED',
          },
          results,
        },
      }
    }
  )

  return {
    dirname: __dirname,
    workbench: [
      {
        componentName: 'TodoTesterPanel',
        packageName: '~/plugins/todo-tester/components/todo-tester-panel.tsx',
        label: 'Todo',
        position: 'top',
        labelIcon: 'check-square',
      },
    ],
  }
}
