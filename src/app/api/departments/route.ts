import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';

export async function GET() {
  try {
    const posts = await getAllPosts();
    
    // Map to a simpler structure for the API
    const departments = posts.map(post => ({
      id: post.id,
      code: post.code ? String(post.code) : '',  // Ensure code is always a string
      name: post.name,
      date: post.date,
      excerpt: post.excerpt,
      image: post.image
    }));
    
    // Debug the first few departments to check their code types
    console.log('API Departments (first 3):');
    departments.slice(0, 3).forEach(dept => {
      console.log(`${dept.name}: code=${dept.code}, type=${typeof dept.code}`);
    });
    
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
} 