# Project Setup Plan for Motia Code Review Agent

This document outlines a step-by-step plan to initialize a new Motia project for the Code Review Agent, as described in `README.md`. This plan includes setting up the project structure, installing necessary libraries, configuring testing, and creating boilerplate code for the agent's flow.

## Step 1: Initialize Project Directory and `package.json`

1.  **Create a new project directory:**

    Open your terminal and navigate to the desired location for your project. Then, create a new directory for your project:

    ```bash
    mkdir code-review-agent
    cd code-review-agent
    ```

2.  **Initialize `package.json`:**

    Initialize a new Node.js project and create a `package.json` file using npm. This file will manage your project's dependencies and scripts.

    ```bash
    npm init -y
    ```

    This command creates a `package.json` file with default values. You can modify it later as needed.

## Step 2: Install Motia and Core Dependencies

1.  **Install `motia` and `zod`:**

    Motia is the core framework for building event-driven workflows. `zod` is a TypeScript-first schema validation library, often used with Motia for input validation. Install them using npm:

    ```bash
    npm install motia zod
    ```

## Step 3: Set up Testing with Jest

1.  **Install Jest and related dependencies:**

    Jest is a popular JavaScript testing framework. Install Jest, TypeScript types for Jest, and `ts-jest` (a TypeScript preprocessor for Jest) as development dependencies:

    ```bash
    npm install --save-dev jest @types/jest ts-jest
    ```

