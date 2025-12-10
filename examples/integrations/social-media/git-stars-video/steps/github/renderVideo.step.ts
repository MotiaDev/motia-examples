import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';

const inputSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  jobId: z.string(),
  starData: z.object({
    user: z.string(),
    userAvatarUrl: z.string(),
    repository: z.string(),
    stars: z.number(),
    stargazers: z.array(z.string()),
  }),
  theme: z.enum(['dark', 'light']).optional().default('dark'),
});

export const config: EventConfig = {
  type: 'event',
  name: 'RenderVideo',
  description: 'Renders video using Remotion after star data is processed',
  subscribes: ['render-video'],
  emits: [],
  input: inputSchema,
  flows: ['github-stars-video'],
};

export const handler: Handlers['RenderVideo'] = async (input, { logger, state }) => {
  const { owner, repo, jobId, starData, theme } = input;

  try {
    logger.info('Starting video render', { owner, repo, jobId, theme });

    // Update job status to rendering
    await state.set('job', jobId, {
      status: 'rendering',
      owner,
      repo,
      updatedAt: new Date().toISOString(),
    });

    // Bundle Remotion project (using inline styles)
    logger.info('Starting bundle process');
    
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'remotion/index.ts'),
    });
    
    logger.info('Bundle completed', { bundleLocation });

    // Get composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'GitHubStars',
      inputProps: { ...starData, theme },
    });

    logger.info('Composition selected', {
      width: composition.width,
      height: composition.height,
      fps: composition.fps,
      durationInFrames: composition.durationInFrames,
    });

    // Create output directory
    const outputDir = path.join(process.cwd(), 'public', 'videos');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${owner}-${repo}-${Date.now()}.mp4`);

    // Render video with Remotion (v4.0.372+ handles new Chrome headless mode automatically)
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { ...starData, theme },
      // High quality video settings (using CRF for quality control)
      crf: 18, // Lower CRF = higher quality (18 is visually lossless, default is 23)
      pixelFormat: 'yuv420p', // Standard format for broad compatibility
      // Image & rendering settings
      imageFormat: 'jpeg',
      scale: 1, // Full quality, no downscaling
      everyNthFrame: 1, // Render every frame
      numberOfGifLoops: null,
      envVariables: {}, // Pass any env vars if needed
      timeoutInMilliseconds: 300000, // 5 min timeout
      chromiumOptions: {
        // Ensure images load
        disableWebSecurity: false,
        ignoreCertificateErrors: false,
      },
      onProgress: ({ progress }: { progress: number }) => {
        if (progress % 0.1 < 0.01) { // Log every 10%
          logger.info('Rendering progress', {
            progress: `${(progress * 100).toFixed(1)}%`,
          });
        }
      },
    });

    logger.info('Video rendered successfully', { outputPath });

    // Generate public URL
    const videoUrl = `/videos/${path.basename(outputPath)}`;

    // Update job status to completed
    await state.set('job', jobId, {
      status: 'completed',
      owner,
      repo,
      completedAt: new Date().toISOString(),
      videoUrl,
      data: starData,
    });

    logger.info('Video render complete', { jobId, videoUrl });
  } catch (error: any) {
    logger.error('Failed to render video', {
      error: error.message,
      stack: error.stack,
    });

    // Update job status to failed
    await state.set('job', jobId, {
      status: 'failed',
      owner,
      repo,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
};

