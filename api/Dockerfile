FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev && docker-php-ext-install pdo_pgsql && a2enmod rewrite headers && sed -ri '/<Directory \/var\/www\/>/,/<\/Directory>/ s/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf && rm -rf /var/lib/apt/lists/*
COPY public/ /var/www/html/
COPY src/ /var/www/src/
COPY sql/ /var/www/sql/
COPY bin/ /var/www/bin/
RUN chown -R www-data:www-data /var/www/html
ENV APACHE_DOCUMENT_ROOT=/var/www/html
EXPOSE 80