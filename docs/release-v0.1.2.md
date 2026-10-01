# v0.1.2 - RAAST ID and IBAN RTP input

Remote main allocated v0.1.1 and the other active branch allocated v0.1.0 when fetched and inspected. This release uses v0.1.2.

The checkout accepts validated RAAST ID or Pakistan IBAN input with synthetic examples. RAAST ID resolves locally to a synthetic IBAN before simulated PreRTPtitleFetch. Direct IBAN skips alias resolution. Confirmation retains a server-side RTP ID; no provider requests are made.

Migration 002 adds nullable payer type, masked reference and fictional title columns. No raw identifiers are stored. Historical payments remain readable. Rollback uses the previous image with the additive columns retained; clients must reload checkout after rollback because the older image expects fixture-based input.

Validation and deployment evidence follows after verification.
