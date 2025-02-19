import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only handle media file requests
  if (!request.nextUrl.pathname.startsWith('/media/')) {
    return NextResponse.next();
  }

  try {
    // Get the file path from the URL
    const filePath = request.nextUrl.pathname;
    
    // Rewrite the request to the correct path
    const url = request.nextUrl.clone();
    url.pathname = `/api/media${filePath}`;
    
    return NextResponse.rewrite(url);
  } catch (error) {
    console.error('Error handling media request:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: '/media/:path*',
}; 