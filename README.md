# RAAST E-commerce Demo

Documentation-first design for a public payment demo using Tapsys RAAST APIs, one configured merchant, Next.js with TypeScript on Vercel, and managed PostgreSQL.

## Current status

Initial, unversioned software design baseline. No application, database, live API verification, or Vercel deployment is included in this pass. The repository is private; the eventual payment page is intended to be public.

Supported design journeys:

- Dynamic QR: enter a PKR amount, display a QR with a 120-second payment window, and receive callback-driven status updates.
- Request to Pay (RTP): enter amount and payer details, confirm the fetched account title, and initiate RTP using the `rtpId` returned by title fetch.

## Documentation

- [Software design](docs/software-design.md): architecture, journeys, internal interfaces, storage, security, deployment, and acceptance matrix.
- [Provider API contract](docs/provider-api-contract.md): collection-derived requests, sanitized examples, evidence boundaries, and live integration dependencies.
- [Repository instructions](AGENTS.md): mandatory version allocation rules.

## Delivery phases

1. **This pass:** repository safeguards and reviewable design documentation.
2. **Implementation:** application, database migrations, provider adapter, isolated mock adapter, and automated tests.
3. **Integration:** verify provider contracts, callback authentication, test merchant access, and end-to-end outcomes.
4. **Deployment:** provision managed PostgreSQL and Vercel, configure server-only secrets and callback registration, validate, then enable public live initiation.

The architecture and internal APIs are proposed designs, not implemented capabilities. The Postman collection contains no saved responses or callback contract. The title-fetch response supplying `rtpId` is user-confirmed; its response field path and lifecycle still need verification.

## Configuration and secret handling

`.env.example` lists placeholders only; it is not a runnable configuration. Future local configuration belongs in ignored `.env.local`. Configure deployed secrets directly in Vercel, never in source or client-exposed variables. Production credentials must not be copied into preview deployments.

Never commit the original Postman collection, bearer tokens, client secrets, customer IBANs, raw callbacks, or provider response dumps. `.gitignore` helps exclude files but cannot sanitize tracked content. Review the staged diff and scan it for secrets before every push.

Default design limits are PKR 1–100 per payment, five initiation attempts per minute per browser session and per IP, and a 120-second QR window. These are application defaults, not verified provider limits.

No code version or release tag is assigned to this baseline. Apply the remote version allocation process before assigning a code version.
