import { RuntimeConfig } from '@app/shared/interfaces';

type ConfigState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<RuntimeConfig> }
  | { status: 'ready'; config: RuntimeConfig }
  | { status: 'error'; error: Error };

let state: ConfigState = { status: 'idle' };

export const getRuntimeConfig = (): RuntimeConfig => {
  if (state.status !== 'ready') {
    throw new Error('Config not loaded yet. Call fetchConfig() first.');
  }
  return state.config;
};

export const fetchConfig = (): Promise<RuntimeConfig> => {
  // Return cached config immediately
  if (state.status === 'ready') return Promise.resolve(state.config);

  // Deduplicate in-flight requests
  if (state.status === 'loading') return state.promise;

  const promise = fetch('/api/config')
    .then(async (res) => {
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
      const config: RuntimeConfig = await res.json();
      state = { status: 'ready', config };
      return config;
    })
    .catch((error) => {
      state = { status: 'error', error };
      throw error;
    });

  state = { status: 'loading', promise };
  return promise;
};

export function resetConfig() {
  state = { status: 'idle' };
}
