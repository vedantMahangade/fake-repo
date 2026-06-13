"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

export function useMarketplace() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet("/api/marketplace");
      setCollections(data.collections ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { collections, loading, error, refresh };
}

export function useCollection(tokenId) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!tokenId) return;
    try {
      const data = await apiGet(
        `/api/marketplace?tokenId=${encodeURIComponent(tokenId)}`
      );
      setCollection(data.collection ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { collection, loading, error, refresh };
}
