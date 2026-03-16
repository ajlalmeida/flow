import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Em produção (GitHub Pages) o app roda em /<repo-name>/
// Troque 'flow' pelo nome exato do seu repositório GitHub.
const base = process.env.NODE_ENV === 'production' ? '/flow/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
