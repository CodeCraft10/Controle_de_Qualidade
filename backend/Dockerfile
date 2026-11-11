FROM php:8.4-cli-alpine
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && docker-php-ext-install pdo_mysql \
    && apk del .build-deps
COPY --chown=www-data:www-data . /app/
WORKDIR /app
ENV STORAGE_PATH=var/state.json
USER www-data
EXPOSE 8000
CMD ["php", "-d", "upload_max_filesize=5M", "-d", "post_max_size=6M", "-d", "display_errors=0", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
