// This file provides mapping between department slugs and their corresponding names
// in the spending and workforce data
import departmentsData from '@/data/departments.json';
import { SpendingData } from '@/types/spending';
import { 
  DepartmentsJSON, 
  DepartmentMapping, 
  VerificationResult 
} from '@/types/department';

// Cast the imported data to the proper type
const typedDepartmentsData = departmentsData as unknown as DepartmentsJSON;

// Generate this list using the generate-department-mappings.js script
// This should be updated at build time
// Do not manually edit this list - it will be overwritten
export const DEPARTMENT_SLUGS_WITH_PAGES = [
'0250_judicial_branch',
  '0500_governors_office',
  '0509_governors_office_of_business_and_economic_development',
  '0511_secretary_for_government_operations',
  '0515_secretary_of_business_consumer_services_and_housing',
  '0521_secretary_of_transportation',
  '0530_secretary_of_health_and_human_services',
  '0540_california_natural_resources_agency',
  '0555_california_environmental_protection_agency',
  '0559_secretary_for_labor_and_workforce_development',
  '0650_office_of_planning_and_research',
  '0690_office_of_emergency_services',
  '0750_office_of_the_lieutenant_governor',
  '0820_department_of_justice',
  '0840_state_controller',
  '0845_department_of_insurance',
  '0890_secretary_of_state',
  '0950_state_treasurer',
  '0950_state_treasurers_office',
  '1111_department_of_consumer_affairs',
  '1700_civil_rights_department',
  '1701_department_of_financial_protection_and_innovation',
  '1750_horse_racing_board',
  '2660_department_of_transportation',
  '2720_california_highway_patrol',
  '2740_department_of_motor_vehicles',
  '3100_exposition_park',
  '3125_california_tahoe_conservancy',
  '3340_california_conservation_corps',
  '3360_energy_commission',
  '3460_colorado_river_board',
  '3480_department_of_conservation',
  '3540_department_of_forestry_and_fire_protection',
  '3560_state_lands_commission',
  '3600_department_of_fish_and_wildlife',
  '3640_wildlife_conservation_board',
  '3720_california_coastal_commission',
  '3760_california_coastal_conservancy',
  '3780_native_american_heritage_commission',
  '3900_air_resources_board',
  '4260_california_department_of_health_care_services',
  '4300_california_department_of_developmental_services',
  '4440_california_department_of_state_hospitals',
  '5180_california_department_of_social_services',
  '5225_california_department_of_corrections_and_rehabilitation',
  '7760_department_of_general_services',
  '8380_california_department_of_human_resources',
  '8955_california_department_of_veterans_affairs'
];

