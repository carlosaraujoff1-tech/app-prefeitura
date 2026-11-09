import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// "@/..." aponta para a pasta src do app: o painel reaproveita funções puras
// (formatação de datas, CPF). NUNCA importe daqui algo que use react-native.
export default defineConfig({
  plugins: [react()],
  base: './',
  envDir: '..',
  envPrefix: ['EXPO_PUBLIC_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  server: { port: 5174 },
});
