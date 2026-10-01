# Azure simulation deployment — v0.1.0

Target: `transfer@20.84.97.186`, Linux amd64. Public hostname: `raastdemo.paysyslabs.com`. This release cannot make live Tapsys calls. Provider callbacks return 503. The synthetic QR uses `RAAST-DEMO-NOT-A-PAYMENT:<uuid>`, never the provider's payment payload.

## Architecture

```mermaid
flowchart LR
  Browser -->|HTTPS| NGINX[Existing host NGINX - new domain virtual host]
  NGINX -->|localhost 3100| App[Next.js simulation container]
  App --> DB[(PostgreSQL 16 - internal network)]
  DB --> Disk[/backupfiles/raastdemo/data]
  Apache[Existing Apache port 80] -->|ACME challenge and HTTPS redirect| Browser
```

Dedicated Compose project `raastdemo`; no port 5432 publication and no public application port. The database is on an internal Docker network; the app also joins a bridge network so Docker can publish its localhost port. No live adapter or provider request code is included. Apache and NGINX keep existing sites. PostgreSQL and app memory caps are 256 MB and 512 MB. A systemd unit checks the mounted data disk before startup; containers intentionally have no independent boot restart policy. Inspect unhealthy services with `docker compose ps` and recover the scoped project, not other services.

## Build and local verification

Use Node 24, `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`. Set placeholder values from `.env.example` in ignored `.env.local`. Apply migrations with `node --env-file=.env.local scripts/migrate.mjs`. Start on port 3100. Browser tests require an isolated PostgreSQL database named in `DATABASE_URL`; they truncate only that test database's demo tables. Never run them against deployed data. Set `CHROME_PATH` to an installed Chromium browser if the default Windows Chrome path does not apply.

Build on an amd64-capable machine outside the VM:

```bash
docker build --platform linux/amd64 --build-arg COMMIT="$(git rev-parse HEAD)" -t raastdemo:v0.1.0-<commit> .
docker save -o raastdemo-image.tar raastdemo:v0.1.0-<commit>
sha256sum raastdemo-image.tar
```

Transfer the image archive, its checksum, `compose.yaml`, and `deploy/` over SSH to `/backupfiles/raastdemo`. Record the actual image ID, commit, archive SHA256 and deployment checks in the release record. No repository credentials are installed on the VM.

## Host installation

1. Verify `uname -m`, mounted `/backupfiles`, free port 3100, current existing-site status, and free root space. `/var/lib/docker` holds image layers even though application data is on the data disk.
2. Require incoming image uncompressed size plus 1 GiB headroom on root. If needed, remove only unused build cache with `docker builder prune`; preserve existing stopped containers, their images and all volumes. Stop if space still fails the check. Do not use system-wide image/container/volume pruning.
3. Verify the archive SHA256 and `docker load` it. Keep previous app images for rollback. Reuse the host's existing PostgreSQL 16 Alpine image and record its ID; do not update it as part of application deployment.
4. Create `.env` with mode 600, random hexadecimal `DB_PASSWORD` and `SESSION_SECRET`, `DATA_DIR=/backupfiles/raastdemo/data`, the versioned `APP_IMAGE`, and `APP_PORT=3100`. Initially use `COOKIE_SECURE=false` and allow only the intended HTTP domain and localhost preview origins. Compose fixes mock mode and disables live payments regardless of secret availability.
5. With root privileges, execute `bash /backupfiles/raastdemo/deploy/install-host.sh`. It installs only the demo units and vhost, validates Apache before reloading, starts the health-checked stack, and creates a backup. Global Apache headers support is enabled if missing; existing vhosts are not edited.
6. Before DNS, use `ssh -L 3100:127.0.0.1:3100 transfer@20.84.97.186` and open `http://localhost:3100`. Do not change the existing IP-address/default virtual host.
7. Once the A record resolves to the VM, execute `deploy/enable-https.sh` as root. It uses the existing ACME account, creates a domain-specific certificate and NGINX vhost, verifies HTTPS, enables secure cookies and redirects HTTP, then tests renewal. It must not replace the certificates or routing of another site.

Passwords are entered only in SSH/sudo prompts. An existing authorized SSH key may be used. Do not write private keys or production environment values into Git or release logs.

## Verification and rollback

Check `/api/health`, both journeys and four scenarios, expired/late QR handling, cookie ownership, disabled callbacks, no external provider requests, image labels and memory limits. Confirm database data survives `docker compose restart`. Compare existing hostname status before and after changes. Verify HTTPS hostname/certificate, HTTP redirect, `certbot renew --cert-name raastdemo.paysyslabs.com --dry-run`, and daily timer status.

Backup runs daily at 02:15 UTC using `pg_dump`, gzip, and seven-day retention. Backups reside on the same disk; they are not disaster recovery. Validate a backup by restoring to a separate temporary test database, never by overwriting application data. Retention removes terminal demo records older than 30 days, expires unused contexts, and retains unresolved attempts.

For an application rollback, set `APP_IMAGE` to the recorded previous tag and run `docker compose --env-file .env up -d --wait app`. Do not use `down -v` or delete the data directory. The first release has no older app image, so validate restart/recreation recovery and document that a prior-version rollback is unavailable. Schema changes must stay backward compatible with the retained image. Vhost rollback restores the saved demo-only config, syntax-checks it, and reloads the affected server.

## Simulation behavior

Success/failure occurs after 10 seconds; late success after 130 seconds; no-confirmation has no due event. Due times are stored in PostgreSQL and applied atomically on status reads. The UI polls every two seconds until the 120-second waiting window ends; manual refresh can apply a late outcome. It does not imply the provider sent a callback. RTP title context is session-bound, valid for five minutes, and consumed exactly once. No real bank identifiers are collected.

Live release remains separate: verify network allowlisting, TLS, provider token expiry, RTP version, callback authentication and final-status semantics, then implement a separately reviewed provider adapter. Never turn a mock error into live fallback.