// These mappings are generated automatically by the generate-department-mappings.js script
// Do not manually edit this array - it will be overwritten
export const departmentMappings: DepartmentMapping[] = [
  {
    slug: '0250_judicial_branch',
    name: 'Judicial Branch',
    canonicalName: 'Judicial Branch',
    code: '0250',
    fullName: 'Judicial Branch',
    spendingName: 'Judicial Branch',
    workforceName: 'Judicial Branch'
  },
  {
    slug: '0500_governors_office',
    name: 'Governor\'s Office',
    canonicalName: 'Governor\'s Office',
    code: '0500',
    fullName: 'Governor\'s Office',
    spendingName: 'Governor\'s Office',
    workforceName: 'Governor\'s Office'
  },
  {
    slug: '0509_governors_office_of_business_and_economic_development',
    name: 'Governor\'s Office of Business and Economic Development',
    canonicalName: 'Governor\'s Office of Business and Economic Development',
    code: '0509',
    fullName: 'Governor\'s Office of Business and Economic Development',
    spendingName: 'Governor\'s Office of Business and Economic Development',
    workforceName: 'Governor\'s Office of Business and Economic Development'
  },
  {
    slug: '0511_secretary_for_government_operations',
    name: 'Secretary for Government Operations',
    canonicalName: 'Secretary for Government Operations',
    code: '0511',
    fullName: 'Secretary for Government Operations',
    spendingName: 'Secretary for Government Operations',
    workforceName: 'Secretary for Government Operations'
  },
  {
    slug: '0515_secretary_of_business_consumer_services_and_housing',
    name: 'Secretary of Business, Consumer Services and Housing',
    canonicalName: 'Secretary of Business, Consumer Services and Housing',
    code: '0515',
    fullName: 'Secretary of Business, Consumer Services and Housing',
    spendingName: 'Secretary of Business, Consumer Services and Housing',
    workforceName: 'Secretary of Business, Consumer Services and Housing'
  },
  {
    slug: '0521_secretary_of_transportation',
    name: 'Secretary of Transportation',
    canonicalName: 'Secretary of Transportation',
    code: '0521',
    fullName: 'Secretary of Transportation',
    spendingName: 'Secretary of Transportation',
    workforceName: 'Secretary of Transportation'
  },
  {
    slug: '0530_secretary_of_health_and_human_services',
    name: 'Secretary of Health and Human Services',
    canonicalName: 'Secretary of Health and Human Services',
    code: '0530',
    fullName: 'Secretary of Health and Human Services',
    spendingName: 'Secretary of Health and Human Services',
    workforceName: 'Secretary of Health and Human Services'
  },
  {
    slug: '0540_california_natural_resources_agency',
    name: 'California Natural Resources Agency',
    canonicalName: 'California Natural Resources Agency',
    code: '0540',
    fullName: 'California Natural Resources Agency',
    spendingName: 'California Natural Resources Agency',
    workforceName: 'California Natural Resources Agency'
  },
  {
    slug: '0555_california_environmental_protection_agency',
    name: 'California Environmental Protection Agency',
    canonicalName: 'California Environmental Protection Agency',
    code: '0555',
    fullName: 'California Environmental Protection Agency',
    spendingName: 'California Environmental Protection Agency',
    workforceName: 'California Environmental Protection Agency'
  },
  {
    slug: '0559_secretary_for_labor_and_workforce_development',
    name: 'Secretary for Labor and Workforce Development',
    canonicalName: 'Secretary for Labor and Workforce Development',
    code: '0559',
    fullName: 'Secretary for Labor and Workforce Development',
    spendingName: 'Secretary for Labor and Workforce Development',
    workforceName: 'Secretary for Labor and Workforce Development'
  },
  {
    slug: '0650_office_of_planning_and_research',
    name: 'Office of Planning and Research',
    canonicalName: 'Office of Planning and Research',
    code: '0650',
    fullName: 'Office of Planning and Research',
    spendingName: 'Office of Planning and Research',
    workforceName: 'Office of Planning and Research'
  },
  {
    slug: '0690_office_of_emergency_services',
    name: 'Office of Emergency Services',
    canonicalName: 'Office of Emergency Services',
    code: '0690',
    fullName: 'Office of Emergency Services',
    spendingName: 'Office of Emergency Services',
    workforceName: 'Office of Emergency Services'
  },
  {
    slug: '0750_office_of_the_lieutenant_governor',
    name: 'Office of the Lieutenant Governor',
    canonicalName: 'Office of the Lieutenant Governor',
    code: '0750',
    fullName: 'Office of the Lieutenant Governor',
    spendingName: 'Office of the Lieutenant Governor',
    workforceName: 'Office of the Lieutenant Governor'
  },
  {
    slug: '0820_department_of_justice',
    name: 'Department of Justice',
    canonicalName: 'Department of Justice',
    code: '0820',
    fullName: 'Department of Justice',
    spendingName: 'Department of Justice',
    workforceName: 'Department of Justice'
  },
  {
    slug: '0840_state_controller',
    name: 'State Controller',
    canonicalName: 'State Controller',
    code: '0840',
    fullName: 'State Controller',
    spendingName: 'State Controller',
    workforceName: 'State Controller'
  },
  {
    slug: '0845_department_of_insurance',
    name: 'Department of Insurance',
    canonicalName: 'Department of Insurance',
    code: '0845',
    fullName: 'Department of Insurance',
    spendingName: 'Department of Insurance',
    workforceName: 'Department of Insurance'
  },
  {
    slug: '0890_secretary_of_state',
    name: 'Secretary of State',
    canonicalName: 'Secretary of State',
    code: '0890',
    fullName: 'Secretary of State',
    spendingName: 'Secretary of State',
    workforceName: 'Secretary of State'
  },
  {
    slug: '0950_state_treasurer',
    name: 'State Treasurer\'s Office',
    canonicalName: 'State Treasurer\'s Office',
    code: '0950',
    fullName: 'State Treasurer\'s Office',
    spendingName: 'State Treasurer\'s Office',
    workforceName: 'State Treasurer\'s Office'
  },
  {
    slug: '0950_state_treasurers_office',
    name: 'State Treasurer\'s Office',
    canonicalName: 'State Treasurer\'s Office',
    code: '0950',
    fullName: 'State Treasurer\'s Office',
    spendingName: 'State Treasurer\'s Office',
    workforceName: 'State Treasurer\'s Office'
  },
  {
    slug: '1111_department_of_consumer_affairs',
    name: 'Department of Consumer Affairs',
    canonicalName: 'Department of Consumer Affairs',
    code: '1111',
    fullName: 'Department of Consumer Affairs',
    spendingName: 'Department of Consumer Affairs',
    workforceName: 'Department of Consumer Affairs'
  },
  {
    slug: '1700_civil_rights_department',
    name: 'Civil Rights Department',
    canonicalName: 'Civil Rights Department',
    code: '1700',
    fullName: 'Civil Rights Department',
    spendingName: 'Civil Rights Department',
    workforceName: 'Civil Rights Department'
  },
  {
    slug: '1701_department_of_financial_protection_and_innovation',
    name: 'Department of Financial Protection and Innovation',
    canonicalName: 'Department of Financial Protection and Innovation',
    code: '1701',
    fullName: 'Department of Financial Protection and Innovation',
    spendingName: 'Department of Financial Protection and Innovation',
    workforceName: 'Department of Financial Protection and Innovation'
  },
  {
    slug: '1750_horse_racing_board',
    name: 'Horse Racing Board',
    canonicalName: 'Horse Racing Board',
    code: '1750',
    fullName: 'Horse Racing Board',
    spendingName: 'Horse Racing Board',
    workforceName: 'Horse Racing Board'
  },
  {
    slug: '2660_department_of_transportation',
    name: 'Department of Transportation',
    canonicalName: 'Department of Transportation',
    code: '2660',
    fullName: 'Department of Transportation',
    spendingName: 'Department of Transportation',
    workforceName: 'Department of Transportation'
  },
  {
    slug: '2720_california_highway_patrol',
    name: 'California Highway Patrol',
    canonicalName: 'California Highway Patrol',
    code: '2720',
    fullName: 'California Highway Patrol',
    spendingName: 'California Highway Patrol',
    workforceName: 'California Highway Patrol'
  },
  {
    slug: '2740_department_of_motor_vehicles',
    name: 'Department of Motor Vehicles',
    canonicalName: 'Department of Motor Vehicles',
    code: '2740',
    fullName: 'Department of Motor Vehicles',
    spendingName: 'Department of Motor Vehicles',
    workforceName: 'Department of Motor Vehicles'
  },
  {
    slug: '3100_exposition_park',
    name: 'Exposition Park',
    canonicalName: 'Exposition Park',
    code: '3100',
    fullName: 'Exposition Park',
    spendingName: 'Exposition Park',
    workforceName: 'Exposition Park'
  },
  {
    slug: '3125_california_tahoe_conservancy',
    name: 'California Tahoe Conservancy',
    canonicalName: 'California Tahoe Conservancy',
    code: '3125',
    fullName: 'California Tahoe Conservancy',
    spendingName: 'California Tahoe Conservancy',
    workforceName: 'California Tahoe Conservancy'
  },
  {
    slug: '3340_california_conservation_corps',
    name: 'California Conservation Corps',
    canonicalName: 'California Conservation Corps',
    code: '3340',
    fullName: 'California Conservation Corps',
    spendingName: 'California Conservation Corps',
    workforceName: 'California Conservation Corps'
  },
  {
    slug: '3360_energy_commission',
    name: 'Energy Commission',
    canonicalName: 'Energy Commission',
    code: '3360',
    fullName: 'Energy Commission',
    spendingName: 'Energy Commission',
    workforceName: 'Energy Commission'
  },
  {
    slug: '3460_colorado_river_board',
    name: 'Colorado River Board',
    canonicalName: 'Colorado River Board',
    code: '3460',
    fullName: 'Colorado River Board',
    spendingName: 'Colorado River Board',
    workforceName: 'Colorado River Board'
  },
  {
    slug: '3480_department_of_conservation',
    name: 'Department of Conservation',
    canonicalName: 'Department of Conservation',
    code: '3480',
    fullName: 'Department of Conservation',
    spendingName: 'Department of Conservation',
    workforceName: 'Department of Conservation'
  },
  {
    slug: '3540_department_of_forestry_and_fire_protection',
    name: 'Department of Forestry and Fire Protection',
    canonicalName: 'Department of Forestry and Fire Protection',
    code: '3540',
    fullName: 'Department of Forestry and Fire Protection',
    spendingName: 'Department of Forestry and Fire Protection',
    workforceName: 'Department of Forestry and Fire Protection'
  },
  {
    slug: '3560_state_lands_commission',
    name: 'State Lands Commission',
    canonicalName: 'State Lands Commission',
    code: '3560',
    fullName: 'State Lands Commission',
    spendingName: 'State Lands Commission',
    workforceName: 'State Lands Commission'
  },
  {
    slug: '3600_department_of_fish_and_wildlife',
    name: 'Department of Fish and Wildlife',
    canonicalName: 'Department of Fish and Wildlife',
    code: '3600',
    fullName: 'Department of Fish and Wildlife',
    spendingName: 'Department of Fish and Wildlife',
    workforceName: 'Department of Fish and Wildlife'
  },
  {
    slug: '3640_wildlife_conservation_board',
    name: 'Wildlife Conservation Board',
    canonicalName: 'Wildlife Conservation Board',
    code: '3640',
    fullName: 'Wildlife Conservation Board',
    spendingName: 'Wildlife Conservation Board',
    workforceName: 'Wildlife Conservation Board'
  },
  {
    slug: '3720_california_coastal_commission',
    name: 'California Coastal Commission',
    canonicalName: 'California Coastal Commission',
    code: '3720',
    fullName: 'California Coastal Commission',
    spendingName: 'California Coastal Commission',
    workforceName: 'California Coastal Commission'
  },
  {
    slug: '3760_california_coastal_conservancy',
    name: 'California Coastal Conservancy',
    canonicalName: 'California Coastal Conservancy',
    code: '3760',
    fullName: 'California Coastal Conservancy',
    spendingName: 'California Coastal Conservancy',
    workforceName: 'California Coastal Conservancy'
  },
  {
    slug: '3780_native_american_heritage_commission',
    name: 'Native American Heritage Commission',
    canonicalName: 'Native American Heritage Commission',
    code: '3780',
    fullName: 'Native American Heritage Commission',
    spendingName: 'Native American Heritage Commission',
    workforceName: 'Native American Heritage Commission'
  },
  {
    slug: '3900_air_resources_board',
    name: 'Air Resources Board',
    canonicalName: 'Air Resources Board',
    code: '3900',
    fullName: 'Air Resources Board',
    spendingName: 'Air Resources Board',
    workforceName: 'Air Resources Board'
  },
  {
    slug: '4260_california_department_of_health_care_services',
    name: 'California Department of Health Care Services',
    canonicalName: 'California Department of Health Care Services',
    code: '4260',
    fullName: 'California Department of Health Care Services',
    spendingName: 'California Department of Health Care Services',
    workforceName: 'California Department of Health Care Services'
  },
  {
    slug: '4300_california_department_of_developmental_services',
    name: 'California Department of Developmental Services',
    canonicalName: 'California Department of Developmental Services',
    code: '4300',
    fullName: 'California Department of Developmental Services',
    spendingName: 'California Department of Developmental Services',
    workforceName: 'California Department of Developmental Services'
  },
  {
    slug: '4440_california_department_of_state_hospitals',
    name: 'California Department of State Hospitals',
    canonicalName: 'California Department of State Hospitals',
    code: '4440',
    fullName: 'California Department of State Hospitals',
    spendingName: 'California Department of State Hospitals',
    workforceName: 'California Department of State Hospitals'
  },
  {
    slug: '5180_california_department_of_social_services',
    name: 'California Department of Social Services',
    canonicalName: 'California Department of Social Services',
    code: '5180',
    fullName: 'California Department of Social Services',
    spendingName: 'California Department of Social Services',
    workforceName: 'California Department of Social Services'
  },
  {
    slug: '5225_california_department_of_corrections_and_rehabilitation',
    name: 'California Department of Corrections and Rehabilitation',
    canonicalName: 'California Department of Corrections and Rehabilitation',
    code: '5225',
    fullName: 'California Department of Corrections and Rehabilitation',
    spendingName: 'California Department of Corrections and Rehabilitation',
    workforceName: 'California Department of Corrections and Rehabilitation'
  },
  {
    slug: '7760_department_of_general_services',
    name: 'Department of General Services',
    canonicalName: 'Department of General Services',
    code: '7760',
    fullName: 'Department of General Services',
    spendingName: 'Department of General Services',
    workforceName: 'Department of General Services'
  },
  {
    slug: '8380_california_department_of_human_resources',
    name: 'California Department of Human Resources',
    canonicalName: 'California Department of Human Resources',
    code: '8380',
    fullName: 'California Department of Human Resources',
    spendingName: 'California Department of Human Resources',
    workforceName: 'California Department of Human Resources'
  },
  {
    slug: '8955_california_department_of_veterans_affairs',
    name: 'California Department of Veterans Affairs',
    canonicalName: 'California Department of Veterans Affairs',
    code: '8955',
    fullName: 'California Department of Veterans Affairs',
    spendingName: 'California Department of Veterans Affairs',
    workforceName: 'California Department of Veterans Affairs'
  }
];

