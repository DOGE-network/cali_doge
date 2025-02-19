import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = join(process.cwd(), 'src/data/media', ...params.path);
    const fileContent = readFileSync(filePath);
    const mimeType = lookup(filePath) || 'application/octet-stream';

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving media file:', error);
    return new NextResponse('File not found', { status: 404 });
  }
} 