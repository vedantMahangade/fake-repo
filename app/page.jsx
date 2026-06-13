"use client";

import { useState } from "react";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";

async function fetchRpContext() {
  const res = await fetch("/api/world-id/sign");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to fetch World ID signature");
  }
  return {
    rp_id: data.rp_id,
    nonce: data.nonce,
    created_at: data.created_at,
    expires_at: data.expires_at,
    signature: data.signature,
  };
}

export default function OnboardingPage() {
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID;
  const action = process.env.NEXT_PUBLIC_WORLD_ACTION;
  const environment = process.env.NEXT_PUBLIC_WORLD_ENVIRONMENT ?? "staging";

  if (!appId || !action) {
    return (
      <main>
        <h1>Configuration required</h1>
        <p>Set NEXT_PUBLIC_WORLD_APP_ID and NEXT_PUBLIC_WORLD_ACTION in your .env file.</p>
      </main>
    );
  }

  async function handleOpen() {
    setError(null);
    setLoading(true);
    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start verification");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(proof) {
    setError(null);
    const res = await fetch("/api/verify-and-onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof }),
    });
    const data = await res.json();
    if (!res.ok) {
      const message = data.error ?? "Onboarding failed";
      if (res.status === 409) {
        setResult({ accountId: data.accountId, duplicate: true });
      }
      setError(message);
      throw new Error(message);
    }
    setResult(data);
    return data;
  }

  return (
    <main>
      <h1>World Cup Ticket Wallet</h1>
      <p>Verify you are a unique human to create your Hedera ticket wallet.</p>

      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Preparing…" : "Verify & Create Ticket Wallet"}
      </button>

      {requestConfig && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          {...requestConfig}
          handleVerify={handleVerify}
          onSuccess={setResult}
          onError={(code) => setError(`World ID error: ${code}`)}
        />
      )}

      {error && (
        <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>
      )}

      {result?.accountId && (
        <section style={{ marginTop: "2rem", padding: "1rem", background: "#f4f4f4", borderRadius: 8 }}>
          <h2>{result.duplicate ? "Already onboarded" : "Wallet created"}</h2>
          <p>
            <strong>Account ID:</strong> {result.accountId}
          </p>
          {result.evmAddress && (
            <p>
              <strong>EVM Address:</strong> {result.evmAddress}
            </p>
          )}
          <p>
            <a
              href={result.hashscanUrl ?? `https://hashscan.io/testnet/account/${result.accountId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on HashScan
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
