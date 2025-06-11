import { NextResponse } from 'next/server';
import { getDepartmentSlugs } from '@/lib/blog';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const slugs = await getDepartmentSlugs();
    return NextResponse.json({ slugs });
  } catch (error) {
    console.error('Error getting department slugs:', error);
    return NextResponse.json({ error: 'Failed to get department slugs' }, { status: 500 });
  }
} 