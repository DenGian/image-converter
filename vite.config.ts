import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const deployment = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'production-preview-headers',
      configurePreviewServer(server) {
        server.middlewares.use((request, response, next) => {
          const path = request.url?.split('?')[0] ?? '/'
          for (const rule of deployment.headers) {
            if (new RegExp(`^${rule.source}$`).test(path))
              for (const header of rule.headers) response.setHeader(header.key, header.value)
          }
          next()
        })
      },
    },
  ],
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
