import Button from "../ui/Button.jsx";

export default function BidList({ bids, listingStatus, onAccept, onDecline, loading }) {
  if (!bids?.length) return null;

  return (
    <ul className="mt-3 space-y-2 border-t border-border pt-3">
      {bids.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-mono text-muted">
            {b.bidderAccountId}: <strong className="text-text">{b.bidPriceHbar} HBAR</strong>
            <span className="ml-2 text-xs">{b.status}</span>
          </span>
          {b.status === "pending" && listingStatus === "open" && (
            <span className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => onAccept(b.id)}
                loading={loading === `accept-${b.id}`}
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                onClick={() => onDecline(b.id)}
                loading={loading === `decline-${b.id}`}
              >
                Decline
              </Button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
