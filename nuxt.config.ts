import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css', 'vue-sonner/style.css'],
  runtimeConfig: {
    // Phase 3：AI 分析 provider（当前默认 template，无需 API key）
    analysisProvider: 'template',
    analysisApiKey: '',
    analysisModel: '',
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },
})
