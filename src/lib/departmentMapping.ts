// This file provides mapping between department slugs and their corresponding names
// in the spending and workforce data

// Interface for department mapping
export interface DepartmentMapping {
  slug: string;           // The slug used in department URLs
  fullName: string;       // The full official name
  spendingName?: string;  // The name used in spending data (if different from fullName)
  workforceName?: string; // The name used in workforce data (if different from fullName)
}

// Dynamically generate department mappings from markdown files
// This is done at build time
export const departmentMappings: DepartmentMapping[] = [
  {
    slug: '0250_judicial_branch',
    fullName: 'Judicial Branch',
    spendingName: 'Judicial Branch',
    workforceName: 'Judicial Branch'
  },
  {
    slug: '0500_governors_office',
    fullName: 'Governor\'s Office',
    spendingName: 'Governor\'s Office',
    workforceName: 'Governor\'s Office'
  },
  {
    slug: '0509_governors_office_of_business_and_economic_development',
    fullName: 'Governor\'s Office of Business and Economic Development',
    spendingName: 'Governor\'s Office of Business and Economic Development',
    workforceName: 'Governor\'s Office of Business and Economic Development'
  },
  {
    slug: '0511_secretary_for_government_operations',
    fullName: 'Secretary for Government Operations',
    spendingName: 'Secretary for Government Operations',
    workforceName: 'Secretary for Government Operations'
  },
  {
    slug: '0515_secretary_of_business_consumer_services_and_housing',
    fullName: 'Secretary of Business, Consumer Services and Housing',
    spendingName: 'Secretary of Business, Consumer Services and Housing',
    workforceName: 'Secretary of Business, Consumer Services and Housing'
  },
  {
    slug: '0521_secretary_of_transportation',
    fullName: 'Secretary of Transportation',
    spendingName: 'Secretary of Transportation',
    workforceName: 'Secretary of Transportation'
  },
  {
    slug: '0530_secretary_of_health_and_human_services',
    fullName: 'Secretary of Health and Human Services',
    spendingName: 'Secretary of Health and Human Services',
    workforceName: 'Secretary of Health and Human Services'
  },
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
    slug: '0559_secretary_for_labor_and_workforce_development',
    fullName: 'Secretary for Labor and Workforce Development',
    spendingName: 'Secretary for Labor and Workforce Development',
    workforceName: 'Secretary for Labor and Workforce Development'
  },
  {
    slug: '0650_office_of_planning_and_research',
    fullName: 'Office of Planning and Research',
    spendingName: 'Office of Planning and Research',
    workforceName: 'Office of Planning and Research'
  },
  {
    slug: '0690_office_of_emergency_services',
    fullName: 'Office of Emergency Services',
    spendingName: 'Office of Emergency Services',
    workforceName: 'Office of Emergency Services'
  },
  {
    slug: '0750_office_of_the_lieutenant_governor',
    fullName: 'Office of the Lieutenant Governor',
    spendingName: 'Office of the Lieutenant Governor',
    workforceName: 'Office of the Lieutenant Governor'
  },
  {
    slug: '0820_department_of_justice',
    fullName: 'Department of Justice',
    spendingName: 'Department of Justice',
    workforceName: 'Department of Justice'
  },
  {
    slug: '0840_state_controller',
    fullName: 'State Controller',
    spendingName: 'State Controller',
    workforceName: 'State Controller'
  },
  {
    slug: '0845_department_of_insurance',
    fullName: 'Department of Insurance',
    spendingName: 'Department of Insurance',
    workforceName: 'Department of Insurance'
  },
  {
    slug: '0890_secretary_of_state',
    fullName: 'Secretary of State',
    spendingName: 'Secretary of State',
    workforceName: 'Secretary of State'
  },
  {
    slug: '0950_state_treasurer',
    fullName: 'State Treasurer\'s Office',
    spendingName: 'State Treasurer\'s Office',
    workforceName: 'State Treasurer\'s Office'
  },
  {
    slug: '1111_department_of_consumer_affairs',
    fullName: 'Department of Consumer Affairs',
    spendingName: 'Department of Consumer Affairs',
    workforceName: 'Department of Consumer Affairs'
  },
  {
    slug: '1700_civil_rights_department',
    fullName: 'Civil Rights Department',
    spendingName: 'Civil Rights Department',
    workforceName: 'Civil Rights Department'
  },
  {
    slug: '1701_department_of_financial_protection_and_innovation',
    fullName: 'Department of Financial Protection and Innovation',
    spendingName: 'Department of Financial Protection and Innovation',
    workforceName: 'Department of Financial Protection and Innovation'
  },
  {
    slug: '1750_horse_racing_board',
    fullName: 'Horse Racing Board',
    spendingName: 'Horse Racing Board',
    workforceName: 'Horse Racing Board'
  },
  {
    slug: '1760_department_of_general_services',
    fullName: 'Department of General Services',
    spendingName: 'California Department of General Services',
    workforceName: 'Department of General Services'
  },
  {
    slug: '2660_department_of_transportation',
    fullName: 'Department of Transportation',
    spendingName: 'California Department of Transportation',
    workforceName: 'Department of Transportation'
  },
  {
    slug: '2720_california_highway_patrol',
    fullName: 'California Highway Patrol',
    spendingName: 'California Highway Patrol',
    workforceName: 'California Highway Patrol'
  },
  {
    slug: '2740_department_of_motor_vehicles',
    fullName: 'Department of Motor Vehicles',
    spendingName: 'Department of Motor Vehicles',
    workforceName: 'Department of Motor Vehicles'
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
    slug: '3340_california_conservation_corps',
    fullName: 'California Conservation Corps',
    spendingName: 'California Conservation Corps',
    workforceName: 'California Conservation Corps'
  },
  {
    slug: '3360_energy_commission',
    fullName: 'Energy Commission',
    spendingName: 'Energy Commission',
    workforceName: 'California Energy Commission'
  },
  {
    slug: '3460_colorado_river_board',
    fullName: 'Colorado River Board',
    spendingName: 'Colorado River Board',
    workforceName: 'Colorado River Board'
  },
  {
    slug: '3480_department_of_conservation',
    fullName: 'Department of Conservation',
    spendingName: 'Department of Conservation',
    workforceName: 'Department of Conservation'
  },
  {
    slug: '3540_department_of_forestry_and_fire_protection',
    fullName: 'Department of Forestry and Fire Protection',
    spendingName: 'California Department of Forestry and Fire Protection',
    workforceName: 'Department of Forestry and Fire Protection'
  },
  {
    slug: '3560_state_lands_commission',
    fullName: 'State Lands Commission',
    spendingName: 'California State Lands Commission',
    workforceName: 'State Lands Commission'
  },
  {
    slug: '3600_department_of_fish_and_wildlife',
    fullName: 'Department of Fish and Wildlife',
    spendingName: 'Department of Fish and Wildlife',
    workforceName: 'Department of Fish and Wildlife'
  },
  {
    slug: '3640_wildlife_conservation_board',
    fullName: 'Wildlife Conservation Board',
    spendingName: 'Wildlife Conservation Board',
    workforceName: 'Wildlife Conservation Board'
  },
  {
    slug: '3900_air_resources_board',
    fullName: 'Air Resources Board',
    spendingName: 'Air Resources Board',
    workforceName: 'California Air Resources Board'
  }
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