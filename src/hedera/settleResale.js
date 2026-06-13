import { atomicResale } from "./transferTicket.js";
import { getToken } from "../db/tokens.js";
import {
  getTicket,
  getCurrentOwner,
  updateTicketStatus,
  recordOwnership,
  countSecondaryByNullifier,
} from "../db/tickets.js";
import { requireUser } from "../lib/auth.js";

const SECONDARY_CAP = Number(process.env.SECONDARY_PURCHASE_CAP ?? 1);

export async function settleSecondarySale({
  tokenId,
  serial,
  sellerAccountId,
  buyerAccountId,
  priceHbar,
  buyerNullifier,
}) {
  const secondaryCount = countSecondaryByNullifier(buyerNullifier);
  if (secondaryCount >= SECONDARY_CAP) {
    throw new Error(`Secondary purchase cap reached (${SECONDARY_CAP})`);
  }

  const token = getToken(tokenId);
  if (!token) {
    throw new Error("Token not found");
  }

  const ticket = getTicket(tokenId, serial);
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const owner = getCurrentOwner(tokenId, serial);
  if (!owner || owner.owner_account_id !== sellerAccountId) {
    throw new Error("Seller does not own this ticket");
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

  return {
    txId: result.txId,
    hashscanUrl: `https://hashscan.io/testnet/transaction/${result.txId}`,
    royaltyNote: `${token.royalty_numerator}/${token.royalty_denominator} royalty sent to organizer ${token.organizer_account_id} on-chain`,
    organizerAccountId: token.organizer_account_id,
  };
}
