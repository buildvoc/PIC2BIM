import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input:  ["resources/scss/app.scss", 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: 'localhost',       // browser-accessible host
        port: 5173,              // dev server port
        hmr: {
            host: 'localhost',   // ensure hot reload works via correct host
        },
    },
});
