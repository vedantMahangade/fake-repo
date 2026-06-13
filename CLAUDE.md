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
| World ID Track B | $2,500 | Onboarding + resale require World ID proof; nullifier stored so one human = one wallet / one secondary cap |
| ENS pool | Small bolt-on | ENS subdomain as a human-readable ticket address |
| Hedera No-Solidity | $3,000 — fallback | HCS used as an audit log (second native Hedera service, zero Solidity) |

---

## 3. Tech stack

- **Runtime:** Node.js, ES modules (`"type": "module"` in package.json)
- **Hedera SDK:** `@hashgraph/sdk` v2.81+
- **Network:** Hedera testnet (custodial accounts, operator pays all fees)
- **Payment:** HBAR for the core sale; USDC planned later
- **Proof of human:** `@worldcoin/idkit` v4 — IDKit widget + backend verify via `/api/v4/verify/{rp_id}`
- **App:** Next.js 16 (App Router) — single server for UI + API routes
- **Database:** SQLite (`better-sqlite3`) — nullifier → account mapping in `data/users.db`

> **SDK name trap:** The Hedera Playground and older snippets use `@hiero-ledger/sdk`. This repo uses `@hashgraph/sdk`. The API is identical; only the import changes. Don't mix them.

---

## 4. Architecture & conventions

```
app/
  page.jsx                         ← World ID onboarding UI (IDKitRequestWidget)
  api/world-id/sign/route.js       ← RP signature (signRequest) for IDKit v4
  api/verify-and-onboard/route.js  ← verify proof → sybil check → createUserAccount()

src/
  client.js                        ← shared Hedera client factory
  state.js                         ← loadState() / saveState() for state.json
  db/
    schema.sql                     ← users table (nullifier_hash PRIMARY KEY)
    users.js                       ← findByNullifier(), createUser()
  world/
    verifyProof.js                 ← verifyWorldIdProof(), extractNullifier()
  hedera/
    createToken.js                 ← createTicketToken() — NFT collection + royalty
    createAccount.js               ← createUserAccount(initialHbar) — custodial buyer
    mintTicket.js                  ← ⚠ NOT REFACTORED (old Playground format)

scripts/
  01-check-balance.js              ← operator HBAR balance
  02-create-token.js               ← createTicketToken(), write state.json
  03-create-account.js             ← dev bypass only (no World ID)
  04-mint.js                       ← mintTickets() — blocked on mintTicket.js refactor
```

**Rule:** `src/hedera/` functions are pure — no `console.log`, no `process.env` reads, they close the Hedera client before returning. Scripts and API routes are the runners: they read env, call the functions, log/return results, and read/write `state.json` or SQLite.

**`state.json`** — local store between script runs. Holds `tokenId`, all five token keys (DER-encoded), and latest `buyer`. Gitignored.

**`data/users.db`** — SQLite store for World ID nullifier → Hedera account mapping. Gitignored. This is the Sybil gate: one nullifier per action = one account.

### World ID onboarding flow

```
User → IDKit (browser) → World App QR → proof
  → POST /api/verify-and-onboard
    → verifyWorldIdProof() against developer.world.org
    → findByNullifier() in SQLite
    → if new: createUserAccount(60) + createUser() + saveState({ buyer })
    → if duplicate: 409 with existing accountId
```

IDKit v4 requires an RP signature before opening the widget. The frontend fetches `GET /api/world-id/sign` first, then opens `IDKitRequestWidget` with `deviceLegacy()` preset and `allow_legacy_proofs: true`. Proofs (v3 or v4 format) are forwarded byte-for-byte to `/api/v4/verify/{rp_id}` when `WORLD_RP_ID` is set.

### Known broken / remaining work

| File | Problem | Fix needed |
|---|---|---|
| `src/hedera/mintTicket.js` | Old Playground format: `require("@hiero-ledger/sdk")`, hardcoded tokenId/key, no named export | Refactor to `export async function mintTickets(tokenId, supplyKey, pointers)` |

---

## 5. Key Hedera facts that bit us

