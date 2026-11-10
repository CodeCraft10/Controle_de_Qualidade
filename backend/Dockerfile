FROM php:8.4-cli
WORKDIR /app
COPY . .
RUN chmod -R a+rX /app && mkdir -p var && chown www-data:www-data var && chmod 700 var
USER www-data
EXPOSE 8000
CMD ["php", "-d", "upload_max_filesize=5M", "-d", "post_max_size=6M", "-d", "display_errors=0", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
