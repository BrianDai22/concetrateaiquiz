import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: [
        'packages/**/src/**/*.{ts,tsx}',
        'apps/**/src/**/*.{ts,tsx}',
        'apps/web/app/**/*.{ts,tsx}',
        'apps/web/components/**/*.{ts,tsx}',
        'apps/web/lib/**/*.{ts,tsx}'
      ],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/index.ts',
        '**/__tests__/**',
        '**/__mocks__/**',
        '.next',
        'coverage'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      },
      clean: true,
      skipFull: false
    },
    include: [
      'packages/**/*.{test,spec}.{ts,tsx}',
      'apps/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      '**/*.e2e.{test,spec}.ts'
    ],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
    bail: 1,
    retry: 0,
    reporters: ['default']
  },
  resolve: {
    alias: {
      '@concentrate/database': resolve(__dirname, './packages/database/src'),
      '@concentrate/validation': resolve(__dirname, './packages/validation/src'),
      '@concentrate/shared': resolve(__dirname, './packages/shared/src'),
      '@concentrate/ui': resolve(__dirname, './packages/ui/src')
    }
  }
})