import { mintTickets } from "../src/hedera/mintTicket.js";
import { loadState, saveState } from "../src/state.js";

const { tokenId, keys } = loadState();
if (!tokenId || !keys?.supply) {
  throw new Error("Missing tokenId/supply key. Run scripts/02-create-token.js first.");
}

// For testing: mint 1 ticket with a placeholder pointer.
// Later: build one pointer per ticket from real attributes (see notes).
const pointers = [`https://yourapp.com/api/tickets/${tokenId}/placeholder.json`];

const { serials } = await mintTickets(tokenId, keys.supply, pointers);

console.log("Minted serials:", serials.join(", "));
serials.forEach((s) =>
  console.log("  https://hashscan.io/testnet/token/" + tokenId + "/" + s)
);

saveState({ lastMintedSerials: serials });
console.log("Saved to state.json");