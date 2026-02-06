import { defineConfig } from 'vite'

const pagesBase = '/runtime-zero/'
const usePagesBase =
  process.env.VITE_USE_GH_PAGES_BASE === '1' ||
  process.env.VITE_USE_GH_PAGES_BASE === 'true' ||
  process.env.GITHUB_ACTIONS === 'true'

const base = process.env.VITE_BASE_PATH ?? (usePagesBase ? pagesBase : '/')

export default defineConfig({
  base,
})
