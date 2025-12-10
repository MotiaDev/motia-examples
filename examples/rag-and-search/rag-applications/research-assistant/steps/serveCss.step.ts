import * as path from 'path';
import * as fs from 'fs';

export const config = {
  type: 'api',
  name: 'ServeCss',
  path: '/css/:filename',
  method: 'GET',
  emits: ['css-file-served'],
  flows: ['research-assistant']
}

export const handler = async (request: any, { emit }: { emit: any }) => {
  try {
    const { filename } = request.params;
    console.log(`ServeCss: Serving CSS file ${filename}`);
    
    // Construct the file path
    const filePath = path.join(process.cwd(), 'public', 'css', filename);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`CSS file not found: ${filePath}`);
      return {
        status: 404,
        body: { error: 'CSS file not found' }
      };
    }
    
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Emit the event
    await emit({
      topic: 'css-file-served',
      data: {
        path: `/css/${filename}`,
        servedAt: new Date().toISOString()
      }
    });
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-cache'
      },
      body: content
    };
  } catch (error) {
    console.error(`Error serving CSS file:`, error);
    return {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
}
