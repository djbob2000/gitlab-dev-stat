import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'gitlab-token';
const API_ROUTES = ['/api/gitlab', '/api/statistics'];

export function middleware(request: NextRequest) {
  // Only apply middleware to API routes
  if (!API_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const encryptedToken = request.cookies.get(COOKIE_NAME)?.value;

  // If no token, return unauthorized
  if (!encryptedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clone the request headers and add the encrypted token
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-gitlab-token-encrypted', encryptedToken);

  // Return the response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}
