#!/bin/sh
set -e

echo "🚀 Starting Node container..."

# Install node_modules only if missing
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
    echo "📦 node_modules missing — installing..."
    npm install
else
    echo "📦 node_modules exists — skipping npm install."
fi

echo "🎨 Starting Vite dev server..."
npm run dev -- --host 0.0.0.0