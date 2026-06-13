import { getDb } from "./db.js";

export function findByNullifier(nullifierHash) {
  return getDb()
    .prepare(
      "SELECT nullifier_hash, account_id, private_key, role, created_at FROM users WHERE nullifier_hash = ?"
    )
    .get(nullifierHash);
}

export function findByAccountId(accountId) {
  return getDb()
    .prepare(
      "SELECT nullifier_hash, account_id, private_key, role, created_at FROM users WHERE account_id = ?"
    )
    .get(accountId);
}

export function createUser({ nullifierHash, accountId, privateKey, role = "purchaser" }) {
  getDb()
    .prepare(
      "INSERT INTO users (nullifier_hash, account_id, private_key, role) VALUES (?, ?, ?, ?)"
    )
    .run(nullifierHash, accountId, privateKey, role);
  return { nullifierHash, accountId, role };
}

export function setRole(accountId, role) {
  const result = getDb()
    .prepare("UPDATE users SET role = ? WHERE account_id = ?")
    .run(role, accountId);
  if (result.changes === 0) return null;
  return findByAccountId(accountId);
}

export function promoteToReseller(accountId) {
  const user = findByAccountId(accountId);
  if (!user || user.role === "organizer") return user;
  if (user.role === "reseller") return user;
  return setRole(accountId, "reseller");
}