/**
 * Check if a department has a corresponding markdown file
 * Uses a hardcoded list instead of fs methods for client-side compatibility
 */
export function hasDepartmentPage(slug: string): boolean {
  // Remove the temporary override that allows all departments
  // return true;

  // Direct exact match
  if (DEPARTMENT_SLUGS_WITH_PAGES.includes(slug)) {
    return true;
  }
  
  // If the slug doesn't include an underscore, try with and without various prefixes
  if (!slug.includes('_')) {
    // Check if any entry in our hardcoded list ends with this slug
    return DEPARTMENT_SLUGS_WITH_PAGES.some(pageSlug => 
      pageSlug.endsWith(`_${slug}`)
    );
  }
  
  // For slugs with underscores, try a few different matching strategies
  
  // 1. Try matching just the part after the underscore
  const slugWithoutCode = slug.substring(slug.indexOf('_') + 1);
  const matchWithoutCode = DEPARTMENT_SLUGS_WITH_PAGES.some(pageSlug => 
    pageSlug.endsWith(`_${slugWithoutCode}`)
  );
  
  if (matchWithoutCode) {
    return true;
  }
  
  // 2. Try matching with a different prefix code
  const matchWithDifferentPrefix = DEPARTMENT_SLUGS_WITH_PAGES.some(pageSlug => {
    if (pageSlug.includes('_')) {
      const pagePart = pageSlug.substring(pageSlug.indexOf('_') + 1);
      return pagePart === slugWithoutCode;
    }
    return false;
  });
  
  return matchWithDifferentPrefix;
}

