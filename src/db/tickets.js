import { getDb } from "./db.js";

export function insertTicket({ tokenId, serial, metadataUri, metadataJson, status = "minted" }) {
  getDb()
    .prepare(
      "INSERT INTO tickets (token_id, serial, metadata_uri, metadata_json, status) VALUES (?, ?, ?, ?, ?)"
    )
    .run(tokenId, serial, metadataUri, metadataJson ? JSON.stringify(metadataJson) : null, status);
}

export function getTicket(tokenId, serial) {
  const row = getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? AND serial = ?")
    .get(tokenId, serial);
  if (!row) return null;
  return {
    ...row,
    metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  };
}

export function updateTicketStatus(tokenId, serial, status) {
  getDb()
    .prepare("UPDATE tickets SET status = ? WHERE token_id = ? AND serial = ?")
    .run(status, tokenId, serial);
}

export function listTickets(tokenId, { status } = {}) {
  if (status) {
    return getDb()
      .prepare("SELECT * FROM tickets WHERE token_id = ? AND status = ? ORDER BY serial")
      .all(tokenId, status);
  }
  return getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? ORDER BY serial")
    .all(tokenId);
}

export function listAvailablePrimary(tokenId) {
  return getDb()
    .prepare("SELECT * FROM tickets WHERE token_id = ? AND status = 'minted' ORDER BY serial")
    .all(tokenId);
}

export function recordOwnership({
  tokenId,
  serial,
  ownerAccountId,
  ownerNullifier,
  acquisition,
  priceHbar,
  txId,
}) {
  getDb()
    .prepare(
      `INSERT INTO ownership (
        token_id, serial, owner_account_id, owner_nullifier,
        acquisition, price_hbar, tx_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(tokenId, serial, ownerAccountId, ownerNullifier, acquisition, priceHbar, txId);
}

export function getCurrentOwner(tokenId, serial) {
  return getDb()
    .prepare(
      `SELECT * FROM ownership
       WHERE token_id = ? AND serial = ?
       ORDER BY acquired_at DESC, id DESC LIMIT 1`
    )
    .get(tokenId, serial);
}

export function getOwnershipHistory(tokenId, serial) {
  return getDb()
    .prepare(
      "SELECT * FROM ownership WHERE token_id = ? AND serial = ? ORDER BY acquired_at ASC"
    )
    .all(tokenId, serial);
}

export function listTicketsByOwner(ownerAccountId) {
  return getDb()
    .prepare(
      `SELECT t.*, o.acquisition, o.price_hbar, o.acquired_at
       FROM ownership o
       JOIN tickets t ON t.token_id = o.token_id AND t.serial = o.serial
       WHERE o.owner_account_id = ?
       AND o.id = (
         SELECT MAX(o2.id) FROM ownership o2
         WHERE o2.token_id = o.token_id AND o2.serial = o.serial
       )
       ORDER BY o.acquired_at DESC`
    )
    .all(ownerAccountId);
}

export function countSecondaryByNullifier(nullifierHash) {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS count FROM ownership WHERE owner_nullifier = ? AND acquisition = 'secondary'"
    )
    .get(nullifierHash);
  return row?.count ?? 0;
}
