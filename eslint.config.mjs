import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', 'coverage/**'],
  },

  // Base ESLint recommended rules for all files
  eslint.configs.recommended,

  // TypeScript rules for all .ts/.tsx files
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // TypeScript parser options (project-aware linting)
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Node.js globals for config files at root
  {
    files: ['*.config.{js,ts,mjs}', 'vitest.workspace.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // React rules — only for editor and app packages
  {
    files: ['packages/editor/**/*.{ts,tsx}', 'packages/app/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat['jsx-runtime'].rules,
      ...reactHooksPlugin.configs['recommended-latest'].rules,
    },
  },

  // Browser globals for app package non-React files
  {
    files: ['packages/app/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Project-specific rule overrides (non-formatting rules only)
  {
    rules: {
      // Allow empty exports in placeholder files
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // Disable rules that conflict with Prettier (must be last)
  eslintConfigPrettier,
)
