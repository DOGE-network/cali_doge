import { getDepartmentSlugs } from '@/lib/blog';
import sitemap from '@/app/sitemap';
import { MetadataRoute } from 'next';

// Mock the getDepartmentSlugs function
jest.mock('@/lib/blog', () => ({
  getDepartmentSlugs: jest.fn(),
}));

describe('sitemap', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should generate a sitemap with core pages and department pages', async () => {
    // Mock department slugs
    const mockDepartmentSlugs = ['1234_test_department', '5678_another_department'];
    (getDepartmentSlugs as jest.Mock).mockResolvedValue(mockDepartmentSlugs);

    // Generate sitemap
    const result = await sitemap();

    // Verify core pages are included
    expect(result).toContainEqual(expect.objectContaining({
      url: 'https://cali-doge.org',
      priority: 1.0,
    }));

    // Verify department pages are included
    mockDepartmentSlugs.forEach(slug => {
      expect(result).toContainEqual(expect.objectContaining({
        url: `https://cali-doge.org/departments/${slug}`,
        priority: 0.7,
      }));
    });

    // Verify total number of pages (10 core pages + department pages)
    expect(result.length).toBe(10 + mockDepartmentSlugs.length);
  });

  it('should handle empty department list', async () => {
    // Mock empty department slugs
    (getDepartmentSlugs as jest.Mock).mockResolvedValue([]);

    // Generate sitemap
    const result = await sitemap();

    // Verify only core pages are included
    expect(result.length).toBe(10); // 10 core pages
    expect(result.every((page: MetadataRoute.Sitemap[number]) => !page.url.includes('/departments/'))).toBe(true);
  });
}); 