"use client";

import { useEffect, useState } from "react";
import { getStoredAccountId } from "./lib/storage.js";

export default function MarketplacePage() {
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(null);

  async function loadMarketplace() {
    const res = await fetch("/api/marketplace");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setCollections(data.collections ?? []);
  }

  useEffect(() => {
    setAccountId(getStoredAccountId());
    loadMarketplace().catch((e) => setError(e.message));
  }, []);

  async function buyTicket(tokenId) {
    if (!accountId) {
      setError("Log in or create a wallet first");
      return;
    }
    setLoading(tokenId);
    setError(null);
    try {
      const res = await fetch(`/api/tokens/${tokenId}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerAccountId: accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`Ticket #${data.serial} minted and purchased! TX: ${data.txId}`);
      await loadMarketplace();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <main>
      <h1>Ticket Marketplace</h1>
      <p>
        Primary sales — each purchase mints a new ticket at the organizer&apos;s face value.
        {!accountId && (
          <>
            {" "}
            <a href="/login">Log in</a> or <a href="/onboard">create a wallet</a>
          </>
        )}
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {collections.length === 0 ? (
        <p>No collections yet. Organizers can create one at <a href="/organizer">/organizer</a>.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {collections.map((item) => (
            <li
              key={item.tokenId}
              style={{ padding: "1rem", marginBottom: "0.5rem", background: "#f9f9f9", borderRadius: 8 }}
            >
              <strong>{item.name}</strong> ({item.symbol})
              <br />
              Token: {item.tokenId} · Organizer: {item.organizerAccountId}
              <br />
              Face value: {item.faceValueHbar} HBAR
              <br />
              {item.remaining} of {item.maxSupply} tickets remaining
              <br />
              <button
                type="button"
                onClick={() => buyTicket(item.tokenId)}
                disabled={item.soldOut || loading === item.tokenId}
                style={{ marginTop: "0.5rem" }}
              >
                {item.soldOut ? "Sold out" : loading === item.tokenId ? "Minting…" : `Buy for ${item.faceValueHbar} HBAR`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
