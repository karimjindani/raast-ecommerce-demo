# v0.1.0 — Azure simulation release record

Date: 1 October 2026. **Docker deployment verified; public DNS and HTTPS pending.** No live Tapsys request or actual payment was made.

## Deployed artifact

| Item | Verified value |
|---|---|
| Host / architecture | `20.84.97.186` / Linux amd64 |
| Compose project / directory | `raastdemo` / `/backupfiles/raastdemo` |
| App image | `raastdemo:v0.1.0-f1d06ec` |
| Application source commit | `f1d06ec006df43e337c37c63623e9c5e0ada76e1` |
| Loaded image ID | `sha256:7be90c721b8213a919d8bcfb1a6e8227245ccef89441b918c3aef202ea7ee064` |
| Transferred archive SHA256 | `7c87a910050e9416498a968af74bd07e23e6742002616f65828ff98e7b7b5195` |
| Existing PostgreSQL image ID | `sha256:75f5a96988cdf694a215073c3e9c001b706b371e2f94df3967f2efdec2787f6b` |
| Application binding | `127.0.0.1:3100`; PostgreSQL has no published port |
| Resource caps | Application 512 MiB; PostgreSQL 256 MiB |
| Retained rollback image | `raastdemo:v0.1.0-fa5c409` |

Built outside the VM, transferred over SSH, and SHA256 verified before loading. Runtime `/api/health` confirms the source commit, version, mock mode, and database readiness. The Git release also includes operational documentation added after the application-image commit.

## Verification results

- Production build and TypeScript checks passed. Three domain tests and six Playwright browser/API tests passed.
- Browser coverage: desktop/mobile layout, QR success, RTP title confirmation and failure, no-confirmation persistence, expiry, late success, ownership isolation, origin checks, amount limits, idempotency, rate limits, concurrent RTP context claims, and disabled live callbacks. The late-event boundary test advances timestamps only in an isolated test database; deployed data is not altered by that suite.
- Linux image smoke tests passed for QR/RTP and database persistence. Final image handles a database-only restart without exiting on an idle PostgreSQL connection error.
- Deployed VM QR and RTP smoke tests passed. Both-container restart persistence was verified during rollout; the final deployed image reports the expected commit and healthy status.
- Rollback to the retained previous image and forward to the final image were tested locally against the persistent test database; the pending transaction survived. A production rollback was not performed.
- Daily backup timer is active for 02:15 UTC. A VM backup was restored into an isolated verification database and queried successfully; that temporary database was then removed. Backups are on the same data disk, not off-VM recovery.
- Apache's new domain virtual host returns HTTP 200. Existing hostnames retained their before/after responses: `paysyslabs.com` 200; existing IP-address application 503; LadiesFund portal 502. The latter two errors predated this deployment and were not repaired as part of this task.
- No existing container/image/volume or build cache was pruned. Root capacity passed the incoming-image-plus-1-GiB check before loading. Application data, archives and backups reside on `/backupfiles`.
- Production dependency audit reported zero vulnerabilities at verification time. Tracked-source credential-pattern checks passed; generated secrets exist only in restricted, untracked environment files.

## Access and outstanding publication step

The last public DNS check returned **NXDOMAIN** for `raastdemo.paysyslabs.com`. The domain is not publicly published over HTTPS yet. No certificate or successful renewal verification is claimed.

Preview from a workstation with SSH access:

```bash
ssh -L 3100:127.0.0.1:3100 transfer@20.84.97.186
```

Then open `http://localhost:3100`. An active tunnel was established on the development workstation during verification. Passwords belong only in the terminal prompt.

Remaining action: create DNS A record `raastdemo.paysyslabs.com → 20.84.97.186`. Once publicly resolvable, run the prepared `deploy/enable-https.sh` with host administration privileges. It obtains a dedicated certificate with the existing ACME account, installs the isolated NGINX site, enables secure cookies and HTTP redirection, and tests renewal. Public HTTPS, certificate renewal, and secure-cookie behavior must then be verified externally.

The application is deliberately simulation-only; enabling live RAAST payments remains a separate reviewed release.
