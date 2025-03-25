// This file provides mapping between department slugs and their corresponding names
// in the spending and workforce data
import departmentsData from '@/data/departments.json';
import { 
  DepartmentsJSON, 
  DepartmentMapping, 
  VerificationResult,
  FiscalYearKey,
  ValidSlug,
  NonNegativeInteger
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
    slug: dept.slug as ValidSlug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    budgetCode: toNonNegativeInteger(dept.budgetCode),
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
        dept = typedDepartmentsData.departments.find(d => 
          (typeof d.budgetCode === 'string' ? parseInt(d.budgetCode, 10) : d.budgetCode) === 
          (typeof codeFromSlug === 'string' ? parseInt(codeFromSlug, 10) : codeFromSlug)
        );
        
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
    slug: dept.slug as ValidSlug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    budgetCode: toNonNegativeInteger(dept.budgetCode),
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
    slug: dept.slug as ValidSlug,
    name: dept.name,
    canonicalName: dept.canonicalName,
    budgetCode: toNonNegativeInteger(dept.budgetCode),
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
    slug: matchedDept.slug as ValidSlug,
    name: matchedDept.name,
    canonicalName: matchedDept.canonicalName,
    budgetCode: toNonNegativeInteger(matchedDept.budgetCode),
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
    slug: matchedDept.slug as ValidSlug,
    name: matchedDept.name,
    canonicalName: matchedDept.canonicalName,
    budgetCode: toNonNegativeInteger(matchedDept.budgetCode),
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
  
  // Find the markdown slug that corresponds to this department
  const markdownSlug = findMarkdownForDepartment(dept.name);
  if (!markdownSlug) {
    console.log(`No markdown file found for department: ${dept.name}`);
    return null;
  }
  
  return `/spend?department=${encodeURIComponent(markdownSlug)}`;
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
  
  // Find the markdown slug that corresponds to this department
  const markdownSlug = findMarkdownForDepartment(dept.name);
  if (!markdownSlug) {
    console.log(`No markdown file found for department: ${dept.name}`);
    return null;
  }
  
  return `/workforce?department=${encodeURIComponent(markdownSlug)}`;
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
  spendingData: { agencies: Array<{ name: string; spending: Record<string, string | number> }> },
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
    
    // Check a sample value using FiscalYearKey
    const sampleYear = 'FY2023-FY2024' as FiscalYearKey;
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
    // Cast the slug to ValidSlug since we know it matches the pattern
    const validSlug = slug as ValidSlug;
    const dept = getDepartmentBySlug(validSlug);
    if (dept) {
      result.matched.push(`${slug} -> ${dept.name} (${dept.budgetCode})`);
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
 * Type guard to check if a string is a valid slug
 */
function isValidSlugFormat(str: string): str is ValidSlug {
  return /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(str);
}

export function compareSlugFormats(): void {
  console.log('Comparing department slugs with markdown file slugs:');
  
  const departmentSlugs = typedDepartmentsData.departments.map(dept => dept.slug);
  const validPageSlugs = DEPARTMENT_SLUGS_WITH_PAGES.filter(isValidSlugFormat);
  
  console.log(`Found ${departmentSlugs.length} department slugs and ${DEPARTMENT_SLUGS_WITH_PAGES.length} markdown page slugs`);
  
  // Find department slugs that don't match any markdown page slugs directly
  const unmatchedDeptSlugs = departmentSlugs.filter(slug => 
    !validPageSlugs.includes(slug) && 
    !hasDepartmentPage(slug)
  );
  
  if (unmatchedDeptSlugs.length > 0) {
    console.log(`${unmatchedDeptSlugs.length} department slugs don't match any markdown page:`);
    unmatchedDeptSlugs.forEach(slug => {
      // For each unmatched slug, find the department name
      const dept = typedDepartmentsData.departments.find(d => d.slug === slug);
      console.log(`  - ${slug} (${dept?.name || 'unknown'})`);
      
      // Try to find a close match in the markdown files
      const potentialMatches = validPageSlugs.filter(pageSlug => 
        pageSlug.includes(slug.toString()) || slug.toString().includes(pageSlug)
      );
      
      if (potentialMatches.length > 0) {
        console.log('    Potential matches:');
        potentialMatches.forEach(match => console.log(`    - ${match}`));
      }
    });
  }
  
  // Find markdown page slugs that don't match any department slugs
  const unmatchedPageSlugs = validPageSlugs.filter(pageSlug => 
    !departmentSlugs.includes(pageSlug)
  );
  
  if (unmatchedPageSlugs.length > 0) {
    console.log(`${unmatchedPageSlugs.length} markdown page slugs don't match any department slugs directly:`);
    unmatchedPageSlugs.forEach(pageSlug => {
      console.log(`  - ${pageSlug}`);
      
      // For each unmatched page slug, try to find the department that would match it
      const matchedDept = typedDepartmentsData.departments.find(dept => 
        hasDepartmentPage(dept.slug) && 
        !validPageSlugs.includes(dept.slug)
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
    if (dept.budgetCode) {
      const codePrefix = `${dept.budgetCode}_`;
      const markdownWithCode = DEPARTMENT_SLUGS_WITH_PAGES.find(pageSlug => 
        pageSlug.startsWith(codePrefix)
      );
      
      if (markdownWithCode) {
        console.log(`Found code match: ${markdownWithCode} for code ${dept.budgetCode}`);
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

function toNonNegativeInteger(value: string | number | undefined): NonNegativeInteger {
  const num = typeof value === 'string' ? parseInt(value, 10) : (value || 0);
  return num as NonNegativeInteger;
} 