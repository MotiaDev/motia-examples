/**
 * Ad Generator UI Plugin
 *
 * Adds a workbench component for generating AI-powered ads from landing page URLs.
 */

import path from "node:path";
import type { MotiaPlugin, MotiaPluginContext } from "motia";

export default function adGeneratorPlugin(
  motia: MotiaPluginContext
): MotiaPlugin {
  // Register a health check endpoint for the plugin
  motia.registerApi(
    {
      method: "GET",
      path: "/__motia/ad-generator/health",
    },
    async (_req, _ctx) => {
      return {
        status: 200,
        body: {
          plugin: "ad-generator-ui",
          status: "healthy",
          version: "1.0.0",
          features: [
            "url-to-ad-generation",
            "instagram-support",
            "tiktok-support",
            "image-generation",
            "video-generation",
          ],
        },
      };
    }
  );

  return {
    dirname: path.join(__dirname),
    workbench: [
      {
        componentName: "AdGeneratorPanel",
        packageName: "~/plugins/ad-generator-ui/components/ad-generator-panel",
        label: "Ad Generator",
        labelIcon: "sparkles",
        position: "top",
      },
    ],
  };
}
