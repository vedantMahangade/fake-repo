"use client";

import { useEffect, useState } from "react";
import { getStoredAccountId } from "../lib/storage.js";

export default function OrganizerPage() {
  const [accountId, setAccountId] = useState(null);
  const [role, setRole] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [form, setForm] = useState({ name: "World Cup Ticket", symbol: "WCT", maxSupply: 100, faceValueHbar: 50 });

  useEffect(() => {
    const id = getStoredAccountId();
    setAccountId(id);
    if (id) loadProfile(id);
  }, []);

  async function loadProfile(id) {
    setError(null);
    const walletRes = await fetch(`/api/wallet/${id}`);
    const wallet = await walletRes.json();
    if (walletRes.ok) {
      setRole(wallet.user.role);
      if (wallet.user.role === "organizer") {
        loadTokens(id);
      }
    }
  }

  async function loadTokens(id) {
    const res = await fetch("/api/tokens", { headers: { "X-Account-Id": id } });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setError(null);
    setTokens(data.tokens ?? []);
  }

  async function promoteSelf() {
    setError(null);
    const res = await fetch("/api/admin/promote-organizer", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Secret": adminSecret },
      body: JSON.stringify({ accountId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setRole("organizer");
    setAdminSecret("");
    loadTokens(accountId);
  }

  async function createToken() {
    setError(null);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Account-Id": accountId },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    alert(`Collection created: ${data.tokenId}`);
    loadTokens(accountId);
  }

  if (!accountId) {
    return (
      <main>
        <h1>Organizer Dashboard</h1>
        <p><a href="/login">Log in</a> or <a href="/onboard">create a wallet</a> first.</p>
      </main>
    );
  }

  if (role !== "organizer") {
    return (
      <main>
        <h1>Organizer Dashboard</h1>
        <p>Account: {accountId}</p>
        <p>Role: <strong>{role ?? "…"}</strong></p>
        <p style={{ marginTop: "1rem" }}>
          Select <strong>Organizer</strong> on <a href="/onboard">/onboard</a>, or promote this account below.
        </p>
        <section style={{ marginTop: "1.5rem", padding: "1rem", background: "#f4f4f4", borderRadius: 8 }}>
          <h2>Become an organizer</h2>
          <input
            type="password"
            placeholder="Admin secret"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            style={{ marginRight: "0.5rem", padding: "0.5rem" }}
          />
          <button type="button" onClick={promoteSelf}>Promote this account</button>
          {error && <p style={{ color: "crimson", marginTop: "0.5rem" }}>{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main>
      <h1>Organizer Dashboard</h1>
      <p>Account: {accountId} · Role: organizer</p>
      <p style={{ color: "#555", fontSize: "0.9rem" }}>
        Tickets are minted automatically when a purchaser buys on the marketplace.
      </p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <section style={{ marginTop: "1.5rem", padding: "1rem", background: "#f4f4f4", borderRadius: 8 }}>
        <h2>Create ticket collection</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: 320 }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input type="number" placeholder="Max supply" value={form.maxSupply} onChange={(e) => setForm({ ...form, maxSupply: e.target.value })} />
          <input type="number" placeholder="Face value (HBAR)" value={form.faceValueHbar} onChange={(e) => setForm({ ...form, faceValueHbar: e.target.value })} />
          <button type="button" onClick={createToken}>Create collection</button>
        </div>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Your collections</h2>
        {tokens.length === 0 ? (
          <p>No collections yet.</p>
        ) : (
          <ul>
            {tokens.map((t) => (
              <li key={t.token_id}>
                {t.name} — {t.token_id} — {t.primary_price_hbar} HBAR face value — sold {t.minted_count}/{t.max_supply}
                {t.minted_count >= t.max_supply ? " (sold out)" : ` (${t.max_supply - t.minted_count} remaining)`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
