import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const rawPort = process.env.PORT ?? '22104';

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

// The Deployment serves the frontend and the API from one origin, so the app
// calls /api with relative paths. Locally the two run on separate ports, and
// without this proxy /api falls through to Vite's history fallback.
const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';

function bundleReport(): Plugin {
  let report: {
    generatedAt: string;
    chunks: Array<{
      fileName: string;
      size: number;
      isEntry: boolean;
      dynamicImports: string[];
      imports: string[];
      modules: Array<{
        id: string;
        originalLength: number;
        renderedLength: number;
      }>;
    }>;
  };

  return {
    name: 'well-tutored-bundle-report',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((asset) => asset.type === 'chunk')
        .map((chunk) => ({
          fileName: chunk.fileName,
          size: chunk.code.length,
          isEntry: chunk.isEntry,
          dynamicImports: chunk.dynamicImports,
          imports: chunk.imports,
          modules: Object.entries(chunk.modules)
            .map(([id, module]) => ({
              id,
              originalLength: module.originalLength,
              renderedLength: module.renderedLength,
            }))
            .sort((a, b) => b.renderedLength - a.renderedLength),
        }))
        .sort((a, b) => b.size - a.size);

      report = { generatedAt: new Date().toISOString(), chunks };
    },
    async writeBundle() {
      const reportPath = path.resolve(import.meta.dirname, 'dist/bundle-report.json');
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, JSON.stringify(report, null, 2));
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      plugins: [bundleReport()],
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      // changeOrigin stays false so the browser's Origin header reaches the
      // API unchanged; the API only trusts the frontend's own origin.
      '/api': {
        target: apiProxyTarget,
        changeOrigin: false,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
