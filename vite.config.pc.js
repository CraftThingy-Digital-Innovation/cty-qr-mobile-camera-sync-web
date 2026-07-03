import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'),
      name: 'QrMobileSync',
      fileName: (format) => `cty-qr-mobile-camera-sync.${format}.js`,
      formats: ['es', 'umd']
    },
    minify: 'esbuild',
    sourcemap: false
  }
});
