import { NextResponse } from "next/server";
import { atomicResale } from "../../../../../../src/hedera/transferTicket.js";
import { getToken } from "../../../../../../src/db/tokens.js";
import {
  getTicket,
  getCurrentOwner,
  updateTicketStatus,
  recordOwnership,
  countSecondaryByNullifier,
} from "../../../../../../src/db/tickets.js";
import { requireUser } from "../../../../../../src/lib/auth.js";
import { verifyWorldIdProof, extractNullifier } from "../../../../../../src/world/verifyProof.js";

const SECONDARY_CAP = Number(process.env.SECONDARY_PURCHASE_CAP ?? 1);

export async function POST(request, { params }) {
  try {
    const { tokenId, serial: serialStr } = await params;
    const serial = Number(serialStr);
    const body = await request.json();
    const { sellerAccountId, buyerAccountId, priceHbar = 50, proof } = body;

    if (!sellerAccountId || !buyerAccountId || !proof) {
      return NextResponse.json(
        { error: "sellerAccountId, buyerAccountId, and proof are required" },
        { status: 400 }
      );
    }

    const action = process.env.WORLD_ACTION;
    if (!action) {
      return NextResponse.json({ error: "WORLD_ACTION is not configured" }, { status: 500 });
    }

    await verifyWorldIdProof(proof, action);
    const buyerNullifier = extractNullifier(proof);
    if (!buyerNullifier) {
      return NextResponse.json({ error: "Invalid proof" }, { status: 400 });
    }

    const secondaryCount = countSecondaryByNullifier(buyerNullifier);
    if (secondaryCount >= SECONDARY_CAP) {
      return NextResponse.json(
        { error: `Secondary purchase cap reached (${SECONDARY_CAP})` },
        { status: 409 }
      );
    }

    const token = getToken(tokenId);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const ticket = getTicket(tokenId, serial);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const owner = getCurrentOwner(tokenId, serial);
    if (!owner || owner.owner_account_id !== sellerAccountId) {
      return NextResponse.json({ error: "Seller does not own this ticket" }, { status: 400 });
    }

    const seller = requireUser(sellerAccountId);
    const buyer = requireUser(buyerAccountId);

    const result = await atomicResale({
      tokenId,
      serial,
      sellerAccountId: seller.account_id,
      sellerPrivateKey: seller.private_key,
      buyerAccountId: buyer.account_id,
      buyerPrivateKey: buyer.private_key,
      priceHbar: Number(priceHbar),
    });

    updateTicketStatus(tokenId, serial, "sold_secondary");
    recordOwnership({
      tokenId,
      serial,
      ownerAccountId: buyer.account_id,
      ownerNullifier: buyerNullifier,
      acquisition: "secondary",
      priceHbar: Number(priceHbar),
      txId: result.txId,
    });

    return NextResponse.json({
      success: true,
      txId: result.txId,
      hashscanUrl: `https://hashscan.io/testnet/transaction/${result.txId}`,
      royaltyNote: `${token.royalty_numerator}/${token.royalty_denominator} royalty sent to organizer ${token.organizer_account_id} on-chain`,
      organizerAccountId: token.organizer_account_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
