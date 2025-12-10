/**
 * AI App Generator Plugin
 * 
 * Adds a workbench component for triggering app generation workflows
 * and viewing real-time progress.
 */

import path from 'node:path';
import type { MotiaPlugin, MotiaPluginContext } from 'motia';

export default function appGeneratorPlugin(motia: MotiaPluginContext): MotiaPlugin {
  // Register a custom API endpoint for quick status check
  motia.registerApi(
    {
      method: 'GET',
      path: '/__motia/app-generator/health',
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          plugin: 'app-generator',
          status: 'healthy',
          version: '1.0.0',
          agents: [
            'architect',
            'engineer',
            'test-designer',
            'test-executor',
            'code-refiner',
            'project-manager',
            'designer',
            'assembly',
          ],
          endpoints: {
            generate: 'POST /apps/generate',
            status: 'GET /apps/:flowId/status',
            download: 'GET /apps/:flowId/download',
            downloadZip: 'GET /apps/:flowId/download/zip',
            list: 'GET /apps',
          },
        },
      };
    }
  );

  return {
    dirname: path.join(__dirname),
    workbench: [
      {
        componentName: 'AppGeneratorPanel',
        packageName: '~/plugins/app-generator/components/app-generator-panel',
        label: 'AI App Generator',
        labelIcon: 'sparkles',
        position: 'top',
      },
    ],
  };
}
