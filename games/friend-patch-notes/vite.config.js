import { defineConfig } from 'vite';
// Adapted from this repository's Soup Vite starter; relative base supports subpaths.
export default defineConfig({base:process.env.GAME_BASE||'./',server:{host:'127.0.0.1'},build:{target:'es2020'}});
