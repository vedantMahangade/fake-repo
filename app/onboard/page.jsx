"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import PageHeader from "../components/layout/PageHeader.jsx";
import PageTransition from "../components/layout/PageTransition.jsx";
import WorldIdTrigger from "../components/world-id/WorldIdTrigger.jsx";
import Card from "../components/ui/Card.jsx";
import Alert from "../components/ui/Alert.jsx";
import { setStoredAccountId } from "../lib/storage.js";
import { getPostAuthPath, hashscanAccountUrl } from "../lib/routes.js";
import { fadeUp, fadeUpTransition } from "../lib/motion.js";

const roles = [
  {
    id: "purchaser",
    title: "Purchaser",
    description: "Buy tickets at face value and resell on the marketplace.",
  },
  {
    id: "organizer",
    title: "Organizer",
    description: "Create collections, set face value, and receive royalties on resales.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("purchaser");
  const [duplicate, setDuplicate] = useState(false);

  const next = searchParams.get("next");

  useEffect(() => {
    if (!result?.accountId || duplicate) return;
    setStoredAccountId(result.accountId);
    const path = getPostAuthPath(result.role ?? role, next);
    const timer = setTimeout(() => router.push(path), 1200);
    return () => clearTimeout(timer);
  }, [result, duplicate, role, next, router]);

  async function handleVerify(proof) {
    setError(null);
    setDuplicate(false);
    const res = await fetch("/api/verify-and-onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        setDuplicate(true);
        throw new Error("This identity already has a wallet. Use Log in instead.");
      }
      throw new Error(data.error ?? "Onboarding failed");
    }
    setResult(data);
    setStoredAccountId(data.accountId);
    return data;
  }

  if (!process.env.NEXT_PUBLIC_WORLD_APP_ID || !process.env.NEXT_PUBLIC_WORLD_ACTION) {
    return (
      <PageTransition>
        <PageHeader title="Configuration required" description="Set NEXT_PUBLIC_WORLD_APP_ID and NEXT_PUBLIC_WORLD_ACTION in your .env file." />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto">
        <PageHeader
          title="Create wallet"
          description="One verified human receives one Hedera account. This choice is permanent."
        />

        <p className="text-sm text-muted mb-8">
          Already have one?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-accent">
            Log in
          </Link>
        </p>

        {!result && (
          <>
            <div className="grid gap-3 mb-8">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`relative text-left p-4 rounded-lg border transition-colors ${
                    role === r.id
                      ? "border-accent bg-accent/5"
                      : "border-border bg-surface hover:border-white/10"
                  }`}
                >
                  {role === r.id && (
                    <motion.div
                      layoutId="role-border"
                      className="absolute inset-0 border border-accent rounded-lg pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <p className="font-medium mb-1">{r.title}</p>
                  <p className="text-sm text-muted">{r.description}</p>
                </button>
              ))}
            </div>

            <WorldIdTrigger
              label="Verify & Create Wallet"
              onVerify={handleVerify}
              onSuccess={setResult}
              onError={setError}
            />
          </>
        )}

        {error && (
          <div className="mt-6">
            <Alert shakeKey={error}>
              {error}
              {duplicate && (
                <>
                  {" "}
                  <Link href="/login" className="text-accent underline">Go to Log in</Link>
                </>
              )}
            </Alert>
          </div>
        )}

        {result?.accountId && !duplicate && (
          <motion.div {...fadeUp} transition={fadeUpTransition} className="mt-8">
            <Card variant="success" className="space-y-2">
              <p className="text-success text-sm">Wallet created</p>
              <p className="font-mono text-sm">{result.accountId}</p>
              <p className="text-muted text-sm capitalize">{result.role ?? role}</p>
              <p className="text-xs text-muted pt-2">Redirecting…</p>
              <a
                href={result.hashscanUrl ?? hashscanAccountUrl(result.accountId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent"
              >
                View on HashScan
              </a>
            </Card>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
