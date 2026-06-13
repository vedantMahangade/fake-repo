# Where each file goes

Copy these into your repo at `~/Projects/fake-repo`, keeping the same folders:

```
fake-repo/
├── .env                       # you create this (see below)
├── .gitignore                 # you create this (see below)
├── src/
│   ├── client.js              # <- src/client.js
│   └── hedera/
│       ├── createToken.js     # <- src/hedera/createToken.js
│       └── createAccount.js   # <- src/hedera/createAccount.js   (not needed today)
└── scripts/
    └── 02-create-token.js     # <- scripts/02-create-token.js
```

## One-time setup (run from the repo root)

```bash
cd ~/Projects/fake-repo
npm init -y
npm pkg set type=module
npm install @hashgraph/sdk dotenv
printf "node_modules/\n.env\nstate.json\n" > .gitignore
printf "OPERATOR_ID=0.0.9185844\nOPERATOR_KEY=YOUR_ECDSA_HEX_KEY\n" > .env
```

Replace `YOUR_ECDSA_HEX_KEY` with the ECDSA private key for operator 0.0.9185844
(from portal.hedera.com). Never commit `.env`.

## Run token creation

```bash
node scripts/02-create-token.js
```

Expected: prints a tokenId, a HashScan link, and writes `state.json`.
Open the HashScan link to confirm the token exists with your royalty fee.