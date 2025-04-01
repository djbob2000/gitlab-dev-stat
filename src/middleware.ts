import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/crypto';

/**
 * Middleware for handling API requests
 * Extracts GitLab token from cookies, decrypts it if encrypted, and adds it to request headers
 */
export async function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the token from client cookies
  const encryptedToken = request.cookies.get('gitlab-token')?.value;

  if (encryptedToken) {
    try {
      // Decrypt the token
      const decryptedToken = await decrypt(encryptedToken);

      // Add the decrypted token to the headers
      if (decryptedToken) {
        requestHeaders.set('X-GitLab-Token', decryptedToken);
      } else {
        // Token was decrypted but value is empty, remove the invalid cookie
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });

        response.cookies.delete('gitlab-token');
        console.warn('Empty token detected, clearing cookie');
        return response;
      }
    } catch (error) {
      // If decryption fails (possibly due to encryption key change)
      console.error('Error decrypting token:', error);

      // Remove the invalid cookie
      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });

      response.cookies.delete('gitlab-token');

      // Redirect to login page if accessing protected route
      if (request.nextUrl.pathname.startsWith('/api/')) {
        console.warn('Invalid token detected for API route, clearing cookie');
      }

      return response;
    }
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
