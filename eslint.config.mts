import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import perfectionist from 'eslint-plugin-perfectionist'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginReact from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  eslintPluginPrettierRecommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  globalIgnores(['index.js']),
  {
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-imports': 'error',
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
])
