import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      exclude: ['src/stories/**', 'src/**/*.test.*', 'src/**/*.stories.*'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@ruminaider/flowprint-schema',
        '@xyflow/react',
        '@xyflow/system',
        'web-tree-sitter',
        '@monaco-editor/react',
        'monaco-editor',
      ],
    },
    sourcemap: true,
    cssCodeSplit: false,
  },
})
