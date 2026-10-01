# v0.1.1 - Supplied payment brand logos

The supplied Raast and Tapsys PNGs are preserved unchanged in `public/brands`. A responsive shared brand strip displays both logos on checkout, QR, RTP, and result screens. Paysys branding and the no-real-payment banner remain visible. The previous text-only Raast placeholder has been removed.

Remote main and all active remote branches allocated at most v0.1.0 when inspected; this release uses v0.1.1. No payment API, database schema, or simulation timing changes.

Application image source: `c5f3795`.

## Verified results

- Production Linux AMD64 Docker build and TypeScript checks passed.
- Both original logo assets loaded on desktop (1440 px) and mobile (390 px); screenshots inspected, with no horizontal overflow. QR payment screen also displays both logos.
- Archive SHA-256 verified on the VM before loading: `d8d1998dbec8df1171e6a3a1cad1f9d89a7aae40582ddd1c3e37999710824eb5`.
- Available root space exceeded uncompressed incoming layers plus 1 GiB before loading; no pruning was required.
- Deployed image `raastdemo:v0.1.1-c5f3795`; health reports version 0.1.1 and commit `c5f3795e4948d9fe017aa1037fdd04f67e72b66e`.
- Existing persisted payment remained available after application replacement. PostgreSQL data and session secret were preserved.
- Previous image `raastdemo:v0.1.0-f1d06ec` retained for rollback.

The preview is available through the existing SSH tunnel at `http://localhost:3100`. Public DNS still has no A record as checked during deployment; HTTPS publication remains pending DNS and certificate setup. All payments remain simulated.

