import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling API requests
 * Extracts GitLab token from cookies and adds it to request headers
 */
export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the encrypted token from client cookies
  const encryptedToken = request.cookies.get('gitlab-token-encrypted')?.value;

  // Add encrypted token to the headers if it exists
  if (encryptedToken) {
    requestHeaders.set('x-gitlab-token-encrypted', encryptedToken);
  }

  // Return the response with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Middleware configuration - specifies paths for which it should execute
 * Only applied to API routes
 *  It's a special Next.js convention that the framework automatically recognizes.
 */
export const config = {
  matcher: ['/api/:path*'],
};
