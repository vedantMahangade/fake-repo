"use client";

import Link from "next/link";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";
import { ticketDetailUrl } from "../../lib/routes.js";

function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function bidStatusVariant(status) {
  if (status === "completed" || status === "accepted") return "accent";
  if (status === "rejected" || status === "cancelled" || status === "expired") return "default";
  return "pending";
}

export function MarketplaceSaleCard({ sale }) {
  const winningBid = sale.winningBid;
  const otherBids = (sale.bids ?? []).filter((b) => b.id !== winningBid?.id);

  return (
    <Card>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <Link
            href={ticketDetailUrl(sale.tokenId, sale.serial)}
            className="text-lg font-medium hover:text-accent transition-colors"
          >
            #{sale.serial}
          </Link>
          <p className="font-mono text-xs text-muted mt-1">{sale.tokenId}</p>
        </div>
        <Badge variant="accent">Sold</Badge>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted">Listed</dt>
          <dd>{formatWhen(sale.createdAt)} · ask {sale.askPriceHbar} HBAR</dd>
        </div>
        {winningBid && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted">Sale</dt>
            <dd>
              {formatWhen(winningBid.respondedAt ?? sale.createdAt)} ·{" "}
              <span className="text-accent font-medium">{sale.salePriceHbar} HBAR</span>
            </dd>
          </div>
        )}
        {sale.buyerAccountId && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] uppercase tracking-widest text-muted">Buyer</dt>
            <dd className="font-mono text-xs break-all">{sale.buyerAccountId}</dd>
          </div>
        )}
      </dl>

      {(sale.bids?.length ?? 0) > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] uppercase tracking-widest text-muted mb-2">Bids received</p>
          <ul className="space-y-2">
            {winningBid && (
              <li className="flex flex-wrap items-center justify-between gap-2 text-sm bg-accent/5 border border-accent/20 rounded px-3 py-2">
                <span className="font-mono text-xs break-all">{winningBid.bidderAccountId}</span>
                <span className="flex items-center gap-2">
                  <strong className="text-accent">{winningBid.bidPriceHbar} HBAR</strong>
                  <Badge variant="accent">Accepted · sold</Badge>
                </span>
              </li>
            )}
            {otherBids.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted px-1"
              >
                <span className="font-mono text-xs break-all">{b.bidderAccountId}</span>
                <span className="flex items-center gap-2">
                  <span>{b.bidPriceHbar} HBAR</span>
                  <Badge variant={bidStatusVariant(b.status)}>{b.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function FormerTicketCard({ ticket }) {
  return (
    <Card>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div>
          <Link
            href={ticketDetailUrl(ticket.tokenId, ticket.serial)}
            className="text-lg font-medium hover:text-accent transition-colors"
          >
            #{ticket.serial}
          </Link>
          <p className="font-mono text-xs text-muted mt-1">{ticket.tokenId}</p>
        </div>
        <Badge variant="default">Previously owned</Badge>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted">You held</dt>
          <dd>
            {formatWhen(ticket.heldFrom)}
            {ticket.boughtPriceHbar != null ? ` · bought @ ${ticket.boughtPriceHbar} HBAR` : ""}
          </dd>
        </div>
        {ticket.soldTo && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted">Transferred out</dt>
            <dd>
              {formatWhen(ticket.heldUntil)}
              {ticket.soldPriceHbar != null ? ` · ${ticket.soldPriceHbar} HBAR` : ""}
            </dd>
          </div>
        )}
        {ticket.soldTo && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] uppercase tracking-widest text-muted">To</dt>
            <dd className="font-mono text-xs break-all">
              {ticket.soldTo}
              {ticket.saleTxId && (
                <>
                  {" · "}
                  <a
                    href={`https://hashscan.io/testnet/transaction/${ticket.saleTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent"
                  >
                    tx
                  </a>
                </>
              )}
            </dd>
          </div>
        )}
      </dl>
    </Card>
  );
}
