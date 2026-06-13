"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import { setStoredAccountId } from "../lib/storage.js";
import { fetchRpContext, getWorldIdClientConfig } from "../lib/worldId.js";

export default function LoginPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestConfig, setRequestConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { appId, action, environment } = getWorldIdClientConfig();

  useEffect(() => {
    if (result?.accountId) {
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
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Login failed");
    }
    setResult(data);
    setStoredAccountId(data.accountId);
    return data;
  }

  function goToApp() {
    if (result?.role === "organizer") {
      router.push("/organizer");
    } else {
      router.push("/wallet");
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      <p>
        Already have a ticket wallet? Verify with World ID to sign back in.
        New here? <Link href="/onboard">Create a wallet</Link>
      </p>

      <button
        type="button"
        onClick={handleOpen}
        disabled={loading}
        style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}
      >
        {loading ? "Preparing…" : "Verify & Log in"}
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

      {error && <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>}

      {result?.accountId && (
        <section style={{ marginTop: "2rem", padding: "1rem", background: "#f4f4f4", borderRadius: 8 }}>
          <h2>Signed in</h2>
          <p><strong>Account ID:</strong> {result.accountId}</p>
          <p><strong>Role:</strong> {result.role}</p>
          <button type="button" onClick={goToApp} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
            Continue
          </button>
          <p style={{ marginTop: "0.75rem" }}>
            <a href={result.hashscanUrl} target="_blank" rel="noopener noreferrer">
              View on HashScan
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