/**
 * Get all department mappings from the JSON data
 */
export function getDepartmentMappings(): DepartmentMapping[] {
  return typedDepartmentsData.departments.map(dept => ({
    slug: dept.slug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    code: dept.code || '',
    aliases: dept.aliases || []
  }));
}

/**
 * Find a department mapping by its slug
 */
export function getDepartmentBySlug(slug: string): DepartmentMapping | undefined {
  // Try exact match first
  let dept = typedDepartmentsData.departments.find(d => d.slug === slug);
  
  // If not found and slug contains an underscore, try removing the code prefix
  if (!dept && slug.includes('_')) {
    // Extract the part after the first underscore (e.g., "3900_air_resources_board" -> "air_resources_board")
    const slugWithoutCode = slug.substring(slug.indexOf('_') + 1);
    dept = typedDepartmentsData.departments.find(d => d.slug === slugWithoutCode);
    
    // If still not found, try case-insensitive match
    if (!dept) {
      dept = typedDepartmentsData.departments.find(d => 
        d.slug.toLowerCase() === slugWithoutCode.toLowerCase()
      );
      
      // If still not found, try matching by code
      if (!dept && slug.includes('_')) {
        const codeFromSlug = slug.substring(0, slug.indexOf('_'));
        dept = typedDepartmentsData.departments.find(d => d.code === codeFromSlug);
        
        // If still not found, try matching by name similarity
        if (!dept) {
          const nameFromSlug = slugWithoutCode.split('_').join(' ');
          dept = typedDepartmentsData.departments.find(d => 
            d.name.toLowerCase().includes(nameFromSlug.toLowerCase()) || 
            nameFromSlug.toLowerCase().includes(d.name.toLowerCase())
          );
        }
      }
    }
  }
  
  if (!dept) return undefined;
  
  return {
    slug: dept.slug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    code: dept.code || '',
    aliases: dept.aliases || []
  };
}

