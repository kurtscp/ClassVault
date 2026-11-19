import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserMessage } from '../lib/errors';

export type AsyncStatus = 'loading' | 'success' | 'error';

export interface UseAsyncResult<T> {
  data: T | null;
  error: string | null;
  status: AsyncStatus;
  isLoading: boolean;
  isRefreshing: boolean;
  refetch: () => Promise<void>;
}

/**
 * Executes an asynchronous function and manages loading, error, and data states (UX-1).
 * Cancels and ignores stale responses if dependencies change or the component unmounts.
 *
 * @param fn Async factory returning a Promise of T
 * @param deps Dependency list triggering automatic re-execution
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = []
): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Counter tracks invocation order so stale promises cannot overwrite fresh state
  const invocationIdRef = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async (isRefresh = false) => {
    const currentId = ++invocationIdRef.current;

    if (isRefresh) {
      setIsRefreshing(true);
      setError(null);
    } else {
      setStatus('loading');
      setError(null);
    }

    try {
      const result = await fnRef.current();

      // Ignore resolution if a newer execution started or component unmounted
      if (currentId === invocationIdRef.current) {
        setData(result);
        setError(null);
        setStatus('success');
      }
    } catch (err) {
      if (currentId === invocationIdRef.current) {
        setError(toUserMessage(err));
        setStatus('error');
      }
    } finally {
      if (currentId === invocationIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    execute(false);

    return () => {
      // Invalidate pending promises on unmount or deps change
      invocationIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => execute(true), [execute]);

  return {
    data,
    error,
    status,
    isLoading: status === 'loading',
    isRefreshing,
    refetch,
  };
}

