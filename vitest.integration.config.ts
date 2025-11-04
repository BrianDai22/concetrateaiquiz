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
      include: [
        'apps/api/src/**/*.ts',
        'packages/services/src/**/*.ts'
      ],
      exclude: [
        'node_modules',
        'dist',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/index.ts'
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    },
    include: [
      'apps/api/**/*.integration.{test,spec}.ts',
      'packages/**/tests/integration/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage'
    ],
    setupFiles: ['./test/setup.integration.ts'],
    testTimeout: 30000,
    bail: 1,
    retry: 0,
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    reporters: ['default']
  },
  resolve: {
    alias: {
      '@concentrate/database': resolve(__dirname, './packages/database/src'),
      '@concentrate/validation': resolve(__dirname, './packages/validation/src'),
      '@concentrate/shared': resolve(__dirname, './packages/shared/src')
    }
  }
})