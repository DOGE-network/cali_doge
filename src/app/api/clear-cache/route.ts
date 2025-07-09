import { NextRequest, NextResponse } from 'next/server';
import { invalidateByTag } from '@/lib/cache';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag') || 'spend';
    
    console.log(`[CLEAR CACHE API] Clearing cache for tag: ${tag}`);
    
    await invalidateByTag(tag);
    
    console.log(`[CLEAR CACHE API] Successfully cleared cache for tag: ${tag}`);
    
    return NextResponse.json({
      success: true,
      message: `Cache cleared for tag: ${tag}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CLEAR CACHE API] Error clearing cache:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      details: error
    }, { status: 500 });
  }
} 