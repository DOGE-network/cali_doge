import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Clean the path by removing any 'media' prefixes and normalizing the path
    const cleanPath = params.path
      .filter(segment => segment !== 'media')
      .join('/')
      .split('/')
      .filter(Boolean);

    // If no valid path segments, return 404
    if (cleanPath.length === 0) {
      return new NextResponse('Invalid path', { status: 404 });
    }

    const filePath = join(process.cwd(), 'src/data/media', ...cleanPath);
    
    // Check if file exists before trying to read it
    if (!existsSync(filePath)) {
      // Check for fallback URL in query parameters
      const fallbackUrl = request.nextUrl.searchParams.get('fallback');
      if (fallbackUrl) {
        try {
          const response = await fetch(fallbackUrl);
          if (!response.ok) throw new Error(`Failed to fetch fallback image: ${response.statusText}`);
          
          const arrayBuffer = await response.arrayBuffer();
          // Ensure the directory exists
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          // Save the file locally for future use
          fs.writeFileSync(filePath, new Uint8Array(arrayBuffer));
          
          return new NextResponse(arrayBuffer, {
            headers: {
              'Content-Type': response.headers.get('content-type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          });
        } catch (error) {
          console.error('Error fetching fallback image:', error);
          // Return a 404 instead of throwing an error
          return new NextResponse('File not found', { status: 404 });
        }
      }
      return new NextResponse('File not found', { status: 404 });
    }

    try {
      const fileContent = readFileSync(filePath);
      const mimeType = lookup(filePath) || 'application/octet-stream';

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (readError) {
      console.error('Error reading media file:', readError);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error serving media file:', error);
    return new NextResponse('File not found', { status: 404 });
  }
} 