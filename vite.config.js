import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/scss/app.scss", 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ]
});
