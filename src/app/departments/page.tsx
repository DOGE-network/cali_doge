import Image from 'next/image';
import { getAllPosts } from '@/lib/blog'
import React from 'react';
import Link from 'next/link';

export default async function BlogPage() {
  const posts = await getAllPosts()
  
  // Sort posts by budget code
  const sortedPosts = [...posts].sort((a, b) => {
    const codeA = String(a.budgetCode).padStart(4, '0')
    const codeB = String(b.budgetCode).padStart(4, '0')
    return codeA.localeCompare(codeB)
  })

  return (
    <div className="container mx-auto px-4 pt-32">
      <h1 className="text-4xl font-bold mb-8">Departments</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPosts.map((post) => (
          <Link 
            key={post.id}
            href={`/departments/${post.id}`}
            className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <article className="h-full flex flex-col">
              {post.image && (
                <div className="relative w-full pt-[56.25%]">
                  <Image
                    src={post.image.replace('/assets/img/', '/')}
                    alt={`${String(post.budgetCode).padStart(4, '0')} - ${post.name}`}
                    fill
                    className="rounded-t-lg object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <time className="text-sm text-gray-600 mb-2">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-600 transition-colors">
                  {String(post.budgetCode).padStart(4, '0')} - {post.name}
                </h3>
                <p className="text-gray-700 line-clamp-3 mb-4">
                  {post.excerpt}
                </p>
                <span className="text-blue-600 mt-auto group-hover:underline">
                  Read more
                </span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
} 