/**
 * Find a department by name or canonical name
 */
export function getDepartmentByName(name: string): DepartmentMapping | undefined {
  const dept = typedDepartmentsData.departments.find(d => 
    d.name === name || 
    d.canonicalName === name || 
    (d.aliases && d.aliases.includes(name))
  );
  
  if (!dept) return undefined;
  
  return {
    slug: dept.slug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    code: dept.code || '',
    aliases: dept.aliases || []
  };
}

/**
 * Find a department by its name as it appears in workforce data
 * Only returns departments that have a corresponding markdown page if checkForMarkdown is true
 */
export function getDepartmentByWorkforceName(name: string, checkForMarkdown: boolean = false): DepartmentMapping | undefined {
  // Check if the department exists with exact name match
  let dept = getDepartmentByName(name);
  if (dept) {
    // If requested, check that the markdown page exists
    if (checkForMarkdown && !hasDepartmentPage(dept.slug)) {
      console.log(`Workforce department '${name}' has mapping to slug '${dept.slug}' but no markdown page exists.`);
      return undefined;
    }
    return dept;
  }
  
  // Try with normalized name
  const normalizedName = normalizeForMatching(name);
  
  const matchedDept = typedDepartmentsData.departments.find(d => 
    normalizeForMatching(d.name) === normalizedName || 
    normalizeForMatching(d.canonicalName) === normalizedName ||
    (d.aliases && d.aliases.some(alias => normalizeForMatching(alias) === normalizedName))
  );
  
  if (!matchedDept) {
    console.log(`No workforce department found matching name '${name}' (normalized: '${normalizedName}')`);
    return undefined;
  }
  
  const mapping = {
    slug: matchedDept.slug,
    name: matchedDept.name,
    canonicalName: matchedDept.canonicalName,
    code: matchedDept.code || '',
    aliases: matchedDept.aliases || []
  };
  
  // If requested, check that the markdown page exists
  if (checkForMarkdown && !hasDepartmentPage(mapping.slug)) {
    console.log(`Workforce department '${name}' matched to '${mapping.name}' (slug: '${mapping.slug}') but no markdown page exists.`);
    return undefined;
  }
  
  return mapping;
}

