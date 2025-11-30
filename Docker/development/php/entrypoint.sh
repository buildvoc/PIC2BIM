#!/bin/sh
set -e
cd /var/www
echo "Waiting for Postgres."
until pg_isready -h db -p 5432 -U root; do
  echo "Postgres not ready yet."
  sleep 2
done
echo "Postgres is ready!"
echo "Starting PHP container..."
# Ensure storage and cache folders exist
mkdir -p storage \
    storage/app/public \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache
# Fix permissions
chown -R www-data:www-data storage bootstrap/cache
# Install vendor if not present
if [ ! -d "vendor" ] || [ -z "$(ls -A vendor)" ]; then
    echo "📦 No vendor folder found — installing dependencies..."
    composer install
else
    echo "📦 Vendor folder exists — skipping composer install."
fi
# migrate database
php artisan migrate || true

# Clear caches (Laravel dev mode)
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true
echo "✔ PHP container is ready."
exec php-fpm
# #!/bin/sh
# set -e
# cd /var/www

# # Wait for Postgres
# echo "⏳ Waiting for database..."
# until pg_isready -h db -p 5432; do
#   sleep 2
# done
# echo "🚀 Starting PHP container..."
# mkdir -p \
#   storage/app/public \
#   storage/framework/cache \
#   storage/framework/sessions \
#   storage/framework/views \
#   storage/logs \
#   bootstrap/cache

# # Set correct permissions
# chown -R www-data:www-data storage bootstrap/cache
# php artisan config:cache
# php artisan route:cache
# php artisan view:cache
# # if [ ! -L public/storage ]; then
# #     php artisan storage:link
# # fi
# php artisan migrate
# php-fpm