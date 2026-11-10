FROM node:24-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM php:8.4-apache
RUN a2enmod rewrite headers
COPY deploy/apache.conf /etc/apache2/sites-available/000-default.conf
COPY deploy/php.ini /usr/local/etc/php/conf.d/gp4.ini
COPY backend/ /var/www/html/backend/
COPY public/ /var/www/html/public/
COPY --from=frontend /web/ /var/www/html/web/
RUN mkdir -p /var/www/html/backend/var \
    && chown -R www-data:www-data /var/www/html/backend/var \
    && chmod -R a+rX /var/www/html \
    && chmod 700 /var/www/html/backend/var
WORKDIR /var/www/html
ENV STORAGE_PATH=var/state.json
EXPOSE 80
