import path from 'path';
import { cpSync, existsSync, rmSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const port = Number(process.env.PORT) || 3000;
const apiPort = Number(process.env.API_PORT) || 3001;
const basePath = process.env.BASE_PATH || '/';

/**
 * Vite plugin that copies the build output to every possible location
 * where Vercel might look for the "public" output directory.
 * This runs INSIDE vite build itself — no external scripts needed.
 */
function vercelOutputPlugin(): Plugin {
  return {
    name: 'vercel-output-copy',
    apply: 'build',
    closeBundle() {
      const thisDir = import.meta.dirname;
      const outDir = path.resolve(thisDir, 'dist');

      // Location 1: <dashboard>/public  (if Vercel Root Dir = dashboard folder)
      const localPublic = path.resolve(thisDir, 'public');
      try {
        if (existsSync(localPublic)) rmSync(localPublic, { recursive: true });
        cpSync(outDir, localPublic, { recursive: true });
        console.log('[vercel-output] ✓ Copied dist → dashboard/public/');
      } catch (e: any) {
        console.log('[vercel-output] ⚠ local copy failed:', e.message);
      }

      // Location 2: <monorepo-root>/public  (if Vercel Root Dir = monorepo root)
      const rootPublic = path.resolve(thisDir, '..', '..', 'public');
      if (path.resolve(rootPublic) !== path.resolve(localPublic)) {
        try {
          if (existsSync(rootPublic)) rmSync(rootPublic, { recursive: true });
          cpSync(outDir, rootPublic, { recursive: true });
          console.log('[vercel-output] ✓ Copied dist → root/public/');
        } catch (e: any) {
          console.log('[vercel-output] ⚠ root copy failed:', e.message);
        }
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), vercelOutputPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  publicDir: 'static',
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { strict: true },
    proxy: {
      '/metrics': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
