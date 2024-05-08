module.exports = {
  root: true,
  extends: '@react-native-community',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
        'arrow-parens': ['error', 'avoid'], // Arrow parens: avoid
        'comma-dangle': ['error', 'always-multiline'], // Trailing comma: all
        quotes: ['error', 'single'], // Single quote
        'quote-props': ['error', 'as-needed'], // Quote object property names only when necessary
        semi: ['error', 'never'], // No semicolons
        'key-spacing': ['error', { beforeColon: false, afterColon: true }], // Consistent spacing around colons in object literals
        'object-curly-spacing': ['error', 'never'], // Spaces inside curly braces
        'prettier/prettier': ['error', { endOfLine: 'auto' }], // This line is added to ensure Prettier and ESLint rules are aligned
      },
    },
  ],
};
