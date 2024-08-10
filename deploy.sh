#!/bin/bash

ssh root@134.209.191.249 << 'EOF'
    # Ensure npm is available in the SSH session
    export PATH=$PATH:/usr/local/bin

    # Navigate to the project directory
    cd /var/www/admin

    # Pull the latest changes from the repository
    git pull origin main

    # Install/update PHP dependencies
    composer install --no-interaction --prefer-dist --optimize-autoloader

    # Install/update Node.js dependencies
    npm install

    # Run database migrations
    php artisan migrate --force

    # Build the frontend assets
    npm run build

    # Restart the web server (assuming using a service manager like systemd)
    # systemctl restart nginx
    # systemctl restart php-fpm
EOF
