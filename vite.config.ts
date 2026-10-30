import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api/subway': {
        target: 'http://swopenAPI.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/subway/, '/api/subway')
      },
      '/api/public-bus': {
        target: 'http://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/public-bus/, '')
      },
      '/api/odsay': {
        target: 'https://api.odsay.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/odsay/, '')
      },
      '/api/kakao-traffic': {
        target: 'https://dapi.kakao.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-traffic/, '')
      }
    }
  }
})

