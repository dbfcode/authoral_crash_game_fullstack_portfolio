ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_status_check;
ALTER TABLE bets ADD CONSTRAINT bets_status_check
  CHECK (status IN ('pending', 'active', 'cashed_out', 'lost', 'rejected'));