2.  **Configure Jest:**

    Create a `jest.config.js` file in the root of your project to configure Jest. This configuration sets up `ts-jest` as the preset, specifies the test environment, and defines test file patterns and coverage settings.

    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'], // Look for test files with .test.ts extension
      collectCoverageFrom: ['steps/**/*.ts'], // Collect coverage from step files
      coveragePathIgnorePatterns: ['/node_modules/', '/dist/'], // Ignore node_modules and dist folders
    };
    ```

3.  **Add test scripts to `package.json`:**

    Modify your `package.json` to include scripts for running tests. Add the following scripts under the `scripts` section:

    ```json
    "scripts": {
      "dev": "motia dev",
      "test": "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage"
    },
    ```

    *   `test`: Runs Jest tests once.
    *   `test:watch`: Runs Jest in watch mode, re-running tests on file changes.
    *   `test:coverage`: Runs Jest and generates a test coverage report.

## Step 4: Create Project Boilerplate Structure

1.  **Create `steps` directory:**

    Create a `steps` directory in the root of your project. This directory will contain all your Motia step definitions.

    ```bash
    mkdir steps
    ```

2.  **Create step files for the Code Review Agent Flow:**

    Based on the `README.md` and the described "Agent Flow: Review", we need to create step files for each step in the flow. Create the following files within the `steps` directory. We will start with basic configurations and handlers.

    To organize steps by domain/flow as recommended, create a `review` subdirectory within `steps`:

    ```bash
    mkdir steps/review
    touch steps/review/reviewRequest.api.step.ts steps/review/analyze.step.ts steps/review/suggest.step.ts steps/review/reflect.step.ts steps/review/consider.step.ts steps/review/compose.step.ts steps/review/plan.step.ts
    ```

    Following the `<functionality>.<step-type>.ts` naming convention, the files are named clearly indicating their function and step type (api or event).

3.  **Populate step files with boilerplate code:**

    Open each of the created `.step.ts` files and add the basic step configuration and handler structure.

    *   **steps/review/reviewRequest.api.step.ts (API Step - Entry Point)**

        ```typescript
        import { ApiRouteConfig, StepHandler } from 'motia';

        export const config: ApiRouteConfig = {
          type: 'api',
          name: 'ReviewRequest',
          description: 'API endpoint to initiate the code review process',
          path: '/api/review',
          method: 'POST',
          emits: ['review.requested'],
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (req, { emit, logger }) => {
          logger.info('Review requested via API', { body: req.body });

          // TODO: Extract relevant data from req.body and emit 'review.requested' event

          await emit({
            topic: 'review.requested',
            data: {
              // Placeholder data, replace with actual data from request
              repository: 'your-repo',
              branch: 'your-branch',
              requirements: 'Review code for performance and security'
            },
          });

          return {
            status: 200,
            body: { message: 'Code review process initiated' },
          };
        };
        ```

    *   **steps/review/analyze.step.ts (Event Step)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Analyze',
          description: 'Analyzes the context for code review',
          subscribes: ['review.requested'],
          emits: ['review.problemFound', 'review.planPart'],
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Analyzing review context', { input });

          // TODO: Implement context analysis logic
          // For now, emit placeholder events

          await emit({ topic: 'review.problemFound', data: { problem: 'Potential performance issue in module X' } });
          await emit({ topic: 'review.planPart', data: { part: 'Investigate performance of module X' } });
        };
        ```

    *   **steps/review/suggest.step.ts (Event Step)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Suggest',
          description: 'Suggests solutions for identified problems',
          subscribes: ['review.problemFound'],
          emits: ['review.suggestion'],
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Suggesting solutions', { input });

          // TODO: Implement suggestion logic based on problem
          // For now, emit a placeholder suggestion

          await emit({ topic: 'review.suggestion', data: { suggestion: 'Refactor module X to use more efficient algorithm' } });
        };
        ```

    *   **steps/review/reflect.step.ts (Event Step)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Reflect',
          description: 'Reflects on suggestions and arguments',
          subscribes: ['review.suggestion', 'review.counterArgument'],
          emits: ['review.argument', 'review.requested', 'review.planPart'], // 'review.requested' for recursive calls, 'review.planPart' if reflection demands a plan part
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Reflecting on suggestion/argument', { input });

          // TODO: Implement reflection logic
          // For now, emit placeholder events

          await emit({ topic: 'review.argument', data: { argument: 'This refactoring aligns with best practices' } });
        };
        ```

    *   **steps/review/consider.step.ts (Event Step)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Consider',
          description: 'Considers arguments and suggestions to generate counter arguments',
          subscribes: ['review.argument', 'review.suggestion'],
          emits: ['review.counterArgument'],
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Considering arguments', { input });

          // TODO: Implement consideration logic to generate counter arguments
          // For now, emit a placeholder counter argument

          await emit({ topic: 'review.counterArgument', data: { counterArgument: 'However, refactoring might introduce regressions, need thorough testing' } });
        };
        ```

    *   **steps/review/compose.step.ts (Event Step)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Compose',
          description: 'Composes plan parts into a complete plan',
          subscribes: ['review.planPart'],
          emits: ['review.planComposed'],
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Composing plan part', { input });

          // TODO: Implement plan composition logic
          // For now, emit a placeholder composed plan

          await emit({ topic: 'review.planComposed', data: { plan: 'Plan composed, ready for finalization' } });
        };
        ```

    *   **steps/review/plan.step.ts (Event Step - Final Output)**

        ```typescript
        import { EventConfig, StepHandler } from 'motia';

        export const config: EventConfig = {
          type: 'event',
          name: 'Plan',
          description: 'Finalizes and outputs the code review plan',
          subscribes: ['review.planComposed'],
          emits: ['review.done'], // Emits 'review.done' to signal completion
          flows: ['code-review-flow'],
        };

        export const handler: StepHandler<typeof config> = async (input, { emit, logger }) => {
          logger.info('Finalizing code review plan', { input });

          // TODO: Implement plan finalization and output logic (e.g., write to Plan.md)
          // For now, just log completion

          logger.info('Code review plan finalized and (virtually) written to Plan.md');

          await emit({ topic: 'review.done', data: { message: 'Code review plan generation complete' } });
        };
        ```

## Step 5: Install Additional Libraries (as needed)

Based on the description and potential implementation of the Code Review Agent, consider installing the following libraries:

1.  **`axios`**: For making HTTP requests to external services like code repositories (GitHub, GitLab, etc.) or APIs for code analysis.

    ```bash
    npm install axios
    ```

2.  **Libraries for code parsing and analysis**: Depending on the complexity of code analysis you want to perform, you might need libraries for parsing code in different languages. For example:

    *   **For JavaScript/TypeScript**:  You might use the built-in `typescript` compiler API or libraries like `acorn` or `babel-parser`.
    *   **For Python**: `ast` module (built-in) or libraries like `astroid`.
    *   **For other languages**: Look for language-specific parsing libraries.

    For a basic setup, you might not need these immediately, but keep them in mind for future enhancements in the `steps/shared` directory.

