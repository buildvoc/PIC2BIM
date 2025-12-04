# Stage 1: Build Node.js assets
FROM node:22-alpine AS node-builder

WORKDIR /var/www

COPY package*.json ./
RUN npm ci

COPY vite.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY resources ./resources
COPY public ./public

# Copy .env.example for Vite build (Vite needs VITE_* variables like VITE_MAPBOX_TOKEN at build time)
COPY Docker/singleImageProduction/.env.example ./.env

RUN npx vite build && npx vite build --ssr

# Stage 2: Production image with Apache, PHP, and PostgreSQL
FROM php:8.2-apache

# Install system dependencies and PostgreSQL
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    libzip-dev \
    libpq-dev \
    libonig-dev \
    postgresql \
    postgresql-contrib \
    postgis \
    supervisor \
    && docker-php-ext-install pdo pdo_pgsql zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Configure Apache for Laravel
RUN printf '<VirtualHost *:80>\n\
    ServerAdmin webmaster@localhost\n\
    DocumentRoot /var/www/public\n\
    <Directory /var/www/public>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>\n' > /etc/apache2/sites-available/000-default.conf

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Copy built assets from node-builder
COPY --from=node-builder /var/www/public/build ./public/build

# Copy .env.example to container
COPY Docker/singleImageProduction/.env.example /var/www/.env.example

# Copy entrypoint script
COPY Docker/singleImageProduction/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create necessary directories
RUN mkdir -p storage/app/public \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache public \
    && chmod -R 775 storage bootstrap/cache public

# Create init script for PostgreSQL
RUN printf '#!/bin/bash\n\
set -e\n\
\n\
# Find PostgreSQL version\n\
PG_VERSION=$(ls /usr/lib/postgresql/ | head -n1)\n\
PG_BIN="/usr/lib/postgresql/$PG_VERSION/bin"\n\
PG_DATA="/var/lib/postgresql/data"\n\
PG_LOG="/var/lib/postgresql/postgresql.log"\n\
\n\
# Create log file with proper permissions\n\
touch "$PG_LOG"\n\
chown postgres:postgres "$PG_LOG"\n\
\n\
# Initialize PostgreSQL if needed\n\
if [ ! -d "$PG_DATA" ] || [ -z "$(ls -A $PG_DATA 2>/dev/null)" ]; then\n\
    echo "Initializing PostgreSQL database..."\n\
    mkdir -p "$PG_DATA"\n\
    chown -R postgres:postgres "$PG_DATA"\n\
    su - postgres -c "$PG_BIN/initdb -D $PG_DATA"\n\
fi\n\
\n\
# Set ownership\n\
chown -R postgres:postgres "$PG_DATA"\n\
\n\
# Start PostgreSQL\n\
echo "Starting PostgreSQL..."\n\
su - postgres -c "$PG_BIN/pg_ctl -D $PG_DATA -l $PG_LOG start"\n\
\n\
# Wait for PostgreSQL to be ready\n\
sleep 5\n\
\n\
# Create user and database if they don'\''t exist\n\
su - postgres -c "psql --command \"CREATE USER root WITH SUPERUSER PASSWORD '\''password'\'';\" 2>/dev/null" || true\n\
su - postgres -c "createdb -O root laravel_db 2>/dev/null" || true\n\
\n\
# Create PostGIS extensions\n\
su - postgres -c "psql -d laravel_db -c \"CREATE EXTENSION IF NOT EXISTS postgis;\" 2>/dev/null" || true\n\
su - postgres -c "psql -d laravel_db -c \"CREATE EXTENSION IF NOT EXISTS postgis_topology;\" 2>/dev/null" || true\n\
\n\
echo "PostgreSQL is ready!"\n\
\n\
# Keep PostgreSQL running\n\
tail -f "$PG_LOG"\n' > /init-postgres.sh && \
    chmod +x /init-postgres.sh

# Create Laravel setup script
RUN printf '#!/bin/bash\n\
set -e\n\
cd /var/www\n\
\n\
# Wait for PostgreSQL to be ready\n\
echo "⏳ Waiting for PostgreSQL..."\n\
for i in {1..60}; do\n\
    if pg_isready -h localhost -p 5432 -U root 2>/dev/null; then\n\
        echo "✅ PostgreSQL is ready!"\n\
        break\n\
    fi\n\
    if [ $i -eq 60 ]; then\n\
        echo "⚠️  PostgreSQL did not start in time"\n\
        exit 1\n\
    fi\n\
    sleep 2\n\
done\n\
\n\
# Wait a bit more for database to be fully initialized and user created\n\
echo "⏳ Waiting for database initialization..."\n\
sleep 10\n\
\n\
# Test connection with retries\n\
for i in {1..10}; do\n\
    if PGPASSWORD=password psql -h localhost -U root -d laravel_db -c "SELECT 1;" >/dev/null 2>&1; then\n\
        echo "✅ Database connection successful!"\n\
        break\n\
    fi\n\
    if [ $i -eq 10 ]; then\n\
        echo "⚠️  Could not connect to database"\n\
        exit 1\n\
    fi\n\
    sleep 2\n\
done\n\
\n\
# Run database migrations\n\
echo "🗄️  Running database migrations..."\n\
php artisan migrate --force || true\n\
\n\
# Run database seeders\n\
echo "🌱 Running database seeders..."\n\
php artisan db:seed --force || true\n\
\n\
# Optimize Laravel for production\n\
echo "⚡ Optimizing Laravel..."\n\
php artisan config:cache || true\n\
php artisan route:cache || true\n\
php artisan view:cache || true\n\
\n\
# Create storage link\n\
echo "🔗 Creating storage link..."\n\
php artisan storage:link || true\n\
\n\
echo "✅ Laravel setup complete!"\n\
\n\
# Keep script running\n\
tail -f /dev/null\n' > /laravel-setup.sh && \
    chmod +x /laravel-setup.sh

# Configure supervisord
RUN printf '[supervisord]\n\
nodaemon=true\n\
\n\
[program:postgresql]\n\
command=/init-postgres.sh\n\
user=root\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/var/log/postgresql.err.log\n\
stdout_logfile=/var/log/postgresql.out.log\n\
\n\
[program:apache2]\n\
command=/bin/bash -c "source /etc/apache2/envvars && exec /usr/sbin/apache2 -DFOREGROUND"\n\
autostart=true\n\
autorestart=true\n\
stderr_logfile=/var/log/apache2.err.log\n\
stdout_logfile=/var/log/apache2.out.log\n\
\n\
[program:laravel-setup]\n\
command=/laravel-setup.sh\n\
autostart=true\n\
autorestart=false\n\
stderr_logfile=/var/log/laravel-setup.err.log\n\
stdout_logfile=/var/log/laravel-setup.out.log\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
