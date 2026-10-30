import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'

// Vercel이 넣는 스킴 없는 프로덕션 호스트명. 없으면(로컬) 상대 경로
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL

const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png']

// client 번들의 /assets/ 목록을 sw.template.js에 넣어 sw.js로 내보낸다. nitro가 client outDir을 공개 경로로 잡는다
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    applyToEnvironment: (env) => env.name === 'client',
    generateBundle(_, bundle) {
      const precache = [...SHELL, ...Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => `/${f}`)]
      const version = createHash('sha256').update(precache.join()).digest('hex').slice(0, 8)
      const source = readFileSync('sw.template.js', 'utf8')
        .replace('self.__PRECACHE = []', `self.__PRECACHE = ${JSON.stringify(precache)}`)
        .replace("self.__VERSION = ''", `self.__VERSION = '${version}'`)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact(), serviceWorker()],
  define: { __OG_IMAGE__: JSON.stringify(host ? `https://${host}/og.png` : '/og.png') },
})
