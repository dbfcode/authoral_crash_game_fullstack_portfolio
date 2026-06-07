CREATE TABLE IF NOT EXISTS chain_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  seeds JSONB NOT NULL,
  current_index INT NOT NULL
);
