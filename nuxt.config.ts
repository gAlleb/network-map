export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  ssr: false,

  app: {
    head: {
      title: 'Карта сети',
      htmlAttrs: { lang: 'ru' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  // Icons come from the installed @iconify-json packages; nothing is fetched
  // from the Iconify API at runtime, so the map works without internet.
  icon: {
    serverBundle: 'local',
    clientBundle: { scan: true },
  },

  // System fonts only: the map is used inside the network and must not reach
  // out to Google Fonts.
  ui: { fonts: false },

  runtimeConfig: {
    // Overridden by NUXT_DB_PATH in docker-compose.yml.
    dbPath: './data/network.db',
  },

  nitro: {
    experimental: { tasks: false },
  },
})
