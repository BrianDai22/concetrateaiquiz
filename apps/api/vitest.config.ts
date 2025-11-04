import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**', 'src/server.ts'],
      all: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
  },
  resolve: {
    alias: {
      '@concentrate/database': path.resolve(__dirname, '../../packages/database/src'),
      '@concentrate/services': path.resolve(__dirname, '../../packages/services/src'),
      '@concentrate/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@concentrate/validation': path.resolve(__dirname, '../../packages/validation/src'),
    },
  },
})
