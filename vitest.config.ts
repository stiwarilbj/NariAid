import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: { reporter: ['text', 'json', 'html'] },
  },
})
