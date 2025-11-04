import { config } from '@motiadev/core'
import apiTesterPlugin from './plugins/api-tester/plugin'

const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')

export default config({
  plugins: [
    apiTesterPlugin,
    statesPlugin,
    endpointPlugin,
    logsPlugin,
    observabilityPlugin,
  ],
})
