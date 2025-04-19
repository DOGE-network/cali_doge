import { MetadataRoute } from 'next';
import { getDepartmentSlugs } from '@/lib/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://cali-doge.org';
  
  // Core pages with their priorities and change frequencies
  const corePages = [
    {
      url: baseUrl,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/workforce`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/spend`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/grid`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/departments`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/savings`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/network`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/regulations`,
      lastModified: new Date('2024-04-06'),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ];

  // Get department slugs from markdown files
  const departmentSlugs = await getDepartmentSlugs();
  
  // Department pages from markdown files
  const departmentPages = departmentSlugs.map(slug => ({
    url: `${baseUrl}/departments/${slug}`,
    lastModified: new Date('2024-04-06'),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...corePages, ...departmentPages];
} 