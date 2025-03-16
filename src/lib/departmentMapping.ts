// This file provides mapping between department slugs and their corresponding names
// in the spending and workforce data

// Interface for department mapping
export interface DepartmentMapping {
  slug: string;           // The slug used in department URLs
  fullName: string;       // The full official name
  spendingName?: string;  // The name used in spending data (if different from fullName)
  workforceName?: string; // The name used in workforce data (if different from fullName)
}

// Map of department slugs to their corresponding names in different datasets
export const departmentMappings: DepartmentMapping[] = [
  {
    slug: '3900_air_resources_board',
    fullName: 'Air Resources Board',
    spendingName: 'Air Resources Board',
    workforceName: 'Air Resources Board'
  },
  {
    slug: '3100_exposition_park',
    fullName: 'Exposition Park',
    spendingName: 'Exposition Park',
    workforceName: 'Exposition Park'
  },
  {
    slug: '3125_california_tahoe_conservancy',
    fullName: 'California Tahoe Conservancy',
    spendingName: 'California Tahoe Conservancy',
    workforceName: 'California Tahoe Conservancy'
  },
  // Add more departments as they are created
];

/**
 * Find a department mapping by its slug
 */
export function getDepartmentBySlug(slug: string): DepartmentMapping | undefined {
  return departmentMappings.find(dept => dept.slug === slug);
}

/**
 * Find a department mapping by its name in the spending data
 */
export function getDepartmentBySpendingName(name: string): DepartmentMapping | undefined {
  return departmentMappings.find(dept => 
    (dept.spendingName && dept.spendingName === name) || dept.fullName === name
  );
}

/**
 * Find a department mapping by its name in the workforce data
 */
export function getDepartmentByWorkforceName(name: string): DepartmentMapping | undefined {
  return departmentMappings.find(dept => 
    (dept.workforceName && dept.workforceName === name) || dept.fullName === name
  );
}

/**
 * Get the spending data URL for a department
 */
export function getSpendingUrlForDepartment(slug: string): string | null {
  const dept = getDepartmentBySlug(slug);
  if (!dept || (!dept.spendingName && dept.fullName === '')) return null;
  
  return `/spend?department=${encodeURIComponent(dept.spendingName || dept.fullName)}`;
}

/**
 * Get the workforce data URL for a department
 */
export function getWorkforceUrlForDepartment(slug: string): string | null {
  const dept = getDepartmentBySlug(slug);
  if (!dept || (!dept.workforceName && dept.fullName === '')) return null;
  
  return `/workforce?department=${encodeURIComponent(dept.workforceName || dept.fullName)}`;
} 