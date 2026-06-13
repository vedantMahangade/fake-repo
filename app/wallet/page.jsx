"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import { getStoredAccountId, AUTH_EVENT } from "../lib/storage.js";
import { fetchRpContext, getWorldIdClientConfig } from "../lib/worldId.js";

const POLL_MS = Number(process.env.NEXT_PUBLIC_LISTING_POLL_MS ?? 15000);

export default function WalletPage() {
  const [accountId, setAccountId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [sellerListings, setSellerListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState(null);
  const [askPrices, setAskPrices] = useState({});
  const [confirmBidId, setConfirmBidId] = useState(null);
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);

  const { appId, action, environment } = getWorldIdClientConfig();

  const headers = useCallback(
    () => ({ "X-Account-Id": accountId, "Content-Type": "application/json" }),
    [accountId]
  );

  const loadAll = useCallback(async (id) => {
    const [walletRes, listingsRes, bidsRes, notifRes] = await Promise.all([
      fetch(`/api/wallet/${id}`),
      fetch("/api/listings/mine", { headers: { "X-Account-Id": id } }),
      fetch("/api/bids/mine", { headers: { "X-Account-Id": id } }),
      fetch(`/api/notifications?accountId=${id}`, { headers: { "X-Account-Id": id } }),
    ]);

    const walletData = await walletRes.json();
    if (!walletRes.ok) throw new Error(walletData.error);

    const listingsData = listingsRes.ok ? await listingsRes.json() : { listings: [] };
    const bidsData = bidsRes.ok ? await bidsRes.json() : { bids: [] };
    const notifData = notifRes.ok ? await notifRes.json() : null;

    setWallet(walletData);
    setSellerListings(listingsData.listings ?? []);
    setMyBids(bidsData.bids ?? []);
    setNotifications(notifData);
  }, []);

  useEffect(() => {
    const id = getStoredAccountId();
    setAccountId(id);
    if (id) loadAll(id).catch((e) => setError(e.message));

    function onAuth() {
      const next = getStoredAccountId();
      setAccountId(next);
      if (next) loadAll(next).catch((e) => setError(e.message));
    }
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, [loadAll]);

  useEffect(() => {
    if (!accountId) return;
    const timer = setInterval(() => {
      loadAll(accountId).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [accountId, loadAll]);

  async function listForResale(ticket) {
    const key = `${ticket.tokenId}-${ticket.serial}`;
    const ask = Number(askPrices[key] ?? 50);
    if (!Number.isFinite(ask) || ask <= 0) {
      setError("Enter a valid ask price");
      return;
    }
    setError(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        tokenId: ticket.tokenId,
        serial: ticket.serial,
        askPriceHbar: ask,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(`Listed for ${ask} HBAR. Bidders can offer on /listings.`);
    await loadAll(accountId);
  }

  async function cancelListing(listingId) {
    setError(null);
    const res = await fetch(`/api/listings/${listingId}`, {
      method: "DELETE",
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadAll(accountId);
  }

  async function acceptBid(bidId) {
    setError(null);
    const res = await fetch(`/api/bids/${bidId}/accept`, {
      method: "POST",
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.balanceWarning) alert(`Accepted. Note: ${data.balanceWarning}`);
    else alert("Bid accepted. Buyer must confirm in My Tickets.");
    await loadAll(accountId);
  }

  async function declineBid(bidId) {
    setError(null);
    const res = await fetch(`/api/bids/${bidId}/decline`, {
      method: "POST",
      headers: headers(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await loadAll(accountId);
  }

  async function startConfirmBid(bidId) {
    setConfirmBidId(bidId);
    setError(null);
    const rp_context = await fetchRpContext();
    setRequestConfig({
      app_id: appId,
      action,
      rp_context,
      allow_legacy_proofs: true,
      environment,
      preset: deviceLegacy(),
    });
    setOpen(true);
  }

  async function handleVerify(proof) {
    if (!confirmBidId) throw new Error("No bid selected");
    const res = await fetch(`/api/bids/${confirmBidId}/confirm`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ proof }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(`Purchase complete! ${data.royaltyNote}`);
    setConfirmBidId(null);
    await loadAll(accountId);
    return data;
  }

  function ticketHasActiveListing(ticket) {
    return sellerListings.some(
      (l) =>
        l.tokenId === ticket.tokenId &&
        l.serial === ticket.serial &&
        ["open", "pending_settlement"].includes(l.status)
    );
  }

  if (!accountId) {
    return (
      <main>
        <h1>My Tickets</h1>
        <p><a href="/login">Log in</a> or <a href="/onboard">create a wallet</a> to view your tickets.</p>
      </main>
    );
  }

  const acceptedBids = myBids.filter((b) => b.status === "accepted");

  return (
    <main>
      <h1>My Tickets</h1>
      <p>
        Account: {accountId} · Role: {wallet?.user?.role ?? "…"}
        {notifications && (notifications.acceptedBidsToConfirm > 0 || notifications.pendingBidsOnYourListings > 0) && (
          <span style={{ marginLeft: "0.5rem", color: "#b45309" }}>
            ({notifications.acceptedBidsToConfirm} to confirm, {notifications.pendingBidsOnYourListings} new bids)
          </span>
        )}
      </p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {acceptedBids.length > 0 && (
        <section style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fff8e6", borderRadius: 8 }}>
          <h2>Winning bids — confirm purchase</h2>
          <p style={{ fontSize: "0.9rem", color: "#555" }}>
            World ID runs here to enforce the secondary purchase cap (one resale per verified human).
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {acceptedBids.map((b) => (
              <li key={b.id} style={{ marginBottom: "0.5rem" }}>
                #{b.serial} · {b.tokenId} · <strong>{b.bidPriceHbar} HBAR</strong>
                <button type="button" onClick={() => startConfirmBid(b.id)} style={{ marginLeft: "0.5rem" }}>
                  Verify World ID &amp; pay
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2>Your resale listings</h2>
        {sellerListings.length === 0 ? (
          <p style={{ color: "#666" }}>No listings yet. List a ticket below.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {sellerListings.map((l) => (
              <li key={l.id} style={{ padding: "1rem", marginBottom: "0.5rem", background: "#f0f4ff", borderRadius: 8 }}>
                <strong>#{l.serial}</strong> · {l.tokenId} · Ask: {l.askPriceHbar} HBAR · {l.status}
                <br />
                Expires: {new Date(l.expiresAt).toLocaleString()}
                {["open", "pending_settlement"].includes(l.status) && (
                  <button type="button" onClick={() => cancelListing(l.id)} style={{ marginLeft: "0.5rem" }}>
                    Cancel listing
                  </button>
                )}
                {l.bids?.length > 0 && (
                  <ul style={{ marginTop: "0.5rem" }}>
                    {l.bids.map((b) => (
                      <li key={b.id}>
                        {b.bidderAccountId}: {b.bidPriceHbar} HBAR — <em>{b.status}</em>
                        {b.status === "pending" && l.status === "open" && (
                          <>
                            <button type="button" onClick={() => acceptBid(b.id)} style={{ marginLeft: 4 }}>Accept</button>
                            <button type="button" onClick={() => declineBid(b.id)} style={{ marginLeft: 4 }}>Decline</button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Tickets you own</h2>
        {!wallet?.tickets?.length ? (
          <p>No tickets yet. <a href="/">Browse marketplace</a> or <a href="/listings">resale listings</a></p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {wallet.tickets.map((t) => (
              <li key={`${t.tokenId}-${t.serial}`} style={{ padding: "1rem", marginBottom: "0.5rem", background: "#f9f9f9", borderRadius: 8 }}>
                <strong>#{t.serial}</strong> · {t.tokenId} · {t.status} · {t.acquisition}
                <br />
                Purchased: {t.acquiredAt} {t.priceHbar ? `for ${t.priceHbar} HBAR` : ""}
                <details style={{ marginTop: "0.5rem" }}>
                  <summary>Ownership history ({t.history?.length ?? 0})</summary>
                  <ol>
                    {(t.history ?? []).map((h) => (
                      <li key={h.id}>
                        {h.acquisition} → {h.owner_account_id} {h.price_hbar ? `@ ${h.price_hbar} HBAR` : ""}
                        {h.tx_id && (
                          <>
                            {" "}
                            <a href={`https://hashscan.io/testnet/transaction/${h.tx_id}`} target="_blank" rel="noopener noreferrer">tx</a>
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
                {t.status !== "sold_secondary" && !ticketHasActiveListing(t) && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <label>
                      Ask price (HBAR):{" "}
                      <input
                        type="number"
                        value={askPrices[`${t.tokenId}-${t.serial}`] ?? 50}
                        onChange={(e) =>
                          setAskPrices({ ...askPrices, [`${t.tokenId}-${t.serial}`]: e.target.value })
                        }
                        style={{ width: 80 }}
                      />
                    </label>
                    <button type="button" onClick={() => listForResale(t)} style={{ marginLeft: "0.5rem" }}>
                      List for resale
                    </button>
                  </div>
                )}
                {ticketHasActiveListing(t) && (
                  <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}>Listed — manage bids above.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {myBids.filter((b) => b.status === "pending").length > 0 && (
        <section style={{ marginTop: "1.5rem" }}>
          <h2>Your pending bids</h2>
          <ul>
            {myBids.filter((b) => b.status === "pending").map((b) => (
              <li key={b.id}>
                #{b.serial} · {b.bidPriceHbar} HBAR (ask {b.askPriceHbar}) — waiting for seller
              </li>
            ))}
          </ul>
        </section>
      )}

      {requestConfig && confirmBidId && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          {...requestConfig}
          handleVerify={handleVerify}
          onSuccess={() => setOpen(false)}
          onError={(code) => setError(`World ID error: ${code}`)}
        />
      )}
    </main>
  );
}
