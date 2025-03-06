import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/crypto';

const COOKIE_NAME = 'gitlab-token';
const API_ROUTES = ['/api/gitlab', '/api/statistics'];

export async function middleware(request: NextRequest) {
  // Only apply middleware to API routes
  if (!API_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const encryptedToken = request.cookies.get(COOKIE_NAME)?.value;
  
  // If no token, return unauthorized
  if (!encryptedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Clone the request headers and add the decrypted token
    const requestHeaders = new Headers(request.headers);
    const decryptedToken = await decrypt(encryptedToken);
    requestHeaders.set('x-gitlab-token', decryptedToken);

    // Return the response with modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
} 