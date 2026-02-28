FROM php:8.2-fpm-alpine

RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /var/www/html
COPY . .
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --optimize-autoloader

CMD php artisan optimize:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=80