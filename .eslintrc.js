module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    env: {
        node: true,
        es2020: true,
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],
    rules: {
        'prettier/prettier': [
            'error',
            {
                singleQuote: true,
                trailingComma: 'all',
                semi: true,
            },
        ],
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/ban-ts-comment': 'warn',
    },
    ignorePatterns: ['node_modules/', 'dist/', '*.config.js'],
};