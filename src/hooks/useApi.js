import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useApi – the one way screens load data.
 *
 *   const { data, loading, error, refresh } = useApi(api.getWallet);
 *   const { data } = useApi(() => api.getStatement(filter), [filter]);
 *
 * - Calls the function when the screen mounts (and when `deps` change).
 * - `refresh()` calls it again (used by pull-to-refresh).
 * - Ignores results that arrive after the screen has unmounted.
 */
export default function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (mounted.current) {
        setData(result ?? null);
      }
    } catch (e) {
      if (mounted.current) {
        setError(e.message || 'Something went wrong');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { data, loading, error, refresh, setData };
}
