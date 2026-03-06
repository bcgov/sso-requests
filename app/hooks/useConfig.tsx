// lib/config/useConfig.ts
'use client';
import { useState, useEffect } from 'react';
import { fetchConfig } from '@app/utils/runtimeConfigStore';
import type { RuntimeConfig } from '@app/shared/interfaces';

type UseConfigResult =
  | { config: null; loading: true; error: null }
  | { config: null; loading: false; error: Error }
  | { config: RuntimeConfig; loading: false; error: null };

export function useConfig(): UseConfigResult {
  const [state, setState] = useState<UseConfigResult>({
    config: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchConfig()
      .then((config) => {
        if (!cancelled) setState({ config, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ config: null, loading: false, error });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
