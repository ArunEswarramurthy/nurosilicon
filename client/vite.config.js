import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = ['localhost', '127.0.0.1'];
  if (env.VITE_NGROK_HOST) allowedHosts.push(env.VITE_NGROK_HOST);

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts,
      proxy: {
        '/api':     { target: 'http://127.0.0.1:5000', changeOrigin: true },
        '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      },
    },
  };
});
