import { defineConfig } from 'vite';

// Relative assets allow /, /games/the-fold/, and a GitHub Pages subpath.
export default defineConfig({ base: process.env.GAME_BASE || './' });