/**
 * Find a department by its name as it appears in spending data
 * Only returns departments that have a corresponding markdown page if checkForMarkdown is true
 */
export function getDepartmentBySpendingName(name: string, checkForMarkdown: boolean = false): DepartmentMapping | undefined {
  // Check if the department exists with exact name match
  let dept = getDepartmentByName(name);
  if (dept) {
    // If requested, check that the markdown page exists
    if (checkForMarkdown && !hasDepartmentPage(dept.slug)) {
      console.log(`Department '${name}' has mapping to slug '${dept.slug}' but no markdown page exists.`);
      return undefined;
    }
    return dept;
  }
  
  // Try with normalized name
  const normalizedName = normalizeForMatching(name);
  
  const matchedDept = typedDepartmentsData.departments.find(d => 
    normalizeForMatching(d.name) === normalizedName || 
    normalizeForMatching(d.canonicalName) === normalizedName ||
    (d.aliases && d.aliases.some(alias => normalizeForMatching(alias) === normalizedName))
  );
  
  if (!matchedDept) {
    console.log(`No department found matching name '${name}' (normalized: '${normalizedName}')`);
    return undefined;
  }
  
  const mapping = {
    slug: matchedDept.slug,
    name: matchedDept.name,
    canonicalName: matchedDept.canonicalName,
    code: matchedDept.code || '',
    aliases: matchedDept.aliases || []
  };
  
  // If requested, check that the markdown page exists
  if (checkForMarkdown && !hasDepartmentPage(mapping.slug)) {
    console.log(`Department '${name}' matched to '${mapping.name}' (slug: '${mapping.slug}') but no markdown page exists.`);
    return undefined;
  }
  
  return mapping;
}

/**
 * Get the spending data URL for a department
 */
export function getSpendingUrlForDepartment(slug: string): string | null {
  const dept = getDepartmentBySlug(slug);
  if (!dept) {
    console.log(`No department found for slug: ${slug}. If this is a department post, make sure it has a matching entry in departments.json`);
    return null;
  }
  
  return `/spend?department=${encodeURIComponent(dept.name)}`;
}

/**
 * Get the workforce data URL for a department
 */
export function getWorkforceUrlForDepartment(slug: string): string | null {
  const dept = getDepartmentBySlug(slug);
  if (!dept) {
    console.log(`No department found for slug: ${slug}. If this is a department post, make sure it has a matching entry in departments.json`);
    return null;
  }
  
  return `/workforce?department=${encodeURIComponent(dept.name)}`;
}

/**
 * Normalize department names for matching
 */
export function normalizeForMatching(name: string): string {
  return name.toLowerCase()
    .replace(/^california\s+/, '') // Remove 'California ' prefix
    .replace(/department\s+of\s+/, '') // Remove 'Department of '
    .replace(/\s+/g, ''); // Remove all spaces
}

/**
 * Verify the department data
 * Used by scripts to ensure data integrity
 */
