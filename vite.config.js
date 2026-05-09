import { defineConfig } from 'vite';

export default defineConfig({
  // This is critical for itch.io hosting to ensure assets are loaded correctly from subdirectories
  base: './',
  build: {
    // Ensure assets are placed in a predictable location
    assetsDir: 'assets',
    // Itch.io works best with a single index.html in the root of the zip
    outDir: 'dist',
  },
});
