import { NextRequest, NextResponse } from 'next/server';

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development';

// Turbopack production builds inline a per-page bootstrap <script>, so the CSP
// needs a per-request nonce; _document reads it from the x-nonce request header.
export function proxy(request: NextRequest) {
  if (APP_ENV !== 'production') return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    'block-all-mixed-content',
    "font-src 'self' https: data:",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    "style-src 'self' https: 'unsafe-inline'",
    'upgrade-insecure-requests',
  ].join(';');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [{ source: '/((?!api|_next/static|_next/image|favicon.ico).*)' }],
};
