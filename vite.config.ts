import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5188, strictPort: true },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              maxSize: 320 * 1024,
            },
          ],
        },
      },
    },
  },
});
