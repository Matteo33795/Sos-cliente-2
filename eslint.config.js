import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  alert: 'readonly',
  confirm: 'readonly',
  fetch: 'readonly',
  atob: 'readonly',
  Notification: 'readonly',
  BufferSource: 'readonly',
  HTMLVideoElement: 'readonly',
  HTMLElement: 'readonly',
  URL: 'readonly',
}

const serviceWorkerGlobals = {
  self: 'readonly',
}

const nodeGlobals = {
  process: 'readonly',
  module: 'readonly',
  require: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
}

export default [
  {
    // Le Edge Function girano su Deno, un runtime a parte con globali e
    // convenzioni proprie (import "npm:..."): non ha senso lintarle con le
    // stesse regole del resto del progetto.
    ignores: ['dist', 'node_modules', 'supabase/functions/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: browserGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: { ...browserGlobals, ...serviceWorkerGlobals },
    },
  },
]
