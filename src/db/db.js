import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(__dirname, "../../data/users.db");

let db;

function runMigrations(database) {
  const userCols = database.prepare("PRAGMA table_info(users)").all();
  if (!userCols.find((c) => c.name === "role")) {
    database.exec(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'purchaser'"
    );
  }

  const ticketCols = database.prepare("PRAGMA table_info(tickets)").all();
  if (ticketCols.length > 0 && !ticketCols.find((c) => c.name === "metadata_json")) {
    database.exec("ALTER TABLE tickets ADD COLUMN metadata_json TEXT");
  }

  const tokenCols = database.prepare("PRAGMA table_info(tokens)").all();
  if (tokenCols.length > 0 && !tokenCols.find((c) => c.name === "primary_price_hbar")) {
    database.exec(
      "ALTER TABLE tokens ADD COLUMN primary_price_hbar REAL NOT NULL DEFAULT 50"
    );
  }
}

function seedOperator(database) {
  const operatorId = process.env.OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  if (!operatorId || !operatorKey) return;

  const nullifierHash = `system:${operatorId}`;
  const existing = database
    .prepare("SELECT nullifier_hash FROM users WHERE account_id = ?")
    .get(operatorId);
  if (existing) {
    database
      .prepare("UPDATE users SET role = 'organizer' WHERE account_id = ?")
      .run(operatorId);
    return;
  }

  database
    .prepare(
      "INSERT INTO users (nullifier_hash, account_id, private_key, role) VALUES (?, ?, ?, 'organizer')"
    )
    .run(nullifierHash, operatorId, operatorKey);
}

export function getDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);
    runMigrations(db);
    seedOperator(db);
  }
  return db;
}
