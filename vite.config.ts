import { defineConfig } from 'vite'

const pagesBase = '/runtime-zero/'
const isTrue = (value: string | undefined): boolean =>
  value === '1' || value === 'true' || value === 'TRUE'

const usePagesBase =
  isTrue(process.env.VITE_USE_GH_PAGES_BASE) ||
  isTrue(process.env.GITHUB_PAGES) ||
  isTrue(process.env.GITHUB_ACTIONS)

const base = process.env.VITE_BASE_PATH ?? (usePagesBase ? pagesBase : '/')

export default defineConfig({
  base,
})
