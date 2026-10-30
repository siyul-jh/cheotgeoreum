import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [viteReact()],
  define: { __OG_IMAGE__: '"/og.png"' },
  test: { environment: 'jsdom', passWithNoTests: true, setupFiles: ['./vitest.setup.ts'] },
})
