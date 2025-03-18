import { getAllPosts } from '@/lib/blog'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import BackButton from '@/components/BackButton'
import Link from 'next/link'
import departmentsData from '@/data/departments.json'
import { WorkforceData } from '@/types/workforce'
import { DepartmentsJSON } from '@/types/department'
import { getDepartmentBySlug } from '@/lib/departmentMapping'

type Props = {
  params: {
    slug: string
  }
}

// Cast the imported data to the proper type
const typedDepartmentsData = departmentsData as DepartmentsJSON;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const posts = await getAllPosts()
  const post = posts.find((p) => p.id === params.slug)

  if (!post) {
    return {
      title: 'Post Not Found'
    }
  }

  return {
    title: `${post.code} - ${post.name}`
  }
}

export default async function BlogPost({ params }: Props) {
  const posts = await getAllPosts()
  const post = posts.find((p) => p.id === params.slug)

  if (!post) {
    notFound()
  }

  // Find the department data
  const department = getDepartmentBySlug(params.slug);
  
  if (!department) {
    console.log(`No department found for slug: ${params.slug}. Make sure it has a matching entry in departments.json`);
  }
  
  // Get department details from JSON
  const departmentDetails = department ? 
    typedDepartmentsData.departments.find(d => d.slug === department.slug) : 
    null;
  
  // Generate URLs for spending and workforce pages
  const spendingUrl = department ? `/spend?department=${encodeURIComponent(department.name)}` : null;
  const workforceUrl = department ? `/workforce?department=${encodeURIComponent(department.name)}` : null;
  
  // Get workforce data for this department
  const workforceData = departmentDetails?.workforce;

  // Transform workforce data to match WorkforceData type
  let typedWorkforceData: WorkforceData | null = null;
  
  if (departmentDetails && workforceData) {
    // Create a properly typed object
    typedWorkforceData = {
      name: departmentDetails.canonicalName,
      yearlyHeadCount: workforceData.yearlyHeadCount || [],
      yearlyWages: workforceData.yearlyWages || []
      // Optional properties are not included if they don't exist
    };
    
    // Add optional properties if they exist
    if ('averageTenureYears' in workforceData) {
      typedWorkforceData.averageTenureYears = workforceData.averageTenureYears as number;
    }
    
    if ('averageSalary' in workforceData) {
      typedWorkforceData.averageSalary = workforceData.averageSalary as number;
    }
    
    if ('averageAge' in workforceData) {
      typedWorkforceData.averageAge = workforceData.averageAge as number;
    }
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <BackButton />
      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold mb-4">{post.code} - {post.name}</h1>
        <time className="text-gray-600 block mb-4">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>

        {/* Department Metadata Section */}
        <div className="bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Data Links */}
            <div className="md:col-span-2 mt-2">

              <div className="flex flex-wrap gap-2">
                {spendingUrl && (
                  <Link href={spendingUrl} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg hover:bg-blue-200 transition-colors">
                    View Spending Data
                  </Link>
                )}
                {workforceUrl && (
                  <Link href={workforceUrl} className="bg-green-100 text-green-800 px-3 py-1 rounded-lg hover:bg-green-200 transition-colors">
                    View Workforce Data
                  </Link>
                )}
                {!spendingUrl && !workforceUrl && (
                  <p className="text-gray-500 italic">
                    No linked data available for this department. 
                    Missing mapping in departments.json.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Department Content */}
        <div 
          className="department-content" 
          dangerouslySetInnerHTML={{ __html: post.content }} 
        />
      </article>
    </div>
  )
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.id
  }))
} 