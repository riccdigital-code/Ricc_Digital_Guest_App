import { useCallback, useEffect, useState } from "react";
import type { FallbackResult } from "@/lib/dashboard-api";

export interface ApiState<T> {
  data: T;
  loading: boolean;
  fallback: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<FallbackResult<T>>,
  initial: T,
  deps: React.DependencyList = [],
): ApiState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetcher();
      setData(r.data);
      setFallback(r.fallback);
      setError(r.error ?? null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { void run(); }, [run]);

  return { data, loading, fallback, error, refetch: () => void run() };
}
