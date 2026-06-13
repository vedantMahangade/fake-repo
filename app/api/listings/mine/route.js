import { NextResponse } from "next/server";
import {
  listListingsBySeller,
  listBidsForListing,
} from "../../../../src/db/listings.js";
import { getAccountIdFromRequest, requireUser } from "../../../../src/lib/auth.js";

export async function GET(request) {
  try {
    const accountId = getAccountIdFromRequest(request);
    requireUser(accountId);

    const listings = listListingsBySeller(accountId).map((listing) => ({
      ...listing,
      bids: listBidsForListing(listing.id),
    }));

    return NextResponse.json({ listings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load seller listings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
