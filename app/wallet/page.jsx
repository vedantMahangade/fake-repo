"use client";

import { useEffect, useState } from "react";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import { getStoredAccountId } from "../lib/storage.js";

async function fetchRpContext() {
  const res = await fetch("/api/world-id/sign");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch World ID signature");
  return {
    rp_id: data.rp_id,
    nonce: data.nonce,
    created_at: data.created_at,
    expires_at: data.expires_at,
    signature: data.signature,
  };
}

export default function WalletPage() {
  const [accountId, setAccountId] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);
  const [resellTarget, setResellTarget] = useState(null);
  const [buyerAccountId, setBuyerAccountId] = useState("");
  const [price, setPrice] = useState(50);
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
  const action = process.env.NEXT_PUBLIC_WORLD_ACTION;
  const environment = process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT ?? "staging";

  useEffect(() => {
    const id = getStoredAccountId();
    setAccountId(id);
    if (id) loadWallet(id);
  }, []);

  async function loadWallet(id) {
    const res = await fetch(`/api/wallet/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setWallet(data);
  }

  async function startResell(ticket) {
    setResellTarget(ticket);
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
    if (!resellTarget || !buyerAccountId) {
      throw new Error("Enter buyer account ID");
    }
    const res = await fetch(
      `/api/tickets/${resellTarget.tokenId}/${resellTarget.serial}/resell`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerAccountId: accountId,
          buyerAccountId,
          priceHbar: Number(price),
          proof,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(`Resold! ${data.royaltyNote}`);
    setResellTarget(null);
    loadWallet(accountId);
    return data;
  }

  if (!accountId) {
    return (
      <main>
        <h1>My Tickets</h1>
        <p><a href="/login">Log in</a> or <a href="/onboard">create a wallet</a> to view your tickets.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>My Tickets</h1>
      <p>Account: {accountId} · Role: {wallet?.user?.role ?? "…"}</p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!wallet?.tickets?.length ? (
        <p>No tickets yet. <a href="/">Browse marketplace</a></p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {wallet.tickets.map((t) => (
            <li key={`${t.tokenId}-${t.serial}`} style={{ padding: "1rem", marginBottom: "0.5rem", background: "#f9f9f9", borderRadius: 8 }}>
              <strong>#{t.serial}</strong> · {t.tokenId} · {t.status} · {t.acquisition}
              <br />
              Purchased: {t.acquiredAt} {t.priceHbar ? `for ${t.priceHbar} HBAR` : ""}
              <br />
              <details style={{ marginTop: "0.5rem" }}>
                <summary>Ownership history ({t.history?.length ?? 0})</summary>
                <ol>
                  {(t.history ?? []).map((h) => (
                    <li key={h.id}>
                      {h.acquisition} → {h.owner_account_id} {h.price_hbar ? `@ ${h.price_hbar} HBAR` : ""}
                      {h.tx_id && (
                        <>
                          {" "}
                          <a href={`https://hashscan.io/testnet/transaction/${h.tx_id}`} target="_blank" rel="noopener noreferrer">
                            tx
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
              {t.status !== "sold_secondary" && (
                <div style={{ marginTop: "0.5rem" }}>
                  <input placeholder="Buyer account ID" value={buyerAccountId} onChange={(e) => setBuyerAccountId(e.target.value)} style={{ width: 200 }} />
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 60, marginLeft: 4 }} />
                  <button type="button" onClick={() => startResell(t)} style={{ marginLeft: 4 }}>
                    Resell (buyer verifies World ID)
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {requestConfig && resellTarget && (
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
