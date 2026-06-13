"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAccountId, AUTH_EVENT } from "../lib/storage.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000);

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [bidAmounts, setBidAmounts] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(null);

  const loadListings = useCallback(async () => {
    const res = await fetch("/api/listings");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setListings(data.listings ?? []);
  }, []);

  useEffect(() => {
    setAccountId(getStoredAccountId());
    loadListings().catch((e) => setError(e.message));

    function onAuth() {
      setAccountId(getStoredAccountId());
    }
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, [loadListings]);

  useEffect(() => {
    const timer = setInterval(() => {
      loadListings().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadListings]);

  async function placeBid(listing) {
    if (!accountId) {
      setError("Log in to place a bid");
      return;
    }
    const amount = Number(bidAmounts[listing.id] ?? listing.askPriceHbar);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid bid amount");
      return;
    }
    setLoading(listing.id);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listing.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Account-Id": accountId,
        },
        body: JSON.stringify({ bidPriceHbar: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.balanceWarning) alert(`Bid placed. Warning: ${data.balanceWarning}`);
      else if (data.autoAccepted) {
        alert(`Buy now! Your bid met the ask price (${amount} HBAR). Confirm in My Tickets.`);
      } else {
        alert(`Bid of ${amount} HBAR placed. Seller can accept, decline, or wait for more bids.`);
      }
      await loadListings();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main>
      <h1>Resale listings</h1>
      <p>
        Browse tickets listed by sellers. Place a bid below the ask, or bid at/above ask for instant accept (buy now).
        {!accountId && (
          <>
            {" "}
            <Link href="/login">Log in</Link> to bid.
          </>
        )}
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {listings.length === 0 ? (
        <p>No open listings. Sellers list tickets from <Link href="/wallet">My Tickets</Link>.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {listings.map((item) => (
            <li
              key={item.id}
              style={{ padding: "1rem", marginBottom: "0.5rem", background: "#f9f9f9", borderRadius: 8 }}
            >
              <strong>{item.tokenName ?? "Ticket"}</strong> #{item.serial}
              <br />
              Token: {item.tokenId} · Seller: {item.sellerAccountId}
              <br />
              Ask: <strong>{item.askPriceHbar} HBAR</strong>
              {item.highestBidHbar != null && (
                <> · Highest bid: {item.highestBidHbar} HBAR ({item.bidCount} bid{item.bidCount !== 1 ? "s" : ""})</>
              )}
              <br />
              Expires: {new Date(item.expiresAt).toLocaleString()}
              <br />
              {accountId === item.sellerAccountId ? (
                <em style={{ color: "#666" }}>Your listing — manage bids in My Tickets</em>
              ) : (
                <div style={{ marginTop: "0.5rem" }}>
                  <input
                    type="number"
                    placeholder={`Bid (ask ${item.askPriceHbar})`}
                    value={bidAmounts[item.id] ?? ""}
                    onChange={(e) => setBidAmounts({ ...bidAmounts, [item.id]: e.target.value })}
                    style={{ width: 120 }}
                  />
                  <button
                    type="button"
                    onClick={() => placeBid(item)}
                    disabled={loading === item.id}
                    style={{ marginLeft: "0.5rem" }}
                  >
                    {loading === item.id ? "…" : bidAmounts[item.id] >= item.askPriceHbar ? "Buy now" : "Place bid"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
