import { useEffect, useMemo, useRef, useState } from 'react';
import { throttle } from 'lodash';
import { RoleChanges, diffRoles, hasChanges } from '@app/helpers/roles';

/**
 * Sends the changes and resolves to the roles the server says are held afterwards, or null when it could not
 * say (the change failed), in which case the last confirmed roles stand.
 */
export type SendRoleChanges = (changes: RoleChanges) => Promise<string[] | null>;

/**
 * Keeps a role picker in step with the server. Selections are throttled and sent one request at a time, each
 * diffed against what the server last confirmed: a change made while a request is in flight is sent once it
 * returns, rather than diffed against roles that are about to change, and a response never replaces a newer
 * selection on screen. Each selection is sent with the `send` it was made with, so a change still pending when the
 * caller moves on to another subject (and `send` starts closing over it) is never applied to the new one. `load`
 * shows another subject's roles (a different user or environment); anything still pending or in flight for the
 * previous one is dropped.
 */
export const useRoleSync = (send: SendRoleChanges, wait = 2000) => {
  const [roles, setRoles] = useState<string[]>([]);
  const saved = useRef<string[]>([]);
  // The latest selection.
  const desired = useRef<{ roles: string[]; send: SendRoleChanges } | null>(null);
  // Bumped by `load`, so a loop or response for an earlier subject knows to stop.
  const generation = useRef(0);
  // The generation whose loop is sending, if any.
  const running = useRef<number | null>(null);

  const sync = async () => {
    const current = generation.current;
    if (running.current === current) return;
    running.current = current;
    try {
      while (desired.current && generation.current === current) {
        const { roles: target, send: sendTarget } = desired.current;
        desired.current = null;
        const changes = diffRoles(saved.current, target);
        if (!hasChanges(changes)) continue;

        const confirmed = await sendTarget(changes);
        if (generation.current !== current) return;
        if (confirmed) saved.current = confirmed;
        if (!desired.current) setRoles(saved.current);
      }
    } finally {
      if (running.current === current) running.current = null;
    }
  };

  const throttledSync = useMemo(() => throttle(() => sync(), wait, { trailing: true }), [wait]);
  useEffect(() => () => throttledSync.cancel(), [throttledSync]);

  const select = (next: string[]) => {
    setRoles(next);
    desired.current = { roles: next, send };
    throttledSync();
  };

  const load = (next: string[]) => {
    generation.current += 1;
    throttledSync.cancel();
    desired.current = null;
    saved.current = next;
    setRoles(next);
  };

  return { roles, select, load };
};
