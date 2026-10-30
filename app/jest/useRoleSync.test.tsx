import { act, renderHook, waitFor } from '@testing-library/react';
import { useRoleSync } from '@app/hooks/useRoleSync';

// A send whose responses the test releases one at a time.
const controlledSend = () => {
  const calls: { changes: any; respond: (roles: string[] | null) => void }[] = [];
  const send = jest.fn(
    (changes) => new Promise<string[] | null>((resolve) => calls.push({ changes, respond: resolve })),
  );
  return { send, calls };
};

describe('useRoleSync', () => {
  it('sends a change made while a request is in flight once it returns, against what it confirmed', async () => {
    const { send, calls } = controlledSend();
    const { result } = renderHook(() => useRoleSync(send, 10));

    act(() => result.current.select(['a']));
    await waitFor(() => expect(calls).toHaveLength(1));
    act(() => result.current.select([]));
    // Throttled away and waiting behind the first request: nothing more is sent yet.
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toHaveLength(1);

    await act(async () => calls[0].respond(['a']));
    // The slower response does not bring back the role the user removed meanwhile.
    expect(result.current.roles).toEqual([]);
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].changes).toEqual({ add: [], remove: ['a'] });

    await act(async () => calls[1].respond([]));
    expect(result.current.roles).toEqual([]);
  });

  it('keeps the last confirmed roles when a change fails', async () => {
    const { send, calls } = controlledSend();
    const { result } = renderHook(() => useRoleSync(send, 10));
    act(() => result.current.load(['a']));

    act(() => result.current.select(['a', 'b']));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].respond(null));

    expect(result.current.roles).toEqual(['a']);
  });

  it('ignores a response for a subject that is no longer shown', async () => {
    const { send, calls } = controlledSend();
    const { result } = renderHook(() => useRoleSync(send, 10));

    act(() => result.current.select(['a']));
    await waitFor(() => expect(calls).toHaveLength(1));
    act(() => result.current.load(['x']));
    await act(async () => calls[0].respond(['a']));

    expect(result.current.roles).toEqual(['x']);
    // The next subject's changes are diffed against its own roles.
    act(() => result.current.select(['x', 'y']));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].changes).toEqual({ add: ['y'], remove: [] });
  });

  it('sends a pending change to the subject it was made for, even once the caller has moved to another', async () => {
    const first = controlledSend();
    const second = controlledSend();
    const { result, rerender } = renderHook(({ send }) => useRoleSync(send, 50), {
      initialProps: { send: first.send },
    });

    act(() => result.current.select(['a']));
    await waitFor(() => expect(first.calls).toHaveLength(1));
    await act(async () => first.calls[0].respond(['a']));
    // A second change, held back by the throttle with nothing in flight...
    act(() => result.current.select(['a', 'b']));
    // ...while the caller switches subject; the new subject's roles have not loaded yet.
    rerender({ send: second.send });

    await waitFor(() => expect(first.calls).toHaveLength(2));
    expect(first.calls[1].changes).toEqual({ add: ['b'], remove: [] });
    expect(second.send).not.toHaveBeenCalled();
  });
});
