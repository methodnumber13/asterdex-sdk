import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['tests/**/*', 'examples/**/*'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AsterDEXSDK',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: [
        'ws',
        'node:crypto',
        'node:events',
        'crypto',
        'events',
        'eth-abi',
        'eth-account',
        'web3'
      ],
      output: {
        exports: 'named',
        globals: {
          ws: 'WebSocket',
          'node:crypto': 'crypto',
          'node:events': 'events',
          crypto: 'crypto',
          events: 'events',
        },
        inlineDynamicImports: true,
      },
    },
    target: 'node18',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
});