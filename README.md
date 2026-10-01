# RAAST E-commerce Demo

Version **v0.1.0** — Next.js/TypeScript simulation for the Azure VM at `20.84.97.186`, intended for `https://raastdemo.paysyslabs.com`.

## Experience

- Dynamic QR with a 120-second window and a clearly non-payable QR payload.
- Request to Pay with fictional payer selection, account-title confirmation, and session-bound context.
- Success, failure, no confirmation, and late success scenarios with PostgreSQL persistence.
- Visible “Demo—no real payment” labelling, session isolation, idempotency and rate limits.

No live Tapsys adapter or credentials are deployed. Live callback routes are disabled. The internal container network has no external provider access. The public HTTPS deployment status is recorded separately from application test results in the release record.

## Documentation

- [Deployment and operations](docs/deployment.md)
- [Software design](docs/software-design.md)
- [Merchant connectivity model](docs/software-design.md#merchant-connectivity-and-deployment-model)
- [Provider contract](docs/provider-api-contract.md)
- [Supplied payload evidence](docs/provider-payload-evidence.md)
- [Version allocation rules](AGENTS.md)

## Development

Use Node 24 and `npm ci`. Copy `.env.example` to ignored `.env.local` and supply a local PostgreSQL URL and random session secret. Run `node --env-file=.env.local scripts/migrate.mjs`, then `npm run dev -- -p 3100`.

Validation: `npm test`, `npm run typecheck`, `npm run build`. Browser/API integration tests use Playwright against a running local app with a dedicated disposable database; see the deployment guide.

Never commit credentials, full customer IBANs, raw provider exports, QR contents from live responses, or environment files. `.gitignore` is supplemented by staged-content review. Root-disk capacity, existing host applications, and data-disk mount checks must be verified before deployment.
