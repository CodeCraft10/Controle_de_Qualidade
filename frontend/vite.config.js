import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://localhost:3000', changeOrigin: true },
      },
    },
    preview: { port: 4173 },
    build: { target: 'es2022' },
  };
});
