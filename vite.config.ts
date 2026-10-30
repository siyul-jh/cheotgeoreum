import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

// Vercel이 넣는 스킴 없는 프로덕션 호스트명. 없으면(로컬) 상대 경로
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
  define: { __OG_IMAGE__: JSON.stringify(host ? `https://${host}/og.png` : '/og.png') },
})
