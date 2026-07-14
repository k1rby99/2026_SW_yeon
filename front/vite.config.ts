/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // 개발 서버는 Host 헤더를 검사해 DNS 리바인딩을 막는다. 터널이나 리버스 프록시로
  // 외부 도메인을 붙이려면 그 호스트를 여기 등록해야 한다.
  // 다른 도메인은 VITE_ALLOWED_HOSTS에 쉼표로 구분해 넘긴다.
  const allowedHosts = [
    'sw.breakpack.cc',
    ...(env.VITE_ALLOWED_HOSTS?.split(',').map((host) => host.trim()).filter(Boolean) ?? []),
  ]

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      globals: true,
    },
  }
})
