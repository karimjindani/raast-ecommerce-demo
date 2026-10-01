#!/bin/bash
# Run as root only once public DNS points to this VM and HTTP is reachable.
set -euo pipefail
base=/backupfiles/raastdemo
mountpoint -q /backupfiles
getent ahostsv4 raastdemo.paysyslabs.com | grep -q '^20\.84\.97\.186 '
# Reuse the host's registered ACME account; do not create or accept terms for a new account here.
certbot certonly --webroot -w "$base/acme" -d raastdemo.paysyslabs.com --non-interactive --keep-until-expiring
test -s /etc/letsencrypt/live/raastdemo.paysyslabs.com/fullchain.pem
target=/etc/nginx/conf.d/raastdemo.conf
if test -e "$target"; then cp -p "$target" "$base/releases/nginx-before.conf"; fi
install -m 644 "$base/deploy/nginx-https.conf" "$target"
if ! nginx -t; then
  if test -f "$base/releases/nginx-before.conf"; then cp -p "$base/releases/nginx-before.conf" "$target"; else rm -f "$target"; fi
  exit 1
fi
systemctl reload nginx
# Only after HTTPS is serving the intended site, enforce secure cookies and redirect.
curl --fail --silent --resolve raastdemo.paysyslabs.com:443:127.0.0.1 https://raastdemo.paysyslabs.com/api/health
sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=true/' "$base/.env"
sed -i 's|^APP_ORIGINS=.*|APP_ORIGINS=https://raastdemo.paysyslabs.com|' "$base/.env"
cd "$base"
docker compose --env-file .env up -d --wait app
cp -p /etc/apache2/sites-available/raastdemo.conf "$base/releases/apache-before-https.conf"
install -m 644 "$base/deploy/apache-https-redirect.conf" /etc/apache2/sites-available/raastdemo.conf
if ! apache2ctl configtest; then cp -p "$base/releases/apache-before-https.conf" /etc/apache2/sites-available/raastdemo.conf; exit 1; fi
systemctl reload apache2
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/raastdemo-nginx-reload
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/raastdemo-nginx-reload
certbot renew --cert-name raastdemo.paysyslabs.com --dry-run
