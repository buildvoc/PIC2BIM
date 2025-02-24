#!/bin/bash

# Start PostgreSQL in the background
service postgresql start

# Wait until PostgreSQL is ready
until pg_isready -h 127.0.0.1 -p 5432 -U homestead; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

# Set up Laravel
cd /var/www/html
cp .env.example .env
php artisan key:generate
php artisan cache:clear
php artisan config:clear
php artisan migrate --force
php artisan db:seed
php artisan storage:link
chown -R www-data:www-data storage/

sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

# Start Apache
apache2-foreground