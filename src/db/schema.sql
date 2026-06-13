CREATE TABLE IF NOT EXISTS users (
  nullifier_hash TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL UNIQUE,
  private_key    TEXT NOT NULL,
  created_at     TEXT DEFAULT (datetime('now'))
);
