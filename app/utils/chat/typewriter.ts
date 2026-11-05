// Ported from bcgov/sso-rag ui/src/lib/typewriter.ts.
//
// Network and model chunks arrive in irregular bursts. Instead of painting each burst as it lands, the typewriter
// keeps everything received so far and reveals it at a steady speed that follows the average arrival rate, so text
// flows continuously across the gaps between bursts.

// Time constant for smoothing the arrival rate (chars/s).
const RATE_SMOOTHING_MS = 1000;
// Speed up if the visible text falls further behind than this…
const MAX_LAG_MS = 1200;
// …and catch up quickly once the stream has ended.
const FINAL_LAG_MS = 300;
// Floor so the first words appear promptly even before a rate is known.
const MIN_CHARS_PER_SEC = 30;
// Ignore long frame gaps (tab switch, debugger) when integrating time.
const MAX_FRAME_MS = 100;

export interface Typewriter {
  /** Append newly received text. */
  push(text: string): void;
  /** Mark the stream as finished; resolves once all text has been revealed. */
  finish(): Promise<void>;
  /** Stop animating (e.g. on error or unmount). */
  cancel(): void;
}

export function createTypewriter(onReveal: (visible: string) => void): Typewriter {
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let target = '';
  let shown = 0;
  let position = 0;
  let measuredLength = 0;
  let rate = 0;
  let lastFrameAt: number | null = null;
  let ending = false;
  let cancelled = false;
  let frame: number | null = null;
  let resolveFinished: (() => void) | null = null;

  const schedule = () => {
    if (frame === null && !cancelled) frame = requestAnimationFrame(tick);
  };

  function tick(now: number) {
    frame = null;
    const dt = lastFrameAt === null ? 16 : Math.min(now - lastFrameAt, MAX_FRAME_MS);
    lastFrameAt = now;

    if (dt > 0) {
      const arrived = target.length - measuredLength;
      measuredLength = target.length;
      const instantRate = (arrived / dt) * 1000;
      rate += (instantRate - rate) * Math.min(1, dt / RATE_SMOOTHING_MS);
    }

    const backlog = target.length - position;
    if (backlog > 0) {
      if (reduceMotion || document.hidden) {
        position = target.length;
      } else {
        const lagSeconds = (ending ? FINAL_LAG_MS : MAX_LAG_MS) / 1000;
        const charsPerSec = Math.max(MIN_CHARS_PER_SEC, rate, backlog / lagSeconds);
        position = Math.min(target.length, position + (charsPerSec * dt) / 1000);
      }

      let next = Math.floor(position);
      // Don't cut a surrogate pair (emoji etc.) in half.
      const code = target.charCodeAt(next - 1);
      if (code >= 0xd800 && code <= 0xdbff && next < target.length) next += 1;

      if (next > shown) {
        shown = next;
        onReveal(target.slice(0, shown));
      }
    }

    if (shown < target.length || !ending) {
      // Keep the loop (and the rate estimate) running through gaps in the stream.
      schedule();
    } else if (resolveFinished) {
      resolveFinished();
      resolveFinished = null;
    }
  }

  return {
    push(text) {
      target += text;
      schedule();
    },
    finish() {
      ending = true;
      return new Promise<void>((resolve) => {
        if (cancelled) return resolve();
        resolveFinished = resolve;
        // requestAnimationFrame doesn't run in background tabs; reveal the rest right away there.
        if (document.hidden) {
          shown = target.length;
          position = shown;
          onReveal(target);
          resolve();
          resolveFinished = null;
          return;
        }
        schedule();
      });
    },
    cancel() {
      cancelled = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      resolveFinished?.();
      resolveFinished = null;
    },
  };
}
