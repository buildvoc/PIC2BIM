# PIC2BIM

### Hosting and installing the web console


* #### Prepare Ubuntu Server

    ```
    sudo apt update && sudo apt upgrade -y
    ```

* ####  Install Docker and Docker Compose


    * #####  Install Docker
    ```
    sudo apt install docker.io -y
    ```
    * #####  Install Docker Compose
    ```
    sudo apt install docker-compose -y
    ```

    * #####  Start and enable the docker
    ```
    sudo systemctl enable docker
    sudo systemctl start docker
    ```

    * #####  Check docker installation
    ```
    docker --version
    docker-compose --version
    ```

* ####  Clone the project
    ```
    git clone git@github.com:buildvoc/PIC2BIM.git
    cd <your-project-directory>
    ```
* #### SSL

    Create a self-signed certificate for the nginx-server (only for development, for production use a real certificate)
    
    ```
    mkdir ./ssl/certs
    mkdir ./ssl/private
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./ssl/private/localhost.key -out ./ssl/certs/localhost.crt -config ./ssl/localhost.conf
    ```
    
    
        
* #### Set Up Environment Variables for docker and laravel
    * #####  Docker
        ```
        cp .env.example .env
        ```

        Note : For local development NPM_COMMAND="npm install && npm run dev -- --host 0.0.0.0" and for production NPM_COMMAND="npm install && npm run build"

    * #####  Laravel
        ```
        cp src/.env.example src/.env
        ```

* #### Update File Permissions

    ```
    sudo chown -R laravel:laravel storage bootstrap/cache
    sudo chmod -R 775 storage bootstrap/cache
    ```

* #### Build and Start the Docker Containers

    ```
    docker-compose up -d --build
    ```

* #### Create Database
    Login to adminer (https://yoursite:8091) with the credentials provided in .env file for docker
    * Create a database named "PIC2BIM"
    * Select public schema and execute the following query
        ```
        CREATE EXTENSION POSTGIS;
        ```
    
* #### Run Laravel Setup
    * #####  Install Composer dependencies
        ```
        docker-compose run --rm composer install
        ```
    * #####  Run Migration
        ```
        docker-compose run --rm artisan migrate
        ```
    * #####  Run Seeders
        ```
        docker-compose run --rm artisan db:seed
        ```