FROM php:8.2-fpm-alpine

RUN docker-php-ext-install pdo pdo_mysql
WORKDIR /var/www/html
COPY . .
RUN apk add --no-cache zip unzip git
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
ENV COMPOSER_MEMORY_LIMIT=-1
ENV COMPOSER_MAX_PARALLEL_HTTP=1
RUN composer install --no-dev --optimize-autoloader --prefer-source --no-cache

CMD php artisan optimize:clear && php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=80