import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'domain', environment: 'node', include: ['tests/domain/**/*.test.ts', 'tests/*.test.ts'] } },
      { test: { name: 'rules', environment: 'node', include: ['tests/rules/**/*.test.ts'], fileParallelism: false } },
    ],
  },
})
