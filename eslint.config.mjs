import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Custom rules for code consistency
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import': importPlugin,
      'unused-imports': unusedImports,
      'react-hooks': reactHooks,
    },
    rules: {
      // ==================== QUOTES & SEMICOLONS ====================
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'never'],
      'jsx-quotes': ['error', 'prefer-double'],

      // ==================== SPACING & FORMATTING ====================
      'indent': ['error', 2, { SwitchCase: 1 }],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'comma-dangle': ['error', 'always-multiline'],

      // ==================== CODE QUALITY ====================
      'prefer-const': 'error',
      'arrow-parens': ['error', 'as-needed'],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // ==================== IMPORTS ====================
      // Remove unused imports automatically
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],

      // Order imports
      'import/order': [
        'error',
        {
          'groups': [
            'builtin',   // Node.js built-in modules
            'external',  // npm packages
            'internal',  // Aliased modules (@/)
            ['parent', 'sibling', 'index'], // Relative imports
            'type',      // Type imports
          ],
          'pathGroups': [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          'pathGroupsExcludedImportTypes': ['react', 'next'],
          'newlines-between': 'never', // No blank lines between import groups
          'alphabetize': {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],

      // ==================== BLANK LINES ====================
      // Enforce blank lines between certain statements
      'padding-line-between-statements': [
        'error',
        // Blank line after imports
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        // Blank line before return
        { blankLine: 'always', prev: '*', next: 'return' },
        // Blank line after variable declarations
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        // Blank line before function declarations
        { blankLine: 'always', prev: '*', next: 'function' },
        // Blank line before export
        { blankLine: 'always', prev: '*', next: 'export' },
        { blankLine: 'any', prev: 'export', next: 'export' },
      ],

      // ==================== REACT HOOKS ====================
      'react-hooks/rules-of-hooks': 'error', // Enforce hooks rules
      'react-hooks/exhaustive-deps': 'warn', // Check effect dependencies

      // ==================== COMPLEXITY & CODE QUALITY ====================
      // Limit function complexity
      'complexity': ['warn', 15],
      // Limit max depth of nested blocks
      'max-depth': ['warn', 4],
      // Limit max nested callbacks
      'max-nested-callbacks': ['warn', 3],
      // Limit max parameters in function
      'max-params': ['warn', 5],
      // Limit max lines per function
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      // Limit max lines per file
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],

      // ==================== BEST PRACTICES ====================
      // No console.log in production
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Require default case in switch
      'default-case': 'warn',
      // Disallow empty functions
      'no-empty-function': 'warn',
      // No duplicate conditions
      'no-dupe-else-if': 'error',
      // No unreachable code
      'no-unreachable': 'error',
      // Require await in async functions
      'require-await': 'warn',
      // No async function without await
      '@typescript-eslint/require-await': 'off', // Disabled because it conflicts with Next.js patterns
      // Prefer template literals
      'prefer-template': 'warn',
      // No useless concat
      'no-useless-concat': 'warn',

      // ==================== REACT SPECIFIC ====================
      // Prevent missing React when using JSX
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+
      // Prevent missing key prop
      'react/jsx-key': 'error',
      // No array index as key
      'react/no-array-index-key': 'warn',
      // Boolean prop naming
      'react/boolean-prop-naming': ['warn', { rule: '^(is|has|should|can|will|did)[A-Z]([A-Za-z0-9]?)+' }],
      // Self-closing components
      'react/self-closing-comp': 'warn',
      // No unsafe target blank
      'react/jsx-no-target-blank': 'error',

      // ==================== TYPESCRIPT SPECIFIC ====================
      // No explicit any (already warning from base config, make it consistent)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Consistent type definitions
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],

      // ==================== NAMING CONVENTIONS ====================
      '@typescript-eslint/naming-convention': [
        'warn',
        // Boolean variables should start with is, has, should, etc.
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase', 'camelCase'],
          prefix: ['is', 'has', 'should', 'can', 'will', 'did', 'show', 'hide', 'enable', 'disable'],
        },
        // TypeScript interfaces should be PascalCase
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        // Type aliases should be PascalCase
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        // Enums should be PascalCase
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
      ],

      // ==================== COMMENTS & DOCUMENTATION ====================
      // Require JSDoc for exported functions (warning only)
      'require-jsdoc': 'off', // Too strict for now
      // Warn about TODO/FIXME comments
      'no-warning-comments': ['warn', { terms: ['TODO', 'FIXME', 'XXX', 'HACK'], location: 'start' }],
    },
  },
  // Disable type-aware rules for config files not in TypeScript project
  {
    files: ['*.config.mjs', '*.config.js'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },
])

export default eslintConfig
