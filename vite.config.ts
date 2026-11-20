import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em GitHub Pages a app fica em https://<utilizador>.github.io/<repositório>/
// BASE_PATH é definido no workflow de publicação; localmente fica "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
