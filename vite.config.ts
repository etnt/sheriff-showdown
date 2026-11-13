/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works under any GitHub Pages
  // sub-path (https://<user>.github.io/cross-hair/) without changes.
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
