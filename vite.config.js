import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const webrtcTarget = env.VITE_WEBRTC_PROXY_TARGET || 'https://radioinonestop.com'
  const hlsTarget = env.VITE_HLS_PROXY_TARGET || 'https://radioinonestop.com'
  const rewriteWebRTC = env.VITE_WEBRTC_PROXY_REWRITE === 'true'
  const rewriteHLS = env.VITE_HLS_PROXY_REWRITE === 'true'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: true },
        '/ws': { target: 'ws://localhost:8080', ws: true, changeOrigin: true },
        '/listen/': { target: 'http://localhost:8080', changeOrigin: true },
        // Hosted mode (default): /webrtc/* forwarded as-is to public edge.
        // Local direct MediaMTX mode: set VITE_WEBRTC_PROXY_REWRITE=true to strip /webrtc prefix.
        '/webrtc': {
          target: webrtcTarget,
          changeOrigin: true,
          rewrite: rewriteWebRTC ? (path) => path.replace(/^\/webrtc/, '') : undefined,
        },
        // Hosted mode (default): /hls/* forwarded as-is to public edge.
        // Local direct MediaMTX mode: set VITE_HLS_PROXY_REWRITE=true to strip /hls prefix.
        '/hls': {
          target: hlsTarget,
          changeOrigin: true,
          rewrite: rewriteHLS ? (path) => path.replace(/^\/hls/, '') : undefined,
        },
      },
    },
  }
})
