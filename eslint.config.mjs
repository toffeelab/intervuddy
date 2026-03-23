import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import importX from 'eslint-plugin-import-x';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/.next/',
      '**/out/',
      '**/build/',
      '**/dist/',
      '**/node_modules/',
      '**/coverage/',
      '*.db',
      '.worktrees/',
      '.claude/worktrees/',
    ],
  },

  // Base TypeScript rules
  ...tseslint.configs.recommended,

  // React + Next.js + Import ordering
  {
    files: ['**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
    plugins: {
      ...react.configs.flat.recommended.plugins,
      ...react.configs.flat['jsx-runtime'].plugins,
      'react-hooks': reactHooks,
      '@next/next': nextPlugin.configs.recommended.plugins['@next/next'],
      'import-x': importX,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React hooks
      ...reactHooks.configs['recommended-latest'].rules,

      // Next.js
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,

      // Import ordering
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Test file overrides
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // E2E test overrides (Playwright's `use()` is not a React Hook)
  {
    files: ['**/e2e/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // PartyKit overrides (no React)
  {
    files: ['apps/partykit/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  // NestJS server overrides (no React/Next.js)
  {
    files: ['apps/server/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-assign-module-variable': 'off',
    },
  },

  // NestJS test files
  {
    files: ['apps/server/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Prettier must be last
  eslintConfigPrettier
);
