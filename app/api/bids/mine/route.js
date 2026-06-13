import { NextResponse } from "next/server";
import { listBidsByBidder } from "../../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);
    return NextResponse.json({ bids: listBidsByBidder(accountId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load bids";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
