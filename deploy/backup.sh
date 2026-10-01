#!/bin/sh
set -eu
umask 077
mountpoint -q /backupfiles
cd /backupfiles/raastdemo
mkdir -p backups
name="backups/raastdemo-$(date -u +%Y%m%dT%H%M%SZ).sql"
trap 'rm -f "$name.tmp"' EXIT
docker compose --env-file .env exec -T db pg_dump -U raastdemo -d raastdemo > "$name.tmp"
test -s "$name.tmp"
mv "$name.tmp" "$name"
gzip "$name"
find /backupfiles/raastdemo/backups -maxdepth 1 -type f -name 'raastdemo-*.sql.gz' -mtime +6 -delete
# Demo retention; preserve unresolved attempts for inspection.
docker compose --env-file .env exec -T db psql -U raastdemo -d raastdemo -v ON_ERROR_STOP=1 <<'SQL'
DELETE FROM rate_limits WHERE bucket < extract(epoch from now())/60-1440;
DELETE FROM idempotency WHERE created_at < now()-interval '30 days';
UPDATE payments SET status='ABANDONED', simulated_rtp_id=NULL WHERE status='AWAITING_CONFIRMATION' AND context_expires_at<now();
UPDATE payments SET simulated_rtp_id=NULL WHERE updated_at<now()-interval '1 day';
DELETE FROM payments WHERE status IN ('SUCCEEDED','FAILED','ABANDONED') AND updated_at<now()-interval '30 days';
SQL
