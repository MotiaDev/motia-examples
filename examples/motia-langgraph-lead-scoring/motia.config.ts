import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')
const bullmqPlugin = require('@motiadev/plugin-bullmq/plugin')

/**
 * Lead Flow Dashboard Plugin
 * Provides a Workbench UI for managing the lead scoring workflow
 * Uses the real API endpoints - no duplicate test endpoints
 */
function leadFlowDashboardPlugin(_motia: MotiaPluginContext): MotiaPlugin {
  return {
    dirname: path.join(__dirname, 'plugins', 'lead-flow-dashboard'),
    steps: [], // No custom steps - uses real flow endpoints
    workbench: [
      {
        componentName: 'LeadFlowDashboard',
        packageName: '~/plugins/lead-flow-dashboard/components/LeadFlowDashboard',
        label: 'Lead Flow Dashboard',
        position: 'top',
        labelIcon: 'users',
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
    leadFlowDashboardPlugin,
  ],
})
