"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AUTH_EVENT,
  clearStoredAccountId,
  getStoredAccountId,
} from "../lib/storage.js";

export default function Nav() {
  const router = useRouter();
  const [accountId, setAccountId] = useState(null);

  useEffect(() => {
    function refresh() {
      setAccountId(getStoredAccountId());
    }
    refresh();
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function logout() {
    clearStoredAccountId();
    router.push("/login");
  }

  return (
    <nav
      style={{
        marginBottom: "2rem",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Link href="/">Marketplace</Link>
      <Link href="/listings">Resale listings</Link>
      {!accountId && <Link href="/login">Log in</Link>}
      <Link href="/onboard">Create wallet</Link>
      <Link href="/wallet">My Tickets</Link>
      <Link href="/organizer">Organizer</Link>
      {accountId ? (
        <>
          <span style={{ color: "#666", fontSize: "0.875rem" }}>{accountId}</span>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Log out
          </button>
        </>
      ) : (
        <span style={{ color: "#999", fontSize: "0.875rem" }}>Not signed in</span>
      )}
    </nav>
  );
}