- **Token keys are permanent.** All keys (admin, supply, freeze, pause, metadata) must be set at creation time and can never be added or removed afterward. Decide upfront.
- **NFT initial supply must be 0.** `setInitialSupply(0)` is required for `NonFungibleUnique` tokens. Any other value throws.
- **NFT metadata ≤100 bytes.** The on-chain metadata field holds a short pointer URL (e.g. `https://yourapp.com/api/tickets/123.json`), not the full ticket data. Keep it short.
- **Royalty only fires on an atomic swap.** The custom royalty fee only triggers when the NFT transfer and a HBAR/token payment happen in the same transaction (a `TransferTransaction` that moves both). A plain NFT transfer with no payment triggers only the fallback fee (fixed 5 HBAR).
- **Mirror Node lags ~5 seconds.** After a transaction reaches consensus, the REST API at `https://testnet.mirrornode.hedera.com` takes a few seconds to index it. Script 03 and the onboarding API wait 5s before querying the EVM address.

---

## 6. Getting started

### One-time setup

```bash
cd ~/Documents/Project/fake-repo
npm install
cp .env.example .env
# Edit .env — see below
```

### Environment variables

```env
# Hedera (portal.hedera.com, testnet)
OPERATOR_ID=0.0.xxxx
OPERATOR_KEY=0x...

# World ID — server (developer.worldcoin.org)
WORLD_APP_ID=app_xxx
WORLD_RP_ID=rp_xxx
WORLD_RP_SIGNING_KEY=0x...
WORLD_ACTION=ticket-onboarding
WORLD_ENVIRONMENT=production   # or staging for simulator

# World ID — client (Next.js, must match server values)
NEXT_PUBLIC_WORLD_APP_ID=app_xxx
NEXT_PUBLIC_WORLD_ACTION=ticket-onboarding
NEXT_PUBLIC_WORLD_ENVIRONMENT=production
```

Create action `ticket-onboarding` in the World Developer Portal before testing. For phone demos use `production`; for local dev use `staging` + the World ID Simulator.

### Run the web app

```bash
npm run dev
# → http://localhost:3000
# → Network URL for phone testing (same Wi‑Fi)
```

### Run Hedera scripts (in order)

```bash
node scripts/01-check-balance.js
node scripts/02-create-token.js
node scripts/03-create-account.js   # dev bypass — production onboarding uses /api/verify-and-onboard
node scripts/04-mint.js           # blocked until mintTicket.js is refactored
```

Each script prints a HashScan URL — open it to confirm on-chain.

---

## 7. Status & next steps

**Done**
- [x] `src/client.js` and `src/state.js`
- [x] `02`: Token creation with 10% royalty + fallback fee — `tokenId` in state.json
- [x] World ID onboarding — Next.js UI, RP signing, proof verify, SQLite nullifier store, Hedera account creation
- [x] Sybil gate at onboarding — one nullifier → one Hedera account (409 on re-verify)

**Blocked / in progress**
- [ ] Refactor `src/hedera/mintTicket.js` into a proper named export (blocks script 04)

**Up next (in order)**
1. Atomic sale transaction (royalty lands on-chain) — `TransferTransaction` moving NFT + HBAR atomically
2. World ID on secondary purchase — reuse nullifier table to enforce per-human resale cap
3. HCS audit log — every ticket event written to a Hedera Consensus Service topic (qualifies for No-Solidity prize)
4. Gate scan + ENS — QR code scan at the venue, ENS subdomain as ticket identity

---

## 8. Security

- **Testnet only.** All keys and account IDs in this repo are for `testnet`. Never use mainnet keys in this codebase.
- **Never commit `.env`.** It is in `.gitignore`. The file `.env.example` is the safe template.
- **`state.json` is gitignored.** It contains private keys (supply, freeze, pause, metadata, admin). Do not commit it. Back it up somewhere safe; losing it means you cannot mint more tickets for that token.
- **`data/users.db` is gitignored.** It contains custodial buyer private keys keyed by World ID nullifier. Do not commit it.
- **`WORLD_RP_SIGNING_KEY` is server-only.** Never expose it via `NEXT_PUBLIC_*` or commit it.
- For phone testing, add your LAN IP to `allowedDevOrigins` in `next.config.js` if Next.js blocks cross-origin dev requests.
