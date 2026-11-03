import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        landing: path.resolve(__dirname, 'landing.html'),
        editor: path.resolve(__dirname, 'editor.html'),
        library: path.resolve(__dirname, 'library.html'),
        capture: path.resolve(__dirname, 'capture.html'),
        print: path.resolve(__dirname, 'print.html'),
        studio: path.resolve(__dirname, 'studio.html'),
        privacy: path.resolve(__dirname, 'privacy.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
