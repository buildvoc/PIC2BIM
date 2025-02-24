# Use official PHP image with Apache
FROM php:8.2-apache

# Install required dependencies
RUN apt-get update && apt-get install -y \
    git bash curl unzip zip libpq-dev libzip-dev \
    postgresql postgresql-contrib postgresql-15-postgis-3 postgresql-15-postgis-3-scripts \
    && docker-php-ext-install pdo pdo_pgsql zip

# Enable Apache Rewrite Module
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install Node.js and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm

# Set working directory
WORKDIR /var/www/html

# Copy Laravel app
COPY src /var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Install Node.js dependencies and build frontend
RUN npm install && npm run build

# Initialize PostgreSQL & Enable PostGIS
USER postgres

RUN service postgresql start && \
    psql --command "CREATE USER homestead WITH PASSWORD 'secret';" && \
    psql --command "CREATE DATABASE pic2bim OWNER homestead;" && \
    psql -d pic2bim --command "CREATE EXTENSION postgis;"

# Switch back to root
USER root

# Start PostgreSQL and Apache in a separate script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
# Expose port 80
EXPOSE 80

# Set up Laravel after PostgreSQL starts
CMD ["/usr/local/bin/docker-entrypoint.sh"]