import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')
const bullmqPlugin = require('@motiadev/plugin-bullmq/plugin')

/**
 * Custom plugin for testing the Airbnb Guest Assistant workflow
 * directly from the Motia Workbench UI.
 */
function airbnbTesterPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register a health check endpoint for the plugin
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/airbnb-tester/health',
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: { 
          status: 'healthy',
          plugin: 'airbnb-tester',
          version: '1.0.0'
        },
      }
    },
  )

  // Register an endpoint to get sample data for testing
  motia.registerApi(
    {
      method: 'GET', 
      path: '/__motia/airbnb-tester/samples',
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          sample_documents: [
            {
              url: 'https://raw.githubusercontent.com/airbnb/javascript/master/README.md',
              doc_type: 'house_manual',
              description: 'Sample Markdown document'
            }
          ],
          sample_questions: [
            'What time is checkout?',
            'How do I use the WiFi?',
            'Where are the extra towels?',
            'Is there parking available?',
            'How do I use the induction stove?',
            'What are the house rules?',
            'How do I contact the host?',
            'What is the fastest way to the airport?'
          ],
          doc_types: [
            { value: 'house_manual', label: 'House Manual' },
            { value: 'local_guide', label: 'Local Guide' },
            { value: 'appliance_manual', label: 'Appliance Manual' },
            { value: 'policy', label: 'Policy' }
          ]
        }
      }
    }
  )

  return {
    dirname: path.join(__dirname, 'plugins'),
    workbench: [
      {
        componentName: 'AirbnbTester',
        packageName: '~/plugins/components/airbnb-tester',
        label: 'Airbnb Tester',
        position: 'top',
        labelIcon: 'home',
      },
    ],
  }
}

export default config({
  plugins: [
    observabilityPlugin, 
    statesPlugin, 
    endpointPlugin, 
    logsPlugin, 
    bullmqPlugin,
    airbnbTesterPlugin  // Add our custom testing plugin
  ],
})
