import { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'ServeVideo',
  description: 'Serves generated video files',
  path: '/videos/:filename',
  method: 'GET',
  emits: [],
  flows: ['github-stars-video'],
  responseSchema: {
    200: z.any(),
    404: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers['ServeVideo'] = async (req, { logger }) => {
  try {
    const { filename } = req.pathParams;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return {
        status: 404,
        body: { error: 'Invalid filename' },
      };
    }
    
    const videoPath = path.join(process.cwd(), 'public', 'videos', filename);
    
    // Check if file exists
    try {
      await fs.access(videoPath);
    } catch {
      logger.error('Video file not found', { filename, videoPath });
      return {
        status: 404,
        body: { error: 'Video not found' },
      };
    }
    
    // Read file
    const videoBuffer = await fs.readFile(videoPath);
    
    logger.info('Serving video', { filename, size: videoBuffer.length });
    
    // Return video with proper headers
    return {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      },
      body: videoBuffer,
    };
  } catch (error: any) {
    logger.error('Failed to serve video', { error: error.message });
    return {
      status: 404,
      body: { error: 'Failed to serve video' },
    };
  }
};