export function verifyDepartmentData(
  spendingData: SpendingData,
  workforceData: {
    departments: Array<{
      name: string;
      yearlyHeadCount?: Array<{ year: string; headCount: number }>;
      yearlyWages?: Array<{ year: string; wages: number }>;
      averageTenureYears?: number;
      averageSalary?: number;
      averageAge?: number;
    }>
  }
): VerificationResult {
  const result: VerificationResult = {
    success: true,
    messages: [],
    missingSpendingData: [],
    missingWorkforceData: [],
    dataMismatches: []
  };
  
  // Check if a department is in the unified data
  function findUnifiedDept(name: string) {
    const normalizedName = normalizeForMatching(name);
    return typedDepartmentsData.departments.find(d => 
      normalizeForMatching(d.name) === normalizedName ||
      normalizeForMatching(d.canonicalName) === normalizedName ||
      d.aliases.some(alias => normalizeForMatching(alias) === normalizedName)
    );
  }

  // Verify spending data
  result.messages.push("Verifying spending data:");
  spendingData.agencies.forEach(agency => {
    const unifiedDept = findUnifiedDept(agency.name);
    
    if (!unifiedDept) {
      result.missingSpendingData.push(agency.name);
      result.messages.push(`✗ Missing spending data for: ${agency.name}`);
      result.success = false;
      return;
    }
    
    if (!unifiedDept.spending) {
      result.missingSpendingData.push(agency.name);
      result.messages.push(`✗ No spending data found for: ${agency.name}`);
      result.success = false;
      return;
    }
    
    // Check a sample value
    const sampleYear = 'FY2023';
    if (unifiedDept.spending?.yearly[sampleYear]?.toString() !== agency.spending[sampleYear]?.toString()) {
      result.dataMismatches.push(`Spending mismatch for ${sampleYear}`);
    }
    
    result.messages.push(`✓ Verified spending data for: ${agency.name}`);
  });
  
  // Verify workforce data
  result.messages.push("\nVerifying workforce data:");
  workforceData.departments.forEach((dept) => {
    // Skip the overall government entry
    if (dept.name === "California State Government") return;
    
    const unifiedDept = findUnifiedDept(dept.name);
    
    if (!unifiedDept) {
      result.missingWorkforceData.push(dept.name);
      result.messages.push(`✗ Missing workforce data for: ${dept.name}`);
      result.success = false;
      return;
    }
    
    if (!unifiedDept.workforce) {
      result.missingWorkforceData.push(dept.name);
      result.messages.push(`✗ No workforce data found for: ${dept.name}`);
      result.success = false;
      return;
    }
    
    // Check if headcount data was copied
    const hasHeadcountData = dept.yearlyHeadCount && dept.yearlyHeadCount.length > 0;
    if (hasHeadcountData) {
      if (!unifiedDept.workforce?.headCount?.yearly || Object.keys(unifiedDept.workforce.headCount.yearly).length === 0) {
        result.dataMismatches.push('Missing headcount data');
        result.success = false;
        return;
      }
    }
    
    result.messages.push(`✓ Verified workforce data for: ${dept.name}`);
  });

  return result;
}

/**
 * Verify that all department posts have a corresponding entry in departments.json
 * This is useful for debugging when departments aren't showing data properly
 * @param postSlugs Array of slugs extracted from post filenames (e.g., ['3900_air_resources_board', ...])
 */
export function verifyDepartmentPosts(postSlugs: string[]): { 
  matched: string[], 
  unmatched: string[] 
} {
  const result = {
    matched: [] as string[],
    unmatched: [] as string[]
  };

  postSlugs.forEach(slug => {
    const dept = getDepartmentBySlug(slug);
    if (dept) {
      result.matched.push(`${slug} -> ${dept.name} (${dept.code})`);
    } else {
      result.unmatched.push(slug);
    }
  });

  return result;
}

/**
 * Debug function to help troubleshoot department page issues
 * Logs all the available department page slugs and checks if a specific slug has a page
 */
export function debugDepartmentPages(checkSlug?: string): void {
  console.log('Available department pages:');
  DEPARTMENT_SLUGS_WITH_PAGES.forEach(slug => {
    console.log(`  - ${slug}`);
  });
  
  if (checkSlug) {
    const hasPage = hasDepartmentPage(checkSlug);
    console.log(`Checking if '${checkSlug}' has a page: ${hasPage}`);
    
    // Check for partial matches
    const partialMatches = DEPARTMENT_SLUGS_WITH_PAGES.filter(slug => 
      slug.includes(checkSlug) || checkSlug.includes(slug)
    );
    
    if (partialMatches.length > 0) {
      console.log('Potential partial matches:');
      partialMatches.forEach(match => console.log(`  - ${match}`));
    } else {
      console.log('No partial matches found');
    }
  }
}

/**
 * Utility function to compare department slugs with markdown file slugs
 * This helps identify departments that don't have corresponding markdown files
 */
