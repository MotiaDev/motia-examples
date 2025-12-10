import * as path from 'path';
import * as fs from 'fs';

export const config = {
  type: 'api',
  name: 'ServeStatic',
  path: '/js/:filename',
  method: 'GET',
  emits: ['static-file-served'],
  flows: ['research-assistant']
}

export const handler = async (request: any, { emit }: { emit: any }) => {
  try {
    const { filename } = request.params;
    console.log(`ServeStatic: Serving static file ${filename}`);
    
    // Construct the file path
    const filePath = path.join(process.cwd(), 'public', 'js', filename);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return {
        status: 404,
        body: { error: 'File not found' }
      };
    }
    
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Emit the event
    await emit({
      topic: 'static-file-served',
      data: {
        path: `/js/${filename}`,
        servedAt: new Date().toISOString()
      }
    });
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache'
      },
      body: content
    };
  } catch (error) {
    console.error(`Error serving static file:`, error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
}
