import { defineConfig } from "eslint/config";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import globals from 'globals';

const ignoreConfig = {
  ignores: ['**/node_modules/**', '**/.motia/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.venv/**']
};

const typescriptConfig = {
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json'
    },
    globals: {
      ...globals.node
    }
  },
  plugins: {
    'prettier': eslintPluginPrettier
  },
  rules: {
    // Prettier
    'prettier/prettier': 'warn',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'eqeqeq': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'curly': 'error'
  },
};

export default defineConfig([
  ignoreConfig,
  eslint.configs.recommended,
  tseslint.configs.recommended,
  typescriptConfig,
]);