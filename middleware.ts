import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'gitlab-token';
const API_ROUTES = ['/api/gitlab', '/api/statistics'];

export function middleware(request: NextRequest) {
  // Only apply middleware to API routes
  if (!API_ROUTES.some(route => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  
  // If no token, return unauthorized
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // If token exists, allow the request to proceed
  return NextResponse.next();
} 