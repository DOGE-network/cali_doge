module.exports = {
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_', 'varsIgnorePattern': '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      files: ['src/scripts/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['src/app/workforce/**/*.tsx', 'src/app/workforce/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
}; 