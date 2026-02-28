FROM php:8.2-fpm-alpine

RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /var/www/html
COPY . .
RUN apt-get update && apt-get install -y zip unzip git
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
ENV COMPOSER_MEMORY_LIMIT=-1
RUN composer clear-cache && composer install --no-dev --optimize-autoloader --prefer-dist

CMD php artisan optimize:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=80