# Hedera World Cup Ticket

Anti-scalp NFT tickets on Hedera testnet, with World ID proof-of-human at onboarding.

Each ticket is an NFT with a **10% royalty** baked in at mint time. Users verify with **World ID** before getting a custodial Hedera wallet — one verified human maps to one account (Sybil protection).

---

## Quick start

### 1. Install

```bash
cd ~/Documents/Project/fake-repo
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Source |
|---|---|
| `OPERATOR_ID`, `OPERATOR_KEY` | [portal.hedera.com](https://portal.hedera.com) (testnet) |
| `WORLD_APP_ID`, `WORLD_RP_ID`, `WORLD_RP_SIGNING_KEY` | [developer.worldcoin.org](https://developer.worldcoin.org) |
| `WORLD_ACTION` | Action name you create in the portal (e.g. `ticket-onboarding`) |
| `NEXT_PUBLIC_*` | Same values as server-side World ID vars (for the browser) |

Set `WORLD_ENVIRONMENT=production` and `NEXT_PUBLIC_WORLD_ENVIRONMENT=production` when testing with the real World App on a phone. Use `staging` + the [World ID Simulator](https://simulator.worldcoin.org) for local dev.

### 2. Run the app (frontend + backend together)

```bash
npm run dev
```

Open `http://localhost:3000` (or the Network URL shown in the terminal when testing from a phone on the same Wi‑Fi).

Click **Verify & Create Ticket Wallet** → scan with World App → get a Hedera account ID + HashScan link.

### 3. Hedera CLI scripts (setup / dev)

Run in order from the repo root:

```bash
node scripts/01-check-balance.js   # operator HBAR balance
node scripts/02-create-token.js    # NFT collection with 10% royalty → state.json
node scripts/03-create-account.js  # dev-only buyer account (skips World ID)
node scripts/04-mint.js            # mint a ticket serial (needs mintTicket.js refactor)
```

---

## Project layout

```
fake-repo/
├── app/                          # Next.js app (one server for UI + API)
│   ├── page.jsx                  # World ID onboarding UI
│   └── api/
│       ├── world-id/sign/        # RP signature for IDKit v4
│       └── verify-and-onboard/   # verify proof → create Hedera account
├── src/
│   ├── client.js                 # Hedera testnet client factory
│   ├── state.js                  # state.json helpers
│   ├── db/                       # SQLite nullifier store (data/users.db)
│   ├── world/verifyProof.js      # World ID verify (v4 + v2 fallback)
│   └── hedera/
│       ├── createToken.js
│       ├── createAccount.js
│       └── mintTicket.js         # ⚠ still old Playground format
├── scripts/                      # CLI runners
├── data/users.db                 # gitignored — nullifier → account mapping
├── state.json                    # gitignored — tokenId, keys, latest buyer
└── .env                          # gitignored — never commit
```

---

## How World ID links to Hedera

1. User verifies in World App → IDKit returns a ZK proof with a **nullifier** (unique per human per action).
2. Backend verifies the proof with World's API (`/api/v4/verify/{rp_id}`).
3. Backend checks SQLite: has this nullifier been seen before?
   - **No** → `createUserAccount(60)` on Hedera testnet, save `nullifier → accountId` in `data/users.db`.
   - **Yes** → return **409 Already onboarded** with the existing account ID.
4. The link is stored in our database, not on-chain. Same nullifier cannot get a second wallet.

---

## Commands reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (UI + API) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `node scripts/01-check-balance.js` | Print operator HBAR balance |
| `node scripts/02-create-token.js` | Create NFT token with royalty fee |
| `node scripts/03-create-account.js` | Dev bypass — create buyer without World ID |
| `node scripts/04-mint.js` | Mint ticket NFT serial |

---

## Phone testing

When opening the app from your phone, use the **Network** URL from the terminal (e.g. `http://172.16.0.174:3000`). If you see a cross-origin warning, add your IP to `allowedDevOrigins` in `next.config.js`.

---

## Security

- **Testnet only.** Never commit `.env`, `state.json`, or `data/users.db`.
- `state.json` holds token supply/admin keys. `data/users.db` holds custodial buyer private keys.
- Rotate World ID signing keys if exposed.
