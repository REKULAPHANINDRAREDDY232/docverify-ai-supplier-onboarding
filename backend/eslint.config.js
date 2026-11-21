const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'eslint.config.js', 'jest.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
