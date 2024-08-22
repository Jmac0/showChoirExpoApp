// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'warn',
  },
  // Option 1: Explicitly specify files/folders to lint
  overrides: [
    {
      files: ['src/**/*.{js,jsx,ts,tsx}'],
      // You can add specific ESLint rules here for the src folder
    },
  ],
  // Option 2: Ignore everything outside of src
  ignorePatterns: ['!src/'],
};
