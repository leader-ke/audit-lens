import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'lib/audit/deadline-generator.ts',
        'lib/audit/account-mapper.ts',
        'lib/audit/itax-engine.ts',
        'lib/audit/fs-categories.ts',
        'lib/utils.ts',
      ],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 55,
      },
    },
    include: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
