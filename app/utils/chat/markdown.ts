// Ported from bcgov/sso-rag ui/src/lib/markdown.ts.

const count = (text: string, pattern: RegExp) => Array.from(text.matchAll(pattern)).length;

// Insert a closing marker before trailing whitespace: CommonMark doesn't treat "**word **" as a closer.
const closeWith = (text: string, marker: string) => {
  const trimmed = text.trimEnd();
  return `${trimmed}${marker}${text.slice(trimmed.length)}`;
};

// Single "*" emphasis markers, ignoring "**" and "* " list bullets.
const loneStars = (text: string) => count(text.replace(/^[ \t]*\*\s/gm, '').replace(/\*\*/g, ''), /\*/g);

/**
 * Makes partially streamed Markdown render stably.
 *
 * Mid-stream, a half-written link ("[Section](https://bcg") or an unclosed "**bold" / "*italic*" / "`code`" / code
 * fence renders as raw syntax and then snaps into formatted text once the closing characters arrive. This shows an
 * unfinished trailing link as plain label text, drops markers that have no text after them yet, and temporarily
 * closes open ones, so the text formats correctly as it appears. Only applied while a message is still streaming.
 */
export function stabilizeStreamingMarkdown(text: string): string {
  // Unfinished link or image at the very end ("[label", "[label]", "[label](url"): show just the label text.
  let out = text;
  const open = out.lastIndexOf('[');
  if (open !== -1 && /^\[[^\]\n]*(?:\](?:\([^)\s]*)?)?$/.test(out.slice(open))) {
    const start = out[open - 1] === '!' ? open - 1 : open;
    const label = new RegExp(/^[^\]\n]*/).exec(out.slice(open + 1))?.[0] ?? '';
    out = out.slice(0, start) + label;
  }

  // An open code fence: close it so the block renders as code, not prose.
  if (count(out, /^[ \t]*```/gm) % 2 === 1) return `${out}\n\`\`\``;
  // A fence still being typed ("`" or "``" alone on the last line): hide it.
  out = out.replace(/(^|\n)[ \t]*`{1,2}$/, '$1');

  // Inline code: drop a bare opening backtick, otherwise close the span.
  if (count(out, /`/g) % 2 === 1) {
    out = out.endsWith('`') ? out.slice(0, -1) : closeWith(out, '`');
  }

  // A trailing single "*" is the first half of a "**" or an emphasis marker with no text yet; either way it would
  // render as a literal asterisk.
  if (out.endsWith('*') && !out.endsWith('**') && (count(out, /\*\*/g) % 2 === 1 || loneStars(out) % 2 === 1)) {
    out = out.slice(0, -1);
  }

  // Bold: drop a bare opening "**", otherwise close it.
  if (count(out, /\*\*/g) % 2 === 1) {
    out = out.endsWith('**') ? out.slice(0, -2) : closeWith(out, '**');
  }

  // Italic: close an open single "*".
  if (loneStars(out) % 2 === 1) out = closeWith(out, '*');

  return out;
}
