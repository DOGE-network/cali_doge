import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';

export async function GET() {
  try {
    const posts = await getAllPosts();
    
    // Map to a simpler structure for the API
    const departments = posts.map(post => ({
      id: post.id,
      code: post.code,
      name: post.name,
      date: post.date,
      excerpt: post.excerpt,
      image: post.image
    }));
    
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
} 