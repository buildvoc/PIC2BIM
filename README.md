# PIC2BIM

## Overview
PIC2BIM is a powerful tool designed to convert images into Building Information Models (BIM). This project streamlines the transformation of visual data into structured digital models, facilitating efficient architectural and engineering workflows.


## Prerequisites
Ensure you have the following installed before proceeding:
- PHP 8.0 or later
- Composer
- Node.js & npm
- PostgreSQL database
- Laravel 11
- Git

## Database Import

Create a database named PIC2BIM using adminer or any other database tool
- Import the provided database file into PIC2BIM
- Open bld_fts_buildingpart database table and import the data dump of that table
- Drop codepoint table and import the provided codepoint dump file
- Execute the following query in the editor
```sh
DELETE from personal_access_tokens where id > 0
```


## Photos4all 

Unzip the provided photos4all folder in storage/app/public directory

## Installation Guide
Follow these steps to set up PIC2BIM locally:

### Step 1: Clone the Repository
```sh
git clone git@github.com:buildvoc/PIC2BIM.git
cd PIC2BIM
```

### Step 2: Checkout to Staging Branch
```sh
git checkout staging
```

### Step 3: Setup Environment Variables
```sh
cp .env.example .env
```
Update the `.env` file with your database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
```

### Step 4: Install Dependencies
```sh
composer install
npm install --save
```

### Step 5: Generate Application Key
```sh
php artisan key:generate
```

### Step 6: Run the Application
```sh
php artisan serve
```

### Step 7: Build Frontend Assets
```sh
npm run build
```

## Usage
Once the server is running, you can access the application via:
```
http://127.0.0.1:8000
```

## Contributing
We welcome contributions to improve PIC2BIM! To contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to your branch (`git push origin feature-branch`).
5. Open a Pull Request.

## License
This project is licensed under the MIT License.

## Contact
For support or inquiries, please open an issue on GitHub or reach out to the maintainers.

