import { NextResponse } from 'next/server';
import { getDepartmentSlugData } from '@/lib/blog';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const departments = await getDepartmentSlugData();
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Error getting department slugs:', error);
    return NextResponse.json({ error: 'Failed to get department slugs' }, { status: 500 });
  }
} 