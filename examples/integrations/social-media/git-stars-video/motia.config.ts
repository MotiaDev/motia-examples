import path from 'node:path'
import { config, type MotiaPlugin, type MotiaPluginContext } from '@motiadev/core'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')

function githubStarsPlugin(motia: MotiaPluginContext): MotiaPlugin {
  return {
    dirname: path.join(__dirname, 'plugins/plugin-github-stars'),
    workbench: [
      {
        packageName: '~/plugins/plugin-github-stars',
        componentName: 'GitHubStarsUI',
        label: 'GitHub Stars',
        labelIcon: 'star',
        position: 'top',
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
    githubStarsPlugin,
  ],
})
