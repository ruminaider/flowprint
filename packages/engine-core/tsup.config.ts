import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/rules/evaluator-browser.ts', 'src/rules/core.ts'],
  format: ['esm', 'cjs'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  clean: true,
  sourcemap: true,
})
