-- Tandas MVP schema
CREATE TABLE IF NOT EXISTS tandas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('semanal', 'quincenal', 'mensual')),
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'active', 'completed')),
  current_round INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  tanda_id TEXT NOT NULL REFERENCES tandas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  clabe TEXT NOT NULL,
  pey_bank_account_id TEXT,
  pey_codi_status TEXT DEFAULT 'pending',
  turn_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_tanda_idx ON members(tanda_id);
CREATE INDEX IF NOT EXISTS members_turn_idx ON members(tanda_id, turn_order);

CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  tanda_id TEXT NOT NULL REFERENCES tandas(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  beneficiary_member_id TEXT NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'complete', 'canceled')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  UNIQUE (tanda_id, round_number)
);

CREATE INDEX IF NOT EXISTS rounds_tanda_idx ON rounds(tanda_id);

CREATE TABLE IF NOT EXISTS charges (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  payer_member_id TEXT NOT NULL REFERENCES members(id),
  amount_cents INTEGER NOT NULL,
  concept TEXT NOT NULL,
  num_ref TEXT NOT NULL,
  pey_qr_id TEXT,
  qr_string TEXT,
  qr_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'canceled')),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS charges_round_idx ON charges(round_id);
CREATE INDEX IF NOT EXISTS charges_pey_qr_idx ON charges(pey_qr_id);
CREATE INDEX IF NOT EXISTS charges_num_ref_idx ON charges(num_ref);
