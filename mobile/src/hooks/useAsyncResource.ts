import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AsyncResourceState } from "../types/state";

type UseAsyncResourceOptions<T> = {
  immediate?: boolean;
  dependencies?: ReadonlyArray<unknown>;
  isEmpty?: (value: T) => boolean;
};

export const useAsyncResource = <T>(
  fetcher: () => Promise<T>,
  options: UseAsyncResourceOptions<T> = {}
) => {
  const { immediate = true, dependencies = [], isEmpty } = options;
  const fetcherRef = useRef(fetcher);
  const isEmptyRef = useRef(isEmpty);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    isEmptyRef.current = isEmpty;
  }, [isEmpty]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const [state, setState] = useState<AsyncResourceState<T>>({
    status: immediate ? "loading" : "idle",
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const value = await fetcherRef.current();
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const status = isEmptyRef.current?.(value) ? "empty" : "success";
      setState({
        status,
        data: value,
        error: null,
      });
    } catch (err) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const message = err instanceof Error ? err.message : "Unexpected error";
      setState({
        status: "error",
        data: null,
        error: message,
      });
    }
  }, []);

  useEffect(() => {
    if (!immediate) {
      return;
    }
    void execute();
  }, [execute, immediate, ...dependencies]);

  return useMemo(
    () => ({
      ...state,
      refresh: execute,
    }),
    [state, execute]
  );
};
