import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaBuildPlugin } from './scripts/pwa-build'

export default defineConfig({
  base: '/',
  plugins: [react(), pwaBuildPlugin()],
  server: {
    watch: { ignored: ['**/.verification/**', '**/.npm-cache/**'] },
  },
})
