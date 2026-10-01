#!/bin/bash
# Run as root after the reviewed release files and app image are present.
set -euo pipefail
base=/backupfiles/raastdemo
mountpoint -q /backupfiles
test -s "$base/.env"
test -s "$base/compose.yaml"
# Never modify any other virtual host or container project.
install -m 644 "$base/deploy/raastdemo.service" /etc/systemd/system/raastdemo.service
install -m 644 "$base/deploy/raastdemo-backup.service" /etc/systemd/system/raastdemo-backup.service
install -m 644 "$base/deploy/raastdemo-backup.timer" /etc/systemd/system/raastdemo-backup.timer
systemctl daemon-reload
systemctl enable raastdemo.service raastdemo-backup.timer
systemctl start raastdemo.service
systemctl start raastdemo-backup.timer
a2enmod headers
target=/etc/apache2/sites-available/raastdemo.conf
if test -e "$target"; then cp -p "$target" "$base/releases/apache-before.conf"; fi
install -m 644 "$base/deploy/apache-http.conf" "$target"
a2ensite raastdemo.conf
if ! apache2ctl configtest; then
  if test -f "$base/releases/apache-before.conf"; then cp -p "$base/releases/apache-before.conf" "$target"; else a2dissite raastdemo.conf; fi
  exit 1
fi
systemctl reload apache2
systemctl start raastdemo-backup.service
curl --fail --silent http://127.0.0.1:3100/api/health
