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
    slug: '0540_california_natural_resources_agency',
    fullName: 'California Natural Resources Agency',
    spendingName: 'California Natural Resources Agency',
    workforceName: 'California Natural Resources Agency'
  },
  {
    slug: '0555_california_environmental_protection_agency',
    fullName: 'California Environmental Protection Agency',
    spendingName: 'California Environmental Protection Agency',
    workforceName: 'California Environmental Protection Agency'
  },
  {
    slug: '2660_department_of_transportation',
    fullName: 'California Department of Transportation',
    spendingName: 'Department of Transportation',
    workforceName: 'California Department of Transportation'
  },
  {
    slug: '3540_department_of_forestry_and_fire_protection',
    fullName: 'California Department of Forestry and Fire Protection',
    spendingName: 'California Department of Forestry and Fire Protection',
    workforceName: 'California Department of Forestry and Fire Protection'
  },
  {
    slug: '3560_state_lands_commission',
    fullName: 'California State Lands Commission',
    spendingName: 'State Lands Commission',
    workforceName: 'California State Lands Commission'
  },
  {
    slug: '3720_california_coastal_commission',
    fullName: 'California Coastal Commission',
    spendingName: 'California Coastal Commission',
    workforceName: 'California Coastal Commission'
  },
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
  {
    slug: '3360_energy_commission',
    fullName: 'California Energy Commission',
    spendingName: 'Energy Commission',
    workforceName: 'California Energy Commission'
  },
  {
    slug: '3600_department_of_fish_and_wildlife',
    fullName: 'California Department of Fish and Wildlife',
    spendingName: 'Department of Fish and Wildlife',
    workforceName: 'California Department of Fish and Wildlife'
  },
  {
    slug: '3790_department_of_parks_and_recreation',
    fullName: 'California Department of Parks and Recreation',
    spendingName: 'Department of Parks and Recreation',
    workforceName: 'California Department of Parks and Recreation'
  },
  {
    slug: '3860_department_of_water_resources',
    fullName: 'California Department of Water Resources',
    spendingName: 'Department of Water Resources',
    workforceName: 'California Department of Water Resources'
  },
  {
    slug: '3940_water_resources_control_board',
    fullName: 'California Water Resources Control Board',
    spendingName: 'Water Resources Control Board',
    workforceName: 'California Water Resources Control Board'
  },
  {
    slug: '4260_department_of_health_care_services',
    fullName: 'California Department of Health Care Services',
    spendingName: 'Department of Health Care Services',
    workforceName: 'California Department of Health Care Services'
  },
  {
    slug: '4265_department_of_public_health',
    fullName: 'California Department of Public Health',
    spendingName: 'Department of Public Health',
    workforceName: 'California Department of Public Health'
  },
  {
    slug: '4300_department_of_developmental_services',
    fullName: 'California Department of Developmental Services',
    spendingName: 'Department of Developmental Services',
    workforceName: 'California Department of Developmental Services'
  },
  {
    slug: '4440_department_of_state_hospitals',
    fullName: 'California Department of State Hospitals',
    spendingName: 'Department of State Hospitals',
    workforceName: 'California Department of State Hospitals'
  },
  {
    slug: '5180_department_of_social_services',
    fullName: 'California Department of Social Services',
    spendingName: 'Department of Social Services',
    workforceName: 'California Department of Social Services'
  },
  {
    slug: '5225_department_of_corrections_and_rehabilitation',
    fullName: 'California Department of Corrections and Rehabilitation',
    spendingName: 'Department of Corrections and Rehabilitation',
    workforceName: 'California Department of Corrections and Rehabilitation'
  },
  {
    slug: '6100_department_of_education',
    fullName: 'California Department of Education',
    spendingName: 'Department of Education',
    workforceName: 'California Department of Education'
  },
  {
    slug: '3760_california_coastal_conservancy',
    fullName: 'California Coastal Conservancy',
    spendingName: 'California Coastal Conservancy',
    workforceName: 'California Coastal Conservancy'
  },
  {
    slug: '8570_department_of_food_and_agriculture',
    fullName: 'California Department of Food and Agriculture',
    spendingName: 'Department of Food and Agriculture',
    workforceName: 'California Department of Food and Agriculture'
  },
  {
    slug: '8955_department_of_veterans_affairs',
    fullName: 'California Department of Veterans Affairs',
    spendingName: 'Department of Veterans Affairs',
    workforceName: 'California Department of Veterans Affairs'
  },
  {
    slug: "7501_department_of_human_resources",
    fullName: "California Department of Human Resources",
    spendingName: "Department of Human Resources",
    workforceName: "California Department of Human Resources",
  },
  {
    slug: "1760_department_of_general_services",
    fullName: "California Department of General Services",
    spendingName: "Department of General Services",
    workforceName: "California Department of General Services",
  },
  {
    slug: "2740_department_of_motor_vehicles",
    fullName: "California Department of Motor Vehicles",
    spendingName: "Department of Motor Vehicles",
    workforceName: "California Department of Motor Vehicles",
  },
  {
    slug: "2720_california_highway_patrol",
    fullName: "California Highway Patrol",
    spendingName: "California Highway Patrol",
    workforceName: "California Highway Patrol",
  },
  {
    slug: "7502_department_of_technology",
    fullName: "California Department of Technology",
    spendingName: "Department of Technology",
    workforceName: "California Department of Technology",
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