#!/bin/bash
set -e

echo "🚀 Starting PIC2BIM Application..."

cd /var/www

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Copying .env.example to .env..."
        cp .env.example .env
        # Fix DB_HOST for single container setup (change 'db' to 'localhost')
        sed -i 's/^DB_HOST=db$/DB_HOST=localhost/' .env || sed -i 's/^DB_HOST="db"$/DB_HOST=localhost/' .env || true
        echo "✅ .env file created from .env.example"
    else
        echo "⚠️  .env.example not found, creating minimal .env..."
        cat > .env << EOF
APP_NAME="PIC2BIM"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=laravel_db
DB_USERNAME=root
DB_PASSWORD=password

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
EOF
    fi
fi

# Generate APP_KEY if not set
if ! grep -q "^APP_KEY=base64:" .env; then
    echo "🔑 Generating application key..."
    php artisan key:generate --force || true
    echo "✅ Application key generated"
fi

# Ensure storage directories exist
echo "📁 Setting up storage directories..."
mkdir -p storage/app/public \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

# Fix permissions
echo "🔧 Fixing permissions..."
chown -R www-data:www-data storage bootstrap/cache public
chmod -R 775 storage bootstrap/cache public

echo "✅ Application setup complete!"
echo "🌐 Starting services (PostgreSQL, Apache, and Laravel setup)..."

# Start supervisord (this will start PostgreSQL, Apache, and Laravel setup)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

