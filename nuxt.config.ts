import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css', 'vue-sonner/style.css'],
  runtimeConfig: {
    // SQLite 数据库文件路径，可用 NUXT_DB_PATH 覆盖
    dbPath: './.data/stock-panel.db',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  nitro: {
    // better-sqlite3 是原生模块，不能被打包，需作为外部依赖
    externals: {
      external: ['better-sqlite3'],
    },
  },
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
