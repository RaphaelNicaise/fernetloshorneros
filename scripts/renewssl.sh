#!/bin/bash
set -e

docker compose -f /var/www/fernetloshorneros/docker-compose.yml stop nginx

certbot renew --quiet

cp /etc/letsencrypt/live/fernetloshorneros.com/fullchain.pem /var/www/fernetloshorneros/ssl/
cp /etc/letsencrypt/live/fernetloshorneros.com/privkey.pem /var/www/fernetloshorneros/ssl/

chmod 644 /var/www/fernetloshorneros/ssl/fullchain.pem
chmod 600 /var/www/fernetloshorneros/ssl/privkey.pem

docker compose -f /var/www/fernetloshorneros/docker-compose.yml up -d nginx

echo "$(date) SSL renovado OK"