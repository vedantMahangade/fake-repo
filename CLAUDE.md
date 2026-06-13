# Hedera World Cup Ticket — Hackathon Onboarding

**ETHGlobal New York 2026** · anti-scalp NFT tickets on Hedera

---

## 1. What this is

Each World Cup ticket is an NFT on Hedera. When the organizer mints a ticket they bake in a **10% royalty fee**: every time the NFT moves in an atomic swap (NFT transferred in exchange for HBAR in the same transaction), the organizer gets 10% of the sale price automatically and without any app-level code. Authenticity is cryptographically guaranteed — no counterfeits. A per-wallet secondary-purchase cap is enforced in the backend by requiring a **World ID proof-of-humanity** before completing a resale, so one person cannot hoard tickets.

**What this is NOT:** there is no hard on-chain price cap. The royalty and the World ID cap together create strong disincentives for scalping, but a determined buyer can still overpay once. That framing matters for the pitch.

---

## 2. Prize targets

| Prize | Track | Why we qualify |
|---|---|---|
| Hedera Tokenization | $3,000 — anchor | Custom fees / royalties, NFT mint, on-chain transfer |
| World ID Track B | $2,500 | Secondary purchase requires a WLD proof; nullifier stored so one human = one resale |
| ENS pool | Small bolt-on | ENS subdomain as a human-readable ticket address |
| Hedera No-Solidity | $3,000 — fallback | HCS used as an audit log (second native Hedera service, zero Solidity) |

---

## 3. Tech stack

- **Runtime:** Node.js, ES modules (`"type": "module"` in package.json)
- **Hedera SDK:** `@hashgraph/sdk` v2.81+ — this is what the repo uses
- **Network:** Hedera testnet (custodial accounts, operator pays all fees)
- **Payment:** HBAR for the core sale; USDC planned later
- **Proof of human:** `@worldcoin/idkit` — frontend widget + backend verify call
- **Frontend/API:** planned Next.js (not in repo yet)

> **SDK name trap:** The Hedera Playground and older snippets use `@hiero-ledger/sdk`. This repo uses `@hashgraph/sdk`. The API is identical; only the import changes. Don't mix them.

---

## 4. Architecture & conventions

```
src/
  client.js          ← shared client factory (reads .env, returns a configured Client)  ⚠ MISSING
  state.js           ← loadState() / saveState() helpers for state.json                 ⚠ MISSING
  hedera/
    createToken.js   ← createTicketToken() — creates NFT collection with royalty fee
    createAccount.js ← createUserAccount(initialHbar) — custodial buyer account
    mintTicket.js    ← mintTickets(tokenId, supplyKey, pointers) — mint serials         ⚠ NOT REFACTORED (see below)

scripts/
  01-check-balance.js   ← prove connectivity; print operator HBAR balance
  02-create-token.js    ← call createTicketToken(), write state.json
  03-create-account.js  ← call createUserAccount(), write buyer into state.json         ⚠ broken (needs src/state.js)
  04-mint.js            ← call mintTickets(), write serials into state.json             ⚠ broken (needs src/state.js + mintTicket.js refactor)
```

**Rule:** `src/hedera/` functions are pure — no `console.log`, no `process.env` reads, they close the Hedera client before returning. Scripts are the runners: they read env, call the functions, log results, and read/write `state.json`.

**`state.json`** is the local store between script runs. It holds `tokenId`, all five token keys (DER-encoded), and test account info. It is gitignored.

### Known broken files (fix these first)

| File | Problem | Fix needed |
|---|---|---|
| `src/client.js` | Does not exist; all imports fail | Create it (see Getting Started) |
| `src/state.js` | Does not exist; scripts 03 and 04 throw on import | Create with `loadState` / `saveState` |
| `src/hedera/mintTicket.js` | Old Playground format: `require("@hiero-ledger/sdk")`, hardcoded tokenId/key, no named export | Refactor to `export async function mintTickets(tokenId, supplyKey, pointers)` |
| `scripts/client.js` | Stale duplicate of src/client.js | Delete it |

---

## 5. Key Hedera facts that bit us

- **Token keys are permanent.** All keys (admin, supply, freeze, pause, metadata) must be set at creation time and can never be added or removed afterward. Decide upfront.
- **NFT initial supply must be 0.** `setInitialSupply(0)` is required for `NonFungibleUnique` tokens. Any other value throws.
- **NFT metadata ≤100 bytes.** The on-chain metadata field holds a short pointer URL (e.g. `https://yourapp.com/api/tickets/123.json`), not the full ticket data. Keep it short.
- **Royalty only fires on an atomic swap.** The custom royalty fee only triggers when the NFT transfer and a HBAR/token payment happen in the same transaction (a `TransferTransaction` that moves both). A plain NFT transfer with no payment triggers only the fallback fee (fixed 5 HBAR).
- **Mirror Node lags ~5 seconds.** After a transaction reaches consensus, the REST API at `https://testnet.mirrornode.hedera.com` takes a few seconds to index it. Script 03 has a `setTimeout(5000)` before querying the EVM address.

---

## 6. Getting started

### One-time setup

```bash
cd ~/Projects/fake-repo
npm init -y
npm pkg set type=module
npm install @hashgraph/sdk dotenv
printf "node_modules/\n.env\nstate.json\n" > .gitignore
cp .env.example .env
# Edit .env: fill in your OPERATOR_ID and OPERATOR_KEY from portal.hedera.com
```

### Create `src/client.js` (missing — create this first)

```js
import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import "dotenv/config";

export const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
export const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY);

export function getClient() {
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  return client;
}
```

### Create `src/state.js` (missing — needed by scripts 03 and 04)

```js
import { readFileSync, writeFileSync, existsSync } from "fs";

const STATE_FILE = "state.json";

export function loadState() {
  return existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
}

export function saveState(updates) {
  const current = loadState();
  writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...updates }, null, 2));
}
```

### Run scripts in order

```bash
node scripts/01-check-balance.js   # proves .env and network are working
node scripts/02-create-token.js    # creates the NFT collection; writes state.json
node scripts/03-create-account.js  # creates a test buyer account; appends to state.json
node scripts/04-mint.js            # mints 1 ticket serial; appends serials to state.json
```

Each script prints a HashScan URL — open it to confirm on-chain.

---

## 7. Status & next steps

**Done**
- [x] `02`: Token creation with 10% royalty + fallback fee — `tokenId` in state.json
- [x] `04`: Mint script wired (blocked on `mintTicket.js` refactor)

**Blocked / in progress**
- [ ] Create `src/client.js` and `src/state.js`
- [ ] Refactor `src/hedera/mintTicket.js` into a proper named export

**Up next (in order)**
1. Atomic sale transaction (royalty lands on-chain) — `TransferTransaction` moving NFT + HBAR atomically
2. World ID integration — frontend IDKit widget, backend verify, nullifier stored in DB, secondary cap enforced
3. HCS audit log — every ticket event written to a Hedera Consensus Service topic (qualifies for No-Solidity prize)
4. Gate scan + ENS — QR code scan at the venue, ENS subdomain as ticket identity

---

## 8. Security

- **Testnet only.** All keys and account IDs in this repo are for `testnet`. Never use mainnet keys in this codebase.
- **Never commit `.env`.** It is in `.gitignore`. The file `.env.example` is the safe template.
- **`state.json` is gitignored.** It contains private keys (supply, freeze, pause, metadata, admin). Do not commit it. Back it up somewhere safe; losing it means you cannot mint more tickets for that token.
- The `state.json` currently in the working tree has DER-encoded ECDSA keys — fine for testnet, but treat them as you would real keys.
