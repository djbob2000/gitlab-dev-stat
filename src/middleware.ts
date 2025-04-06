import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/crypto';
import { createErrorResponse } from './lib/api-error-handler';
import { HTTP_STATUS } from './constants/http-status';

/**
 * Middleware for handling API authentication
 * - Gets encrypted GitLab token from cookies
 * - Decrypts token (tokens are encrypted in cookies for security)
 * - Adds decrypted token to X-GitLab-Token header for API requests
 * - Removes invalid tokens from cookies
 * - Enforces authentication for all API routes except token management
 */
export async function middleware(request: NextRequest) {
  try {
    const requestHeaders = new Headers(request.headers);

    // Get encrypted token from cookies (tokens are stored encrypted for security)
    const encryptedToken = request.cookies.get('gitlab-token')?.value;

    if (encryptedToken) {
      try {
        // Decrypt token before sending to GitLab API
        // We store tokens encrypted in cookies, but need to send them decrypted to GitLab
        const decryptedToken = await decrypt(encryptedToken);
        if (decryptedToken) {
          // Add decrypted token to headers for GitLab API authentication
          requestHeaders.set('X-GitLab-Token', decryptedToken);
        } else {
          // If token was decrypted but is empty, remove it from cookies
          const response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          response.cookies.delete('gitlab-token');
          return response;
        }
      } catch {
        // If token decryption fails, remove invalid token from cookies
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        response.cookies.delete('gitlab-token');
        return response;
      }
    }

    // Require authentication for all API routes except token management
    // /api/gitlab/token routes are used for login/token operations
    if (
      !request.nextUrl.pathname.startsWith('/api/gitlab/token') &&
      !requestHeaders.has('X-GitLab-Token')
    ) {
      return createErrorResponse(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        'AUTHENTICATION_ERROR'
      );
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }
}

/**
 * Middleware configuration - specifies paths for which it should execute
 * Only applied to API routes
 *  It's a special Next.js convention that the framework automatically recognizes.
 */
export const config = {
  matcher: ['/api/:path*'],
};
