import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true, changeOrigin: true },
      // Strip /webrtc prefix: /webrtc/radio/whip → http://localhost:8889/radio/whip
      '/webrtc': { target: 'http://localhost:8889', changeOrigin: true, rewrite: (path) => path.replace(/^\/webrtc/, '') },
      // Strip /hls prefix: /hls/radio/index.m3u8 → http://localhost:8888/radio/index.m3u8
      '/hls': { target: 'http://localhost:8888', changeOrigin: true, rewrite: (path) => path.replace(/^\/hls/, '') },
    },
  },
})
