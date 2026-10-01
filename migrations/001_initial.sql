CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY, owner text NOT NULL, flow text NOT NULL CHECK(flow IN ('qr','rtp')),
 amount integer NOT NULL CHECK(amount BETWEEN 100 AND 10000), scenario text NOT NULL,
 status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz,
 expires_at timestamptz, due_at timestamptz, outcome text, updated_at timestamptz NOT NULL DEFAULT now(),
 context_id uuid UNIQUE, context_expires_at timestamptz, payer_id text,
 simulated_rtp_id uuid, mode text NOT NULL DEFAULT 'mock' CHECK(mode = 'mock')
);
CREATE INDEX IF NOT EXISTS payments_owner_idx ON payments(owner);
CREATE TABLE IF NOT EXISTS idempotency (
 owner text NOT NULL, operation text NOT NULL, key text NOT NULL, fingerprint text NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner,operation,key)
);
CREATE TABLE IF NOT EXISTS rate_limits (
 subject text NOT NULL, category text NOT NULL, bucket bigint NOT NULL, count integer NOT NULL,
 PRIMARY KEY(subject,category,bucket)
);
CREATE TABLE IF NOT EXISTS payment_events (
 payment_id uuid PRIMARY KEY REFERENCES payments(id) ON DELETE CASCADE,
 source text NOT NULL CHECK(source='simulation'), outcome text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now()
);
