import { createHmac } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string) {
  const clean = input.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) throw new Error('invalid base32 secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** RFC 6238 TOTP (SHA-1, 30s step) for a base32 secret, as used by Microsoft and GitHub authenticator apps. */
export function totp(secret: string, at = Date.now(), digits = 6, step = 30) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / step)));
  const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return code.toString().padStart(digits, '0');
}

/** A code with at least `minValidMs` left before it rolls over, so it isn't stale by the time it's submitted. */
export async function freshTotp(secret: string, minValidMs = 5_000) {
  const remaining = 30_000 - (Date.now() % 30_000);
  if (remaining < minValidMs) await new Promise((r) => setTimeout(r, remaining + 250));
  return totp(secret);
}
