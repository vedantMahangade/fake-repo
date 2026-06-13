import { writeFileSync } from "fs";
import { createTicketToken } from "../src/hedera/createToken.js";

const result = await createTicketToken();
console.log("Token created:", result.tokenId);
console.log("View it: https://hashscan.io/testnet/token/" + result.tokenId);

writeFileSync("state.json", JSON.stringify(result, null, 2));
console.log("Saved tokenId + keys to state.json");