"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import { setStoredAccountId } from "../lib/storage.js";
import { fetchRpContext, getWorldIdClientConfig } from "../lib/worldId.js";

export default function OnboardingPage() {
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("purchaser");

  const { appId, action, environment } = getWorldIdClientConfig();

  useEffect(() => {
    if (result?.accountId && !result.duplicate) {
      setStoredAccountId(result.accountId);
    }
  }, [result]);

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
      body: JSON.stringify({ proof, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        setResult({ duplicate: true, accountId: data.accountId, role: data.role });
        throw new Error(
          "This identity already has a wallet. Use Log in instead of creating a new one."
        );
      }
      throw new Error(data.error ?? "Onboarding failed");
    }
    setResult(data);
    setStoredAccountId(data.accountId);
    return data;
  }

  return (
    <main>
      <h1>Create wallet</h1>
      <p>
        Verify you are a unique human to create a new Hedera ticket wallet.
        Already have one? <Link href="/login">Log in</Link>
      </p>

      <fieldset style={{ marginTop: "1rem", border: "1px solid #ddd", borderRadius: 8, padding: "1rem" }}>
        <legend>I am a…</legend>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <input
            type="radio"
            name="role"
            value="purchaser"
            checked={role === "purchaser"}
            onChange={() => setRole("purchaser")}
          />{" "}
          Ticket purchaser — buy and resell tickets
        </label>
        <label style={{ display: "block" }}>
          <input
            type="radio"
            name="role"
            value="organizer"
            checked={role === "organizer"}
            onChange={() => setRole("organizer")}
          />{" "}
          Organizer — create collections and sell tickets
        </label>
      </fieldset>

      <button type="button" onClick={handleOpen} disabled={loading} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}>
        {loading ? "Preparing…" : "Verify & Create Wallet"}
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
        <p style={{ color: "crimson", marginTop: "1rem" }}>
          {error}
          {result?.duplicate && (
            <>
              {" "}
              <Link href="/login">Go to Log in →</Link>
            </>
          )}
        </p>
      )}

      {result?.accountId && !result.duplicate && (
        <section style={{ marginTop: "2rem", padding: "1rem", background: "#f4f4f4", borderRadius: 8 }}>
          <h2>Wallet created</h2>
          <p><strong>Account ID:</strong> {result.accountId}</p>
          <p><strong>Role:</strong> {result.role ?? role}</p>
          {result.role === "organizer" || role === "organizer" ? (
            <p><a href="/organizer">Go to Organizer dashboard →</a></p>
          ) : (
            <p><a href="/">Browse marketplace →</a></p>
          )}
          <p>
            <a href={`https://hashscan.io/testnet/account/${result.accountId}`} target="_blank" rel="noopener noreferrer">
              View on HashScan
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
