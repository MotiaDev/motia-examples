/**
 * Assembly Agent Event Step
 * 
 * The Assembly agent that:
 * - Collects all generated and tested modules
 * - Creates build configuration (package.json, vite.config, etc.)
 * - Generates Dockerfile and environment templates
 * - Bundles everything into a deployable structure
 * - Streams final output to user
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  DesignDocumentSchema,
  CodeModuleSchema,
  type FinalOutput,
  type GeneratedFile,
} from '../../../src/types/app-generator.types';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  designDocument: DesignDocumentSchema,
  modules: z.array(CodeModuleSchema),
});

export const config: EventConfig = {
  type: 'event',
  name: 'AssemblyAgent',
  description: 'Assembly agent that bundles all code into a deployable application',
  subscribes: ['all_modules.coded', 'all_modules.tested'],
  emits: [
    { topic: 'app_generation.completed', label: 'Application ready for download' },
    { topic: 'app_generation.failed', label: 'Assembly failed', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['AssemblyAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, designDocument, modules } = input;
  
  logger.info('Assembly Agent started', { 
    flowId, 
    modulesCount: modules.length,
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-assembly-start`, createProgressEvent({
    flowId,
    phase: 'assembling',
    agent: 'assembly',
    message: 'Assembling final application bundle...',
    progress: 85,
    details: {
      totalModules: modules.length,
    },
  }));

  try {
    const appSpec = designDocument.appSpec;
    const techStack = appSpec.techPreferences || {};
    
    // Collect all files from modules
    const allFiles: GeneratedFile[] = [];
    for (const module of modules) {
      allFiles.push(...module.files);
    }

    // Generate build configuration files
    const configFiles = generateConfigFiles(appSpec, techStack, designDocument);
    allFiles.push(...configFiles);

    // Generate README
    const readme = generateReadme(appSpec, designDocument, modules);
    allFiles.push(readme);

    // Calculate totals
    const totalLines = allFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0);

    // Create final output
    const finalOutput: FinalOutput = {
      flowId,
      appSpec,
      files: allFiles,
      buildConfig: {
        packageJson: configFiles.find(f => f.path === 'package.json')?.content || '',
        tsconfig: configFiles.find(f => f.path === 'tsconfig.json')?.content,
        viteConfig: configFiles.find(f => f.path === 'vite.config.ts')?.content,
        dockerfile: configFiles.find(f => f.path === 'Dockerfile')?.content,
        envTemplate: configFiles.find(f => f.path === '.env.example')?.content || '',
      },
      readme: readme.content,
      totalFiles: allFiles.length,
      totalLines,
      generatedAt: new Date().toISOString(),
    };

    // Store final output
    await state.set('outputs', flowId, finalOutput);

    // Update workflow state to completed
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'completed';
      workflowState.artifacts.codeBundle = flowId;
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Stream config files
    for (const file of configFiles) {
      await streams.generatedFiles.set(flowId, file.path, {
        id: file.path,
        flowId,
        path: file.path,
        content: file.content,
        language: file.language,
        moduleType: file.moduleType,
        status: 'completed',
        generatedAt: file.generatedAt,
        linesOfCode: file.content.split('\n').length,
      });
    }

    // Update final progress
    await streams.appGenerationProgress.set(flowId, `${flowId}-assembly-complete`, createProgressEvent({
      flowId,
      phase: 'completed',
      agent: 'assembly',
      message: `Application "${appSpec.title}" generated successfully! ${allFiles.length} files, ${totalLines} lines of code.`,
      progress: 100,
      details: {
        totalModules: modules.length,
        modulesCompleted: modules.length,
      },
    }));

    // Emit completion
    await emit({
      topic: 'app_generation.completed',
      data: {
        flowId,
        finalOutput,
      },
    });

    logger.info('Assembly Agent completed', { 
      flowId, 
      totalFiles: allFiles.length,
      totalLines,
    });

  } catch (error: any) {
    logger.error('Assembly Agent failed', { flowId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-assembly-failed`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'assembly',
      message: `Assembly failed: ${error.message}`,
      progress: 0,
    }));

    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'failed';
      workflowState.errors.push({
        phase: 'assembly',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      await state.set('workflows', flowId, workflowState);
    }

    await emit({
      topic: 'app_generation.failed',
      data: { flowId, phase: 'assembly', error: error.message },
    });
  }
};

function generateConfigFiles(appSpec: any, techStack: any, designDocument: any): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const timestamp = new Date().toISOString();
  const appName = appSpec.title.toLowerCase().replace(/\s+/g, '-');

  // package.json
  files.push({
    path: 'package.json',
    content: JSON.stringify({
      name: appName,
      version: '1.0.0',
      description: appSpec.description,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
        test: 'vitest',
        'test:coverage': 'vitest --coverage',
        lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      },
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        ...(techStack.stateManagement === 'zustand' ? { zustand: '^4.4.0' } : {}),
        ...(techStack.stateManagement === 'redux' ? { '@reduxjs/toolkit': '^2.0.0', 'react-redux': '^9.0.0' } : {}),
      },
      devDependencies: {
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        '@vitejs/plugin-react': '^4.2.0',
        typescript: '^5.3.0',
        vite: '^5.0.0',
        vitest: '^1.0.0',
        '@testing-library/react': '^14.1.0',
        '@testing-library/jest-dom': '^6.1.0',
        autoprefixer: '^10.4.16',
        postcss: '^8.4.32',
        tailwindcss: '^3.4.0',
        eslint: '^8.55.0',
        '@typescript-eslint/eslint-plugin': '^6.14.0',
        '@typescript-eslint/parser': '^6.14.0',
      },
    }, null, 2),
    language: 'json',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src'],
      references: [{ path: './tsconfig.node.json' }],
    }, null, 2),
    language: 'json',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // vite.config.ts
  files.push({
    path: 'vite.config.ts',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
`,
    language: 'typescript',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // tailwind.config.js
  const colors = designDocument.uiGuidelines?.colorScheme || ['#6366f1', '#8b5cf6', '#a855f7'];
  files.push({
    path: 'tailwind.config.js',
    content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '${colors[0] || '#6366f1'}',
        secondary: '${colors[1] || '#8b5cf6'}',
        accent: '${colors[2] || '#a855f7'}',
      },
      fontFamily: {
        heading: ['${designDocument.uiGuidelines?.typography?.headingFont || 'Inter'}', 'sans-serif'],
        body: ['${designDocument.uiGuidelines?.typography?.bodyFont || 'Inter'}', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
`,
    language: 'javascript',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // postcss.config.js
  files.push({
    path: 'postcss.config.js',
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
    language: 'javascript',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // index.html
  files.push({
    path: 'index.html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appSpec.title}</title>
    <meta name="description" content="${appSpec.description}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    language: 'html',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // .env.example
  files.push({
    path: '.env.example',
    content: `# ${appSpec.title} Environment Variables
# Copy this file to .env and fill in your values

# API Configuration
VITE_API_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_ANALYTICS=false
`,
    language: 'yaml',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // Dockerfile
  files.push({
    path: 'Dockerfile',
    content: `# Build stage
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`,
    language: 'yaml',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // nginx.conf
  files.push({
    path: 'nginx.conf',
    content: `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
`,
    language: 'yaml',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // .gitignore
  files.push({
    path: '.gitignore',
    content: `# Dependencies
node_modules/

# Build output
dist/

# Environment variables
.env
.env.local
.env.*.local

# Editor directories
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
`,
    language: 'yaml',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  return files;
}

function generateReadme(appSpec: any, designDocument: any, modules: any[]): GeneratedFile {
  const timestamp = new Date().toISOString();
  
  const content = `# ${appSpec.title}

${appSpec.description}

## Features

${appSpec.features.map((f: string) => `- ${f}`).join('\n')}

## Tech Stack

- **Frontend**: ${appSpec.techPreferences?.frontend || 'React'} with TypeScript
- **Styling**: ${appSpec.techPreferences?.styling || 'Tailwind CSS'}
- **State Management**: ${appSpec.techPreferences?.stateManagement || 'Zustand'}
- **Build Tool**: ${appSpec.techPreferences?.buildTool || 'Vite'}
- **Testing**: ${appSpec.techPreferences?.testing || 'Vitest'}

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${appSpec.title.toLowerCase().replace(/\s+/g, '-')}

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
\`\`\`

### Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run test\` - Run tests
- \`npm run lint\` - Lint code

## Project Structure

\`\`\`
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── services/       # API services
├── types/          # TypeScript types
├── utils/          # Utility functions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
\`\`\`

## Components

${modules.filter(m => m.name !== 'Base Configuration').map(m => `### ${m.name}\n${m.description}`).join('\n\n')}

## Docker Deployment

\`\`\`bash
# Build image
docker build -t ${appSpec.title.toLowerCase().replace(/\s+/g, '-')} .

# Run container
docker run -p 80:80 ${appSpec.title.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

## Generated By

This application was generated by the AI App Generator powered by Motia.

- **Genre**: ${appSpec.genre}
- **Target Audience**: ${appSpec.targetAudience || 'General users'}
- **Generated**: ${new Date().toLocaleDateString()}

## License

MIT License
`;

  return {
    path: 'README.md',
    content,
    language: 'markdown',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  };
}

