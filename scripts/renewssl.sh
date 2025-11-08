#!/bin/bash
cd /var/www/fernetloshorneros

certbot renew --standalone --quiet

cp /etc/letsencrypt/live/fernetloshorneros.com/fullchain.pem /var/www/fernetloshorneros/ssl/
cp /etc/letsencrypt/live/fernetloshorneros.com/privkey.pem /var/www/fernetloshorneros/ssl/

chown root /var/www/fernetloshorneros/ssl/*
chmod 644 /var/www/fernetloshorneros/ssl/fullchain.pem
chmod 600 /var/www/fernetloshorneros/ssl/privkey.pem

cd /var/www/fernetloshorneros

echo "$(date): Renovacion ssl completada"