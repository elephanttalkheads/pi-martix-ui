import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  base: './',
  build: {
    outDir: '../../dist-renderer',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1', // 强制 IPv4：否则 vite8 只绑 ::1，wait-on tcp:127.0.0.1 永远等不到
    port: 5173,
    strictPort: true,
  },
});
