CREATE TABLE IF NOT EXISTS rounds (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('betting', 'running', 'crashed', 'settled')),
  committed_round_hash TEXT NOT NULL,
  next_round_hash TEXT,
  previous_round_hash TEXT,
  round_seed TEXT,
  crash_point TEXT,
  nonce BIGINT NOT NULL,
  client_seed TEXT,
  algorithm_version TEXT NOT NULL DEFAULT 'v1-chain',
  current_multiplier_hundredths BIGINT,
  chain_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'cashed_out', 'lost')),
  cashout_multiplier TEXT,
  payout_cents BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_rounds_status_created ON rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_player_created ON bets(player_id, created_at DESC);
