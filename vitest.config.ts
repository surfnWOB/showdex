import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: {
      '@showdex': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
