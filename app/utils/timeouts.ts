/**
 * Ceiling on one call to Keycloak, SDX or another dependency a workflow step relies on. Without it a dependency
 * that accepts the connection but never answers holds the step until the workflow's own step timeout, and the
 * call keeps running after that while the retry starts. A call that times out fails as transient and is retried.
 */
export const EXTERNAL_REQUEST_TIMEOUT_MS = Number(process.env.EXTERNAL_REQUEST_TIMEOUT_MS || 30_000);

/** A signal that aborts a `fetch` after `EXTERNAL_REQUEST_TIMEOUT_MS`. */
export const externalRequestSignal = () => AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS);

/**
 * Rejects once `EXTERNAL_REQUEST_TIMEOUT_MS` passes, for a call that takes no abort signal. The call itself keeps
 * running, so this is only for calls that are safe to repeat.
 */
export const withDeadline = <T>(work: Promise<T>, what: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} timed out after ${EXTERNAL_REQUEST_TIMEOUT_MS}ms`)),
      EXTERNAL_REQUEST_TIMEOUT_MS,
    );
    timer.unref?.();
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
};
