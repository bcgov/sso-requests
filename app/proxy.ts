import { NextRequest, NextResponse } from 'next/server';

const originOf = (url?: string) => {
  try {
    return new URL(url || '').origin;
  } catch {
    return '';
  }
};

// keycloak-js (check-sso) frames the SSO server and calls its token endpoint.
const ssoOrigin = originOf(process.env.NEXT_PUBLIC_SSO_URL);
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
const connectSrc = Array.from(new Set(["'self'", ssoOrigin, apiOrigin].filter(Boolean))).join(' ');
const frameSrc = ["'self'", ssoOrigin].filter(Boolean).join(' ');

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  // without 'unsafe-eval', @rjsf/validator-ajv8 will not work correctly and breaks form validation
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval';
    script-src-attr 'none';
    style-src 'self' 'nonce-${nonce}';
    connect-src ${connectSrc};
    frame-src ${frameSrc};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'geolocation=(self)');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: [{ source: '/((?!api|_next/static|_next/image|favicon.ico).*)' }],
};
