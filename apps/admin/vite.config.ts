import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  const publicBase = process.env.VITE_PUBLIC_BASE || '/';

  return {
    plugins: [react()],
    envDir: '../..',
    base: command === 'serve' ? '/' : publicBase,
    server: {
      host: true,
      port: 5174,
    },
  };
});
