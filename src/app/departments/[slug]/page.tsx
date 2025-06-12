import { getAllPosts, getDepartmentSlugs } from '@/lib/blog'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import BackButton from '@/components/BackButton'
import Link from 'next/link'

type Props = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const posts = await getAllPosts()
  const post = posts.find((p) => p.id === resolvedParams.slug)

  if (!post) {
    return {
      title: 'Post Not Found'
    }
  }

  return {
    title: `${String(post.organizationalCode).padStart(4, '0')} - ${post.name}`
  }
}

export default async function BlogPost({ params }: Props) {
  const resolvedParams = await params;
  const [posts, departmentSlugs] = await Promise.all([
    getAllPosts(),
    getDepartmentSlugs()
  ])
  
  // Sort posts by organizational code
  const sortedPosts = [...posts].sort((a, b) => {
    const codeA = String(a.organizationalCode).padStart(4, '0')
    const codeB = String(b.organizationalCode).padStart(4, '0')
    return codeA.localeCompare(codeB)
  })
  
  const post = sortedPosts.find((p) => p.id === resolvedParams.slug)
  if (!post) notFound()

  const departmentExists = departmentSlugs.includes(resolvedParams.slug)
  const departmentName = encodeURIComponent(post.name)
  
  const dataLinks = [
    { url: `/spend?department=${departmentName}`, label: 'View Spending Data', color: 'blue' },
    { url: `/workforce?department=${departmentName}`, label: 'View Workforce Data', color: 'green' }
  ]

  return (
    <div className="container mx-auto px-4 pt-24">
      <BackButton />
      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold mb-4">{String(post.organizationalCode).padStart(4, '0')} - {post.name}</h1>
        <time className="text-gray-600 block mb-4">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {departmentExists ? (
              dataLinks.map(({ url, label, color }) => (
                <Link 
                  key={url}
                  href={url} 
                  className={`bg-${color}-100 text-${color}-800 px-3 py-1 rounded-lg hover:bg-${color}-200 transition-colors`}
                >
                  {label}
                </Link>
              ))
            ) : (
              <p className="text-gray-500 italic">
                No linked data available for this department. 
                Missing mapping in departments.json.
              </p>
            )}
          </div>
        </div>

        <div 
          className="department-content" 
          dangerouslySetInnerHTML={{ __html: typeof post.content === 'string' ? post.content : (console.warn('Invalid post.content for department', post), '') }} 
        />
      </article>
    </div>
  )
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  const sortedPosts = [...posts].sort((a, b) => {
    const codeA = String(a.organizationalCode).padStart(4, '0')
    const codeB = String(b.organizationalCode).padStart(4, '0')
    return codeA.localeCompare(codeB)
  })
  
  return sortedPosts.map((post) => ({
    slug: post.id
  }))
} 