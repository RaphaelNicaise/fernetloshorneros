#!/bin/bash
cd /var/www/fernetloshorneros
docker compose stop nginx || true
certbot renew --standalone --quiet

cp /etc/letsencrypt/live/fernetloshorneros.com/fullchain.pem /var/www/fernetloshorneros/ssl/
cp /etc/letsencrypt/live/fernetloshorneros.com/privkey.pem /var/www/fernetloshorneros/ssl/

chown root /var/www/fernetloshorneros/ssl/*
chmod 644 /var/www/fernetloshorneros/ssl/fullchain.pem
chmod 600 /var/www/fernetloshorneros/ssl/privkey.pem

docker compose start nginx || docker compose up -d --build nginx
cd /var/www/fernetloshorneros

echo "$(date): Renovacion ssl completada"