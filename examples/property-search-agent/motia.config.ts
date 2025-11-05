import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')

// Property Dashboard Plugin
function propertyDashboardPlugin(motia: MotiaPluginContext): MotiaPlugin {
  return {
    dirname: path.join(__dirname, 'plugins'),
    workbench: [
      {
        componentName: 'PropertyDashboard',
        packageName: '~/plugins/property-dashboard',
        label: 'Property Search',
        position: 'top',
        labelIcon: 'building-2',
      },
    ],
  }
}

export default config({
  plugins: [
    statesPlugin, 
    endpointPlugin, 
    logsPlugin, 
    observabilityPlugin,
    propertyDashboardPlugin,
  ],
})
