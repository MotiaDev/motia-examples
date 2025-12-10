import { config } from '@motiadev/core'
import path from 'node:path'
const statesPlugin = require('@motiadev/plugin-states/plugin')
const endpointPlugin = require('@motiadev/plugin-endpoint/plugin')
const logsPlugin = require('@motiadev/plugin-logs/plugin')
const observabilityPlugin = require('@motiadev/plugin-observability/plugin')
const bullmqPlugin = require('@motiadev/plugin-bullmq/plugin')
import appGeneratorPlugin from './plugins/app-generator'

export default config({
  plugins: [
    observabilityPlugin, 
    statesPlugin, 
    endpointPlugin, 
    logsPlugin, 
    bullmqPlugin,
    appGeneratorPlugin,
  ],
})
