/**
 * Engineer Agent Event Step
 * 
 * The Engineer agent that:
 * - Receives design documents from the Architect
 * - Generates code for each module/component
 * - Outputs complete, working TypeScript/React code
 * 
 * Uses Claude Opus for high-quality code generation without truncation.
 */

import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import { 
  DesignDocumentSchema,
  type CodeModule,
  type GeneratedFile,
  type ComponentSpec,
} from '../../../src/types/app-generator.types';
import { generateForAgent } from '../../../src/services/llm';
import { createProgressEvent } from '../../../src/services/progress.service';

const inputSchema = z.object({
  flowId: z.string(),
  designDocument: DesignDocumentSchema,
});

export const config: EventConfig = {
  type: 'event',
  name: 'EngineerAgent',
  description: 'AI Engineer agent that generates complete application code from design documents',
  subscribes: ['app_design.completed'],
  emits: [
    { topic: 'module_coding.completed', label: 'Module code ready for testing' },
    { topic: 'all_modules.coded', label: 'All modules coded, triggers assembly' },
    { topic: 'app_generation.failed', label: 'Code generation failed', conditional: true },
  ],
  flows: ['app-generator'],
  input: inputSchema,
};

export const handler: Handlers['EngineerAgent'] = async (input, { emit, logger, state, streams }) => {
  const { flowId, designDocument } = input;
  
  logger.info('Engineer Agent started', { 
    flowId, 
    componentsToCode: designDocument.components.length 
  });

  // Update progress
  await streams.appGenerationProgress.set(flowId, `${flowId}-engineer-start`, createProgressEvent({
    flowId,
    phase: 'coding',
    agent: 'engineer',
    message: 'Engineer agent starting code generation...',
    progress: 25,
    details: {
      totalModules: designDocument.components.length,
      modulesCompleted: 0,
    },
  }));

  try {
    const modules: CodeModule[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    // Sort components by priority
    const sortedComponents = [...designDocument.components].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Generate base files first (types, utils, config)
    const baseModule = await generateBaseFiles(flowId, designDocument, logger);
    modules.push(baseModule);
    totalTokens += baseModule.files.length * 500; // Estimate for base files

    // Stream base files
    for (const file of baseModule.files) {
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

    // Generate code for each component
    for (let i = 0; i < sortedComponents.length; i++) {
      const component = sortedComponents[i];
      
      logger.info('Generating code for component', { 
        flowId, 
        component: component.name,
        index: i + 1,
        total: sortedComponents.length,
      });

      // Update progress
      await streams.appGenerationProgress.set(flowId, `${flowId}-engineer-${i}`, createProgressEvent({
        flowId,
        phase: 'coding',
        agent: 'engineer',
        message: `Generating code for ${component.name}...`,
        progress: 25 + Math.round((i / sortedComponents.length) * 25),
        details: {
          currentModule: component.name,
          totalModules: sortedComponents.length,
          modulesCompleted: i,
        },
      }));

      // Generate component code using LLM
      const codePrompt = buildCodePrompt(component, designDocument);
      
      const response = await generateForAgent('engineer', [
        { role: 'system', content: ENGINEER_SYSTEM_PROMPT },
        { role: 'user', content: codePrompt },
      ]);

      totalTokens += response.usage.totalTokens;
      totalCost += response.estimatedCost;

      // Parse generated files
      const generatedFiles = parseGeneratedCode(response.content, component, flowId);
      
      const module: CodeModule = {
        id: `${flowId}-${component.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: component.name,
        description: component.description,
        files: generatedFiles,
        dependencies: component.dependencies,
        status: 'generated',
        iteration: 1,
      };

      modules.push(module);

      // Stream generated files
      for (const file of generatedFiles) {
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

      // Emit module completion for test designer
      await emit({
        topic: 'module_coding.completed',
        data: {
          flowId,
          moduleId: module.id,
          codeModule: module,
        },
      });
    }

    // Update workflow state
    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'coding';
      workflowState.modules = modules;
      workflowState.metrics.totalTokens += totalTokens;
      workflowState.metrics.estimatedCost += totalCost;
      workflowState.updatedAt = new Date().toISOString();
      await state.set('workflows', flowId, workflowState);
    }

    // Update final progress
    await streams.appGenerationProgress.set(flowId, `${flowId}-engineer-complete`, createProgressEvent({
      flowId,
      phase: 'coding',
      agent: 'engineer',
      message: `Code generation completed. ${modules.length} modules created.`,
      progress: 50,
      details: {
        totalModules: modules.length,
        modulesCompleted: modules.length,
        tokensUsed: totalTokens,
        estimatedCost: totalCost,
      },
    }));

    // Emit all modules coded event
    await emit({
      topic: 'all_modules.coded',
      data: {
        flowId,
        designDocument,
        modules,
      },
    });

    logger.info('Engineer Agent completed', { 
      flowId, 
      modulesGenerated: modules.length,
      totalTokens,
      totalCost,
    });

  } catch (error: any) {
    logger.error('Engineer Agent failed', { flowId, error: error.message });

    await streams.appGenerationProgress.set(flowId, `${flowId}-engineer-failed`, createProgressEvent({
      flowId,
      phase: 'failed',
      agent: 'engineer',
      message: `Code generation failed: ${error.message}`,
      progress: 0,
    }));

    const workflowState = await state.get<any>('workflows', flowId);
    if (workflowState) {
      workflowState.status = 'failed';
      workflowState.errors.push({
        phase: 'coding',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      await state.set('workflows', flowId, workflowState);
    }

    await emit({
      topic: 'app_generation.failed',
      data: { flowId, phase: 'coding', error: error.message },
    });
  }
};

const ENGINEER_SYSTEM_PROMPT = `You are an expert software engineer specializing in React, TypeScript, and modern web development.

Your task is to generate complete, production-ready code. Output multiple files in the following format:

===FILE: path/to/file.tsx===
// File content here
===END FILE===

===FILE: path/to/another-file.ts===
// Another file content
===END FILE===

Guidelines:
1. Use TypeScript with strict typing
2. Follow React best practices (hooks, functional components)
3. Use Tailwind CSS for styling (use modern, beautiful designs)
4. Include proper error handling
5. Add JSDoc comments for complex functions
6. Make components accessible (ARIA attributes)
7. Use proper naming conventions (PascalCase for components, camelCase for functions)
8. Export all components and types properly
9. DO NOT truncate code - provide complete implementations
10. Include proper imports at the top of each file

For styling, create visually appealing, modern interfaces with:
- Consistent color schemes
- Proper spacing and typography
- Responsive design
- Smooth transitions and hover effects
- Professional, polished appearance`;

function buildCodePrompt(component: ComponentSpec, designDocument: any): string {
  const techStack = designDocument.appSpec.techPreferences || {};
  const uiGuidelines = designDocument.uiGuidelines || {};

  return `Generate complete code for the following component:

**Component:** ${component.name}
**Description:** ${component.description}
**Priority:** ${component.priority}

**Props:**
${component.props.map(p => `- ${p.name}: ${p.type}${p.required ? ' (required)' : ''} - ${p.description || ''}`).join('\n') || 'None'}

**Dependencies:** ${component.dependencies.join(', ') || 'None'}

**App Context:**
- App: ${designDocument.appSpec.title}
- Genre: ${designDocument.appSpec.genre}

**Tech Stack:**
- Frontend: ${techStack.frontend || 'React'}
- Styling: ${techStack.styling || 'Tailwind CSS'}
- State: ${techStack.stateManagement || 'Zustand'}

**UI Guidelines:**
- Colors: ${uiGuidelines.colorScheme?.join(', ') || 'Modern neutral palette'}
- Fonts: ${uiGuidelines.typography?.headingFont || 'System fonts'}
- Component Library: ${uiGuidelines.componentLibrary || 'Custom components'}

Generate the complete component file(s) including:
1. Main component file (.tsx)
2. Any helper hooks if needed
3. Type definitions if complex

Use beautiful, modern styling with attention to detail. DO NOT truncate any code.`;
}

async function generateBaseFiles(
  flowId: string, 
  designDocument: any, 
  logger: any
): Promise<CodeModule> {
  const appSpec = designDocument.appSpec;
  const techStack = appSpec.techPreferences || {};
  
  const files: GeneratedFile[] = [];
  const timestamp = new Date().toISOString();

  // Generate types file
  files.push({
    path: 'src/types/index.ts',
    content: generateTypesFile(designDocument),
    language: 'typescript',
    moduleType: 'type',
    generatedAt: timestamp,
    iteration: 1,
  });

  // Generate App.tsx
  files.push({
    path: 'src/App.tsx',
    content: generateAppFile(designDocument),
    language: 'typescript',
    moduleType: 'component',
    generatedAt: timestamp,
    iteration: 1,
  });

  // Generate main.tsx
  files.push({
    path: 'src/main.tsx',
    content: generateMainFile(),
    language: 'typescript',
    moduleType: 'config',
    generatedAt: timestamp,
    iteration: 1,
  });

  // Generate index.css with Tailwind
  files.push({
    path: 'src/index.css',
    content: generateIndexCss(designDocument.uiGuidelines),
    language: 'css',
    moduleType: 'style',
    generatedAt: timestamp,
    iteration: 1,
  });

  return {
    id: `${flowId}-base`,
    name: 'Base Configuration',
    description: 'Core application files and configuration',
    files,
    dependencies: [],
    status: 'generated',
    iteration: 1,
  };
}

function generateTypesFile(designDocument: any): string {
  const models = designDocument.dataModels || [];
  
  let content = `/**
 * Application Type Definitions
 * Generated by AI App Generator
 */

`;

  for (const model of models) {
    content += `export interface ${model.name} {\n`;
    for (const field of model.fields || []) {
      const optional = field.required ? '' : '?';
      content += `  ${field.name}${optional}: ${field.type};\n`;
    }
    content += `}\n\n`;
  }

  content += `// Common types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: Status;
}
`;

  return content;
}

function generateAppFile(designDocument: any): string {
  const appSpec = designDocument.appSpec;
  
  return `/**
 * ${appSpec.title}
 * ${appSpec.description}
 * 
 * Generated by AI App Generator
 */

import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">${appSpec.title}</h1>
          <div className="flex items-center gap-4">
            {/* Navigation items will be added here */}
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to ${appSpec.title}
          </h2>
          <p className="text-lg text-purple-200 max-w-2xl mx-auto">
            ${appSpec.description}
          </p>
        </div>
        
        {/* Main content components will be rendered here */}
      </main>
      
      <footer className="container mx-auto px-4 py-6 text-center text-purple-300">
        <p>&copy; ${new Date().getFullYear()} ${appSpec.title}. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
`;
}

function generateMainFile(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function generateIndexCss(uiGuidelines: any): string {
  const colors = uiGuidelines?.colorScheme || ['#6366f1', '#8b5cf6', '#a855f7'];
  
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${colors[0] || '#6366f1'};
  --color-secondary: ${colors[1] || '#8b5cf6'};
  --color-accent: ${colors[2] || '#a855f7'};
}

@layer base {
  body {
    @apply antialiased;
    font-family: ${uiGuidelines?.typography?.bodyFont || 'Inter, system-ui, sans-serif'};
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: ${uiGuidelines?.typography?.headingFont || 'Inter, system-ui, sans-serif'};
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium;
    @apply hover:from-purple-700 hover:to-indigo-700 transition-all duration-200;
    @apply focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900;
  }
  
  .card {
    @apply bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20;
    @apply shadow-xl shadow-purple-900/20;
  }
  
  .input {
    @apply w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg;
    @apply text-white placeholder-purple-300/50;
    @apply focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent;
  }
}
`;
}

function parseGeneratedCode(llmResponse: string, component: ComponentSpec, flowId: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const timestamp = new Date().toISOString();
  
  // Parse files from the response format
  const fileRegex = /===FILE:\s*([^\s]+)\s*===\n([\s\S]*?)===END FILE===/g;
  let match;
  
  while ((match = fileRegex.exec(llmResponse)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    
    files.push({
      path,
      content,
      language: getLanguageFromPath(path),
      moduleType: getModuleTypeFromPath(path),
      generatedAt: timestamp,
      iteration: 1,
    });
  }

  // If no files were parsed, create a default component file
  if (files.length === 0) {
    const componentName = component.name.replace(/\s+/g, '');
    const defaultPath = `src/components/${componentName}.tsx`;
    
    // Try to extract code from markdown code blocks
    let content = llmResponse;
    const codeMatch = llmResponse.match(/```(?:tsx?|jsx?|typescript|javascript)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      content = codeMatch[1].trim();
    }
    
    files.push({
      path: defaultPath,
      content,
      language: 'typescript',
      moduleType: 'component',
      generatedAt: timestamp,
      iteration: 1,
    });
  }

  return files;
}

function getLanguageFromPath(path: string): GeneratedFile['language'] {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  return 'typescript';
}

function getModuleTypeFromPath(path: string): GeneratedFile['moduleType'] {
  if (path.includes('/components/')) return 'component';
  if (path.includes('/hooks/')) return 'hook';
  if (path.includes('/services/')) return 'service';
  if (path.includes('/utils/')) return 'utility';
  if (path.includes('/types/')) return 'type';
  if (path.includes('.test.') || path.includes('.spec.')) return 'test';
  if (path.includes('/styles/') || path.endsWith('.css')) return 'style';
  if (path.includes('config') || path.includes('vite.config') || path.includes('tsconfig')) return 'config';
  return 'component';
}

