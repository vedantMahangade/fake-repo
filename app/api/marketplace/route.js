import { NextResponse } from "next/server";
import { listTokens } from "../../../src/db/tokens.js";

export async function GET() {
  try {
    const tokens = listTokens();
    const collections = tokens.map((token) => ({
      tokenId: token.token_id,
      name: token.name,
      symbol: token.symbol,
      organizerAccountId: token.organizer_account_id,
      faceValueHbar: token.primary_price_hbar,
      mintedCount: token.minted_count,
      maxSupply: token.max_supply,
      remaining: token.max_supply - token.minted_count,
      soldOut: token.minted_count >= token.max_supply,
    }));

    return NextResponse.json({ collections });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load marketplace";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
