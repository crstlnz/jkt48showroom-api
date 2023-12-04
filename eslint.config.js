import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      'node_modules',
    ],
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'curly': ['error', 'multi-line'],
      'antfu/if-newline': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'node/prefer-global/process': 'off',
      'unused-imports/no-unused-vars': 'warn',
    },
  },

)
