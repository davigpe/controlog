import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { version } from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // A versão exibida na interface vem do package.json, pra não ficar defasada
  // a cada release (ficou em "v1.0" até a 1.3.0 por ser escrita na mão).
  define: {
    APP_VERSION: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // 30s, e não 15s, por causa da contenção entre as 42 suítes rodando em
    // paralelo. Os testes de "Minhas Rotas" que registram insucesso levam ~6s
    // de execução real, medidos com o arquivo isolado, mas passavam de 15s de
    // tempo de parede quando a máquina estava ocupada com as outras suítes —
    // falhando por timeout, não por asserção. O limite existe para pegar teste
    // travado, e 30s continua fazendo isso.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/components/ui/**',
        'src/**/*.d.ts',
        'src/test/**',
      ],
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
})
