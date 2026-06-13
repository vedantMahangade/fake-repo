import { NextResponse } from "next/server";
import { findByAccountId } from "../../../../src/db/users.js";
import {
  listTicketsByOwner,
  listFormerTicketsByOwner,
  getOwnershipHistory,
} from "../../../../src/db/tickets.js";

export async function GET(_request, { params }) {
  try {
    const { accountId } = await params;
    const user = findByAccountId(accountId);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const tickets = listTicketsByOwner(accountId).map((t) => ({
      tokenId: t.token_id,
      serial: t.serial,
      status: t.status,
      acquisition: t.acquisition,
      priceHbar: t.price_hbar,
      acquiredAt: t.acquired_at,
      history: getOwnershipHistory(t.token_id, t.serial),
    }));

    const formerTickets = listFormerTicketsByOwner(accountId);

    return NextResponse.json({
      user: { accountId: user.account_id, role: user.role },
      tickets,
      formerTickets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load wallet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
