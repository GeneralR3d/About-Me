import { defineConfig } from 'vite'

export default defineConfig({
    base: '/About-Me', // Ensures relative paths for assets, essential for GitHub Pages
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    }
})