3.  **Libraries for semantic search/context management**: The `README.md` mentions "Probe" for semantic search. If you plan to implement semantic search, you might need to explore libraries related to vector embeddings and similarity search.  "Probe" itself is mentioned as a GitHub repository, you might need to investigate its usage or alternatives. For now, we will skip installing specific semantic search libraries until the implementation details are clearer.  Shared utility functions for semantic search can be placed in `steps/shared/utils`.

4.  **Markdown processing library**: If you plan to generate Markdown output for the plan (as suggested by `Plan.md` in `README.md`), you might want a library to help with Markdown formatting.  For example: `markdown-it`.

    ```bash
    npm install markdown-it
    ```

    Install this if you plan to generate formatted Markdown output.  Shared utility functions for markdown processing can be placed in `steps/shared/utils`.

**For now, let's install `axios` and `markdown-it` as they seem generally useful.**

```bash
npm install axios markdown-it
```

You can install more libraries as you progress with the implementation and identify specific needs.  Consider placing shared services or utility functions in `steps/shared` to keep your project organized.

## Step 6: Create `.gitignore` file

It's good practice to create a `.gitignore` file to exclude unnecessary files and directories from version control, such as `node_modules` and Motia's runtime data directory `.motia`.

1.  **Create `.gitignore` file:**

    Create a file named `.gitignore` in the root of your project and add the following lines:

    ```gitignore
    node_modules
    .motia
    dist
    *.log
    .env
    ```

## Step 7: Add Development Script to `package.json`

If you haven't already, ensure you have a `dev` script in your `package.json` to easily start the Motia development server. This script is usually:

```json
"scripts": {
  "dev": "motia dev",
  // ... other scripts
}
```

This script allows you to start the Motia Workbench and development environment by running `npm run dev` in your terminal.

## Step 8: Verify Setup and Run Motia Dev

1.  **Run `npm run dev`:**

    In your terminal, run the command:

    ```bash
    npm run dev
    ```

    This should start the Motia development server. Open your browser and navigate to the Motia Workbench URL (usually `http://localhost:3000`).

2.  **Check for Flow and Steps in Workbench:**

    In the Motia Workbench, you should see the "code-review-flow" listed in the flows sidebar. If you select it, you should see the visual representation of your flow with all the steps you created.  Initially, they will be disconnected as we haven't defined event flow connections beyond the `subscribes` and `emits` in the config.

3.  **Check Logs:**

    Examine the terminal output where you ran `npm run dev`. You should see logs from Motia indicating that it has loaded your steps.

## Step 9: Start Implementing Step Logic and Tests

Now that you have the basic project setup and boilerplate code, you can start implementing the actual business logic within each step's handler function.

*   **Implement TODOs**: Go through each step file and replace the `// TODO:` comments with your actual code for code review analysis, suggestion, reflection, etc. Ensure each step is focused on a single responsibility.
*   **Write Unit Tests**: For each step, create a corresponding test file (e.g., `steps/review/analyze.step.test.ts`) and write unit tests to verify the step's logic. Use the testing utilities provided by Motia (like `createTestContext`) to mock `emit`, `state`, and `logger`. Test both success and error paths for each step.
*   **Organize by Domain**: As you add more steps, keep organizing them by domain within the `steps` directory (e.g., `steps/review`, `steps/auth`, `steps/reporting`).
*   **Use Consistent Naming**: Maintain consistent naming conventions for step files and topics.
*   **Factor out Shared Code**: Identify any shared logic and factor it out into the `steps/shared` directory to avoid duplication.
*   **Document Step Purposes**: Add clear descriptions in the `config` object of each step to document its purpose.
*   **Group Related Steps by Flow**: Ensure related steps are grouped by assigning them to the same `flows` array in their configurations.
*   **Isolate Business Logic**: Keep your step handlers focused on business logic and avoid mixing in infrastructure concerns.
*   **Version Control**: Regularly commit your changes to Git to version control your Motia project.
*   **Use TypeScript**: Leverage TypeScript for type safety to catch errors early.
*   **Configure Linting and Formatting**: Set up linting and formatting tools to maintain code consistency.

This detailed plan provides a solid foundation for building your Motia Code Review Agent. Remember to iterate, test, and refine your implementation as you progress. Good luck!
