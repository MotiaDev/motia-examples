/**
 * Ad Generator UI Plugin
 *
 * Adds a workbench component for generating AI-powered ads from landing page URLs.
 */

import path from "node:path";
import fs from "node:fs";
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

  // Register endpoint to serve output files (images and videos)
  motia.registerApi(
    {
      method: "GET",
      path: "/outputs/:filename",
    },
    async (req, _ctx) => {
      const { filename } = req.pathParams as { filename: string };

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(filename);
      const outputsDir = path.join(process.cwd(), "outputs");
      const filePath = path.join(outputsDir, sanitizedFilename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return {
          status: 404,
          body: { error: "File not found" },
        };
      }

      // Read file and determine content type
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(sanitizedFilename).toLowerCase();

      let contentType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") {
        contentType = "image/jpeg";
      } else if (ext === ".png") {
        contentType = "image/png";
      } else if (ext === ".gif") {
        contentType = "image/gif";
      } else if (ext === ".webp") {
        contentType = "image/webp";
      } else if (ext === ".mp4") {
        contentType = "video/mp4";
      } else if (ext === ".webm") {
        contentType = "video/webm";
      }

      return {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
        body: fileBuffer,
      };
    }
  );

  return {
    dirname: path.join(__dirname),
    workbench: [
      {
        componentName: "AdGeneratorPanel",
        packageName: "~/plugins/ad-generator-ui/components/ad-generator-panel.tsx",
        label: "Ad Generator",
        labelIcon: "sparkles",
        position: "top",
      },
    ],
  };
}