export function compareSlugFormats(): void {
  console.log('Comparing department slugs with markdown file slugs:');
  
  const departmentSlugs = typedDepartmentsData.departments.map(dept => dept.slug);
  
  console.log(`Found ${departmentSlugs.length} department slugs and ${DEPARTMENT_SLUGS_WITH_PAGES.length} markdown page slugs`);
  
  // Find department slugs that don't match any markdown page slugs directly
  const unmatchedDeptSlugs = departmentSlugs.filter(slug => 
    !DEPARTMENT_SLUGS_WITH_PAGES.includes(slug) && 
    !hasDepartmentPage(slug)
  );
  
  if (unmatchedDeptSlugs.length > 0) {
    console.log(`${unmatchedDeptSlugs.length} department slugs don't match any markdown page:`);
    unmatchedDeptSlugs.forEach(slug => {
      // For each unmatched slug, find the department name
      const dept = typedDepartmentsData.departments.find(d => d.slug === slug);
      console.log(`  - ${slug} (${dept?.name || 'unknown'})`);
      
      // Try to find a close match in the markdown files
      const potentialMatches = DEPARTMENT_SLUGS_WITH_PAGES.filter(pageSlug => 
        pageSlug.includes(slug) || slug.includes(pageSlug)
      );
      
      if (potentialMatches.length > 0) {
        console.log('    Potential matches:');
        potentialMatches.forEach(match => console.log(`    - ${match}`));
      }
    });
  }
  
  // Find markdown page slugs that don't match any department slugs
  const unmatchedPageSlugs = DEPARTMENT_SLUGS_WITH_PAGES.filter(pageSlug => 
    !departmentSlugs.includes(pageSlug)
  );
  
  if (unmatchedPageSlugs.length > 0) {
    console.log(`${unmatchedPageSlugs.length} markdown page slugs don't match any department slugs directly:`);
    unmatchedPageSlugs.forEach(pageSlug => {
      console.log(`  - ${pageSlug}`);
      
      // For each unmatched page slug, try to find the department that would match it
      const matchedDept = typedDepartmentsData.departments.find(dept => 
        hasDepartmentPage(dept.slug) && 
        !DEPARTMENT_SLUGS_WITH_PAGES.includes(dept.slug)
      );
      
      if (matchedDept) {
        console.log(`    Matched to department: ${matchedDept.slug} (${matchedDept.name})`);
      }
    });
  }
}

/**
 * Finds the markdown file slug that corresponds to a department
 * This is used to correct slug mismatches between departments.json and markdown files
 */
export function findMarkdownForDepartment(departmentName: string): string | null {
  if (!departmentName) return null;
  
  console.log(`Finding markdown for: "${departmentName}"`);
  
  // Step 1: Try to find a department with exact name match
  const dept = getDepartmentByName(departmentName);
  if (dept) {
    console.log(`Found department mapping: ${dept.slug} for "${departmentName}"`);
    
    // Step 2: Check if there's a direct match with the department slug
    if (DEPARTMENT_SLUGS_WITH_PAGES.includes(dept.slug)) {
      console.log(`Found direct slug match: ${dept.slug}`);
      return dept.slug;
    }
    
    // Step 3: Try to match based on department code
    if (dept.code) {
      const codePrefix = `${dept.code}_`;
      const markdownWithCode = DEPARTMENT_SLUGS_WITH_PAGES.find(pageSlug => 
        pageSlug.startsWith(codePrefix)
      );
      
      if (markdownWithCode) {
        console.log(`Found code match: ${markdownWithCode} for code ${dept.code}`);
        return markdownWithCode;
      }
    }
  }
  
  // Step 4: Try to match based on normalized name
  const normalizedName = normalizeForMatching(departmentName).replace(/\s+/g, '_');
  console.log(`Trying normalized name: "${normalizedName}"`);
  
  const similarNameMatch = DEPARTMENT_SLUGS_WITH_PAGES.find(pageSlug => {
    // Extract the name part of the slug (after the code prefix)
    const namePart = pageSlug.includes('_') 
      ? pageSlug.substring(pageSlug.indexOf('_') + 1) 
      : pageSlug;
    
    return namePart.includes(normalizedName) || normalizedName.includes(namePart);
  });
  
  if (similarNameMatch) {
    console.log(`Found similar name match: ${similarNameMatch}`);
    return similarNameMatch;
  }
  
  // Step 5: Try with and without "California" prefix
  let alternativeName = departmentName;
  if (departmentName.startsWith("California ")) {
    alternativeName = departmentName.substring("California ".length);
  } else {
    alternativeName = "California " + departmentName;
  }
  
  // Try to find department with alternative name
  const altDept = getDepartmentByName(alternativeName);
  if (altDept && DEPARTMENT_SLUGS_WITH_PAGES.includes(altDept.slug)) {
    console.log(`Found match with alternative name "${alternativeName}": ${altDept.slug}`);
    return altDept.slug;
  }
  
  // Step 6: Fuzzy search - check all page slugs for partial matches
  const fuzzyMatch = DEPARTMENT_SLUGS_WITH_PAGES.find(pageSlug => {
    const deptPart = departmentName.toLowerCase().replace(/california\s+/, '').replace(/\s+/g, '_');
    return pageSlug.toLowerCase().includes(deptPart);
  });
  
  if (fuzzyMatch) {
    console.log(`Found fuzzy match: ${fuzzyMatch}`);
    return fuzzyMatch;
  }
  
  console.log(`No markdown found for: "${departmentName}"`);
  return null;
} 