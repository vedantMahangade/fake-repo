import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../data/users.db");

let db;

function getDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);
  }
  return db;
}

export function findByNullifier(nullifierHash) {
  return getDb()
    .prepare("SELECT nullifier_hash, account_id, private_key, created_at FROM users WHERE nullifier_hash = ?")
    .get(nullifierHash);
}

export function createUser({ nullifierHash, accountId, privateKey }) {
  getDb()
    .prepare(
      "INSERT INTO users (nullifier_hash, account_id, private_key) VALUES (?, ?, ?)"
    )
    .run(nullifierHash, accountId, privateKey);
  return { nullifierHash, accountId };
}
