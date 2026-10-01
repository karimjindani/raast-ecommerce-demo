# v0.1.2 - RAAST ID and IBAN RTP input

Remote main allocated v0.1.1 and the other active branch allocated v0.1.0 when fetched and inspected. This release uses v0.1.2.

The checkout accepts validated RAAST ID or Pakistan IBAN input with synthetic examples. RAAST ID resolves locally to a synthetic IBAN before simulated PreRTPtitleFetch. Direct IBAN skips alias resolution. Confirmation retains a server-side RTP ID; no provider requests are made.

Migration 002 adds nullable payer type, masked reference and fictional title columns. No raw identifiers are stored. Historical payments remain readable. Rollback uses the previous image with the additive columns retained; clients must reload checkout after rollback because the older image expects fixture-based input.

## Verified evidence

- Seven unit tests passed: mobile/IBAN validation, normalization, lookup ordering, missing RTP ID and lookup failure handling.
- All 16 browser/API tests passed, including both payer types across all four scenarios, confirmation resets, private storage/responses, expired contexts, concurrency, idempotency and QR regression coverage. One initial QR navigation timeout during development compilation passed on targeted rerun. Long-wait scenarios use database time advancement; ordinary success/failure tests also exercise real 10-second waits.
- TypeScript and production builds passed. Linux AMD64 image `raastdemo:v0.1.2-1501d1f` built from `1501d1f3baf4dcd377222043d59aab2f96177ef2`.
- The exact production image passed both forms, desktop/mobile screenshot review and application-restart persistence locally. No external browser requests were observed; mock provider source contains no network transport.
- Archive SHA-256 verified on Azure before loading: `32bf4bcf488ef6ab4960fc00933df4349b90012c93e8a0b3a4b4e8090adf4843`.
- Root free space exceeded incoming uncompressed layers (231,611,392 bytes) plus 1 GiB. No pruning required; data disk mount checked and database backup completed before migration.
- Azure application and database are healthy; health reports v0.1.2 and the expected source commit. Both new entry paths passed through the SSH preview tunnel. A pre-upgrade payment remained readable with its original session after deployment.
- Previous image `raastdemo:v0.1.1-c5f3795` retained. Existing site response checks remained unchanged: paysyslabs.com 200, IP default 503, LadiesFund portal 502. The latter two failures predated this release.

Public DNS still has no A record at the deployment check, so HTTPS publication remains pending DNS/certificate setup. The SSH preview remains `http://localhost:3100`. No real payments or live account lookup are enabled.
