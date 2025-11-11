import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')

function mortgageAlertPlugin(motia: MotiaPluginContext): MotiaPlugin {
  return {
    dirname: path.join(__dirname, 'plugins/plugin-mortgage-alert'),
    workbench: [
      {
        packageName: '~/plugins/plugin-mortgage-alert',
        componentName: 'MortgageAlertUI',
        label: 'Mortgage Alerts',
        labelIcon: 'home',
        position: 'top',
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
    mortgageAlertPlugin,
  ],
})
