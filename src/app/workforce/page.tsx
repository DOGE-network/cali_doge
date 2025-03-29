/**
 * Workforce Page Component
 * 
 * Purpose:
 * Displays a hierarchical view of California State Government workforce data,
 * including employee counts, salaries, and organizational relationships.
 * 
 * Data Structure:
 * - Level 0: California State Government (root)
 * - All other agencies are organized by their parent_agency relationship
 * 
 * Operations Steps:
 * 1. Data Loading & Validation
 *    1.1 Initialize Logging
 *        [INFO] [INIT] Creating log file: /logs/workforce-{YYYY-MM-DD-HH-mm-ss}.log
 *        [INFO] [INIT] Logging system initialized with timestamp format: YYYY-MM-DD HH:mm:ss.SSS
 * 
 *    1.2 API Request
 *        [INFO] [API] Initiating departments fetch request
 *        [DEBUG] [API] Request parameters: { cache: 3600 }
 *        [INFO] [API] Response received: { status: 200, size: X bytes }
 *        [ERROR] [API] Failed to fetch departments: { error details }
 * 
 *    1.3 Data Validation
 *        [INFO] [VALIDATE] Starting department data validation
 *        [DEBUG] [VALIDATE] Total departments received: { count }
 *        [INFO] [VALIDATE] Type checking against DepartmentData interface
 *        [WARN] [VALIDATE] Type mismatch found: { field, expected, received }
 *        [INFO] [VALIDATE] Validation complete: { passed/failed, error count }
 * 
 * 2. Hierarchy Construction
 *    2.1 Root Department Setup
 *        [INFO] [HIERARCHY] Initializing root department
 *        [DEBUG] [HIERARCHY] Root department data: { name, level, parent }
 *        [INFO] [HIERARCHY] Root department created successfully
 * 
 *    2.2 Department Mapping
 *        [INFO] [HIERARCHY] Building department lookup maps
 *        [DEBUG] [HIERARCHY] Processing department: { name, level, parent }
 *        [WARN] [HIERARCHY] Department without parent: { name, level }
 *        [INFO] [HIERARCHY] Maps created: { deptMap size, levelMap size, aliasMap size }
 * 
 *    2.3 Parent-Child Relationships
 *        [INFO] [HIERARCHY] Establishing parent-child relationships
 *        [DEBUG] [HIERARCHY] Processing level { level }: { count } departments
 *        [WARN] [HIERARCHY] Unattached department: { name, level }
 *        [INFO] [HIERARCHY] Level { level } complete: { attached, unattached } departments
 * 
 *    2.4 Hierarchy Finalization
 *        [INFO] [HIERARCHY] Sorting departments alphabetically
 *        [INFO] [HIERARCHY] Calculating subordinate offices
 *        [INFO] [HIERARCHY] Hierarchy construction complete: { total departments, levels }
 * 
 * 3. Data Aggregation
 *    3.1 Distribution Processing
 *        [INFO] [AGGREGATE] Starting distribution aggregation
 *        [DEBUG] [AGGREGATE] Processing department: { name }
 *        [WARN] [AGGREGATE] Missing distribution data: { department, type }
 *        [INFO] [AGGREGATE] Distribution processing complete
 * 
 *    3.2 Yearly Data Aggregation
 *        [INFO] [AGGREGATE] Aggregating yearly data for { year }
 *        [DEBUG] [AGGREGATE] Department { name } yearly data: { stats }
 *        [WARN] [AGGREGATE] Incomplete yearly data: { department, year }
 *        [INFO] [AGGREGATE] Yearly aggregation complete
 * 
 *    3.3 Final Aggregation
 *        [INFO] [AGGREGATE] Computing final aggregated distributions
 *        [DEBUG] [AGGREGATE] Distribution counts: { tenure, salary, age }
 *        [INFO] [AGGREGATE] Aggregation complete: { total processed }
 * 
 * 4. Performance Monitoring
 *    4.1 Component Rendering
 *        [INFO] [PERF] Component render started
 *        [DEBUG] [PERF] Render timing: { start, end, duration }
 *        [INFO] [PERF] Component render complete
 * 
 *    4.2 Hierarchy Operations
 *        [INFO] [PERF] Starting hierarchy traversal
 *        [DEBUG] [PERF] Traversal timing: { start, end, duration }
 *        [INFO] [PERF] Hierarchy traversal complete
 * 
 *    4.3 Memory Usage
 *        [INFO] [PERF] Memory usage check
 *        [DEBUG] [PERF] Current memory: { usage }
 *        [WARN] [PERF] High memory usage detected: { threshold }
 * 
 * 5. Debug Information
 *    5.1 User Interactions
 *        [INFO] [DEBUG] Department selected: { name }
 *        [INFO] [DEBUG] Fiscal year changed: { old, new }
 *        [INFO] [DEBUG] Path navigation: { from, to }
 * 
 *    5.2 State Changes
 *        [INFO] [DEBUG] State update: { type, value }
 *        [DEBUG] [DEBUG] Previous state: { value }
 *        [INFO] [DEBUG] State update complete
 * 
 *    5.3 Display Updates
 *        [INFO] [DEBUG] Updating display for: { department }
 *        [DEBUG] [DEBUG] Display parameters: { params }
 *        [INFO] [DEBUG] Display update complete
 * 
 * Logging Format:
 * [YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [OPERATION] message
 * Example:
 * [2024-03-15 14:30:45.123] [INFO] [HIERARCHY] Processing level 1: found 15 departments
 * 
 * Key Functions:
 * 
 * buildHierarchy(departments: DepartmentData[]): DepartmentData
 * - Creates a hierarchical tree of departments based on parent_agency relationships
 * - Each department becomes a node in the tree
 * - If a department has a parent_agency, it becomes a child of that department
 * - Sorts all departments alphabetically at each level
 * - Calculates number of subordinate departments for each department
 * - Logs hierarchy construction steps and results
 * 
 * Display Rules:
 * - Always show path to root and ancestors (no data/charts)
 * - Show active card with data and charts. if no json chart data then display no-data-yet svg for each chart missing data
 * - Show immediate children of active card (no data)
 * - Hide all other branches

// When nothing is selected:
// - Show California State Government (Level 0). show data and charts.
// - Show Level 1 branches (no data or charts)
// - Hide everything else
**/

'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import AgencyDataVisualization from '../../components/AgencyDataVisualization';
import type { DepartmentData, DepartmentHierarchy, NonNegativeInteger, ValidSlug, BudgetStatus, RawDistributionItem, AnnualYear, TenureRange, SalaryRange, AgeRange, NonNegativeNumber } from '@/types/department';
import { getDepartmentByName, getDepartmentByWorkforceName } from '@/lib/departmentMapping';
import { log, generateTransactionId } from '@/lib/logging';
import { Button } from '@/components/ui/button';

// Initialize logging
const initTransactionId = generateTransactionId();
log('INFO', initTransactionId, 'Step 1.1: Creating log file', { file: '/logs/workforce-{YYYY-MM-DD-HH-mm-ss}.log' });
log('INFO', initTransactionId, 'Step 1.1: Logging system initialized with timestamp format: YYYY-MM-DD HH:mm:ss.SSS');

// Helper function to count total departments in hierarchy
function countDepartments(hierarchy: DepartmentHierarchy | DepartmentHierarchy[]): number {
  const transactionId = generateTransactionId();
  log('INFO', transactionId, 'Counting departments in hierarchy');
  
  if (!hierarchy) return 0;
  if (Array.isArray(hierarchy)) {
    return hierarchy.reduce((sum, dept) => sum + countDepartments(dept), 0);
  }
  let count = 1; // Count current department
  if (hierarchy.subDepartments) {
    count += hierarchy.subDepartments.reduce((acc, dept) => acc + countDepartments(dept), 0);
  }
  
  log('INFO', transactionId, 'Department count complete', { count });
  return count;
}

// Helper function to aggregate distribution arrays
function aggregateDistributions(departments: DepartmentHierarchy[]): {
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
} {
  const transactionId = generateTransactionId();
  
  // 3.1 Distribution Processing
  log('INFO', transactionId, 'Step 3.1: Starting distribution aggregation');
  
  const result = {
    tenureDistribution: [] as RawDistributionItem[],
    salaryDistribution: [] as RawDistributionItem[],
    ageDistribution: [] as RawDistributionItem[]
  };

  // Helper to aggregate a single distribution type
  const aggregateDistribution = (distributions: RawDistributionItem[][], type: 'tenure' | 'salary' | 'age'): RawDistributionItem[] => {
    log('DEBUG', transactionId, 'Step 3.1: Processing department', { 
      distributionCount: distributions.length 
    });

    const rangeMap = new Map<string, number>();

    distributions.forEach((dist, index) => {
      if (!dist || !Array.isArray(dist)) {
        log('WARN', transactionId, `Step 3.1: Missing ${type} distribution data`, { 
          department: 'unknown',
          index
        });
        return;
      }
      dist.forEach(item => {
        if (!item || !Array.isArray(item.range)) {
          log('WARN', transactionId, `Step 3.1: Invalid ${type} distribution item`, { 
            item,
            index
          });
          return;
        }
        const key = `${item.range[0]}-${item.range[1]}`;
        rangeMap.set(key, (rangeMap.get(key) || 0) + item.count);
      });
    });

    const result = Array.from(rangeMap.entries()).map(([key, count]) => ({
      range: key.split('-').map(Number) as [number, number],
      count
    }));

    log('INFO', transactionId, `Step 3.1: ${type} distribution processing complete`, {
      uniqueRanges: result.length,
      totalCount: result.reduce((sum, item) => sum + item.count, 0)
    });
    return result;
  };

  // 3.2 Yearly Data Aggregation
  log('INFO', transactionId, 'Step 3.2: Aggregating yearly data for 2023');
  
  // Get all distributions from departments and their subdepartments recursively
  const getAllDistributions = (depts: DepartmentHierarchy[], isRoot: boolean = false) => {
    log('DEBUG', transactionId, 'Step 3.2: Department yearly data', { 
      departmentCount: depts.length,
      isRoot 
    });

    const distributions = {
      tenure: [] as RawDistributionItem[][],
      salary: [] as RawDistributionItem[][],
      age: [] as RawDistributionItem[][]
    };

    depts.forEach(dept => {
      // Always include the current department's distributions if they exist
      if (dept.tenureDistribution?.yearly?.["2023"]) {
        log('DEBUG', transactionId, 'Step 3.2: Found tenure distribution', {
          department: dept.name,
          distributionCount: dept.tenureDistribution.yearly["2023"].length
        });
        distributions.tenure.push(dept.tenureDistribution.yearly["2023"]);
      }
      if (dept.salaryDistribution?.yearly?.["2023"]) {
        log('DEBUG', transactionId, 'Step 3.2: Found salary distribution', {
          department: dept.name,
          distributionCount: dept.salaryDistribution.yearly["2023"].length
        });
        distributions.salary.push(dept.salaryDistribution.yearly["2023"]);
      }
      if (dept.ageDistribution?.yearly?.["2023"]) {
        log('DEBUG', transactionId, 'Step 3.2: Found age distribution', {
          department: dept.name,
          distributionCount: dept.ageDistribution.yearly["2023"].length
        });
        distributions.age.push(dept.ageDistribution.yearly["2023"]);
      }

      // Process subdepartments if they exist
      if (dept.subDepartments?.length) {
        log('DEBUG', transactionId, 'Step 3.2: Processing subdepartments', {
          department: dept.name,
          subDepartmentCount: dept.subDepartments.length
        });
        
        const subDistributions = getAllDistributions(dept.subDepartments);
        
        // Add subdepartment distributions
        distributions.tenure.push(...subDistributions.tenure);
        distributions.salary.push(...subDistributions.salary);
        distributions.age.push(...subDistributions.age);
      }
    });

    return distributions;
  };

  const allDistributions = getAllDistributions(departments, true);
  
  // 3.3 Final Aggregation
  log('INFO', transactionId, 'Step 3.3: Computing final aggregated distributions');
  
  result.tenureDistribution = aggregateDistribution(allDistributions.tenure, 'tenure');
  result.salaryDistribution = aggregateDistribution(allDistributions.salary, 'salary');
  result.ageDistribution = aggregateDistribution(allDistributions.age, 'age');

  log('DEBUG', transactionId, 'Step 3.3: Distribution counts', {
    tenure: result.tenureDistribution.length,
    salary: result.salaryDistribution.length,
    age: result.ageDistribution.length
  });
  
  log('INFO', transactionId, 'Step 3.3: Aggregation complete', { 
    totalProcessed: departments.length 
  });

  return result;
}

function buildHierarchy(departments: DepartmentData[]): DepartmentHierarchy {
  const transactionId = generateTransactionId();
  
  // 2.1 Root Department Setup
  log('INFO', transactionId, 'Step 2.1: Initializing root department');
  log('DEBUG', transactionId, 'Step 2.1: Root department data', { 
    name: 'California State Government',
    level: 0,
    parent: null
  });

  // Find the California State Government department from the data
  const rootDept = departments.find(d => d.name === 'California State Government');
  
  // Create root department using actual data
  const emptyYearlyRecord = {} as Record<AnnualYear, number | {}>;
  const emptyTenureRecord = {} as Record<AnnualYear, TenureRange[]>;
  const emptySalaryRecord = {} as Record<AnnualYear, SalaryRange[]>;
  const emptyAgeRecord = {} as Record<AnnualYear, AgeRange[]>;
  
  const root: DepartmentHierarchy = {
    ...(rootDept || {
      name: 'California State Government',
      slug: ('california_state_government' as ValidSlug),
      canonicalName: 'California State Government',
      aliases: [],
      orgLevel: (0 as NonNegativeInteger),
      budget_status: 'active' as BudgetStatus,
      keyFunctions: 'State Government',
      abbreviation: 'CA',
      parent_agency: '',
      headCount: { yearly: emptyYearlyRecord },
      wages: { yearly: emptyYearlyRecord },
      averageTenureYears: null,
      averageSalary: null,
      averageAge: null,
      tenureDistribution: { yearly: emptyTenureRecord },
      salaryDistribution: { yearly: emptySalaryRecord },
      ageDistribution: { yearly: emptyAgeRecord }
    }),
    subDepartments: [],
    subordinateOffices: 0,
    orgLevel: (0 as NonNegativeInteger),
    parent_agency: '',
  };

  log('INFO', transactionId, 'Step 2.1: Root department created successfully');

  // 2.2 Department Mapping
  log('INFO', transactionId, 'Step 2.2: Building department lookup maps');
  
  // Create maps for lookup
  const deptMap = new Map<string, DepartmentHierarchy>();
  const levelMap = new Map<number, DepartmentHierarchy[]>();
  const aliasMap = new Map<string, DepartmentHierarchy>();
  
  // First pass: Initialize all departments and build lookup maps
  departments.forEach(dept => {
    if (dept.name === 'California State Government') return;
    
    log('DEBUG', transactionId, 'Step 2.2: Processing department', { 
      name: dept.name,
      level: dept.orgLevel,
      parent: dept.parent_agency
    });

    const department: DepartmentHierarchy = {
      ...dept,
      subDepartments: [],
      subordinateOffices: 0
    };
    
    deptMap.set(dept.name, department);
    
    if (dept.aliases) {
      dept.aliases.forEach(alias => {
        aliasMap.set(alias.toLowerCase(), department);
      });
    }
    
    const level = dept.orgLevel || 999;
    if (!levelMap.has(level)) {
      levelMap.set(level, []);
    }
    levelMap.get(level)?.push(department);
  });

  log('INFO', transactionId, 'Step 2.2: Maps created', {
    deptMapSize: deptMap.size,
    levelMapSize: levelMap.size,
    aliasMapSize: aliasMap.size
  });

  // Add root to maps
  deptMap.set(root.name, root);
  levelMap.set(0, [root]);

  // 2.3 Parent-Child Relationships
  log('INFO', transactionId, 'Step 2.3: Establishing parent-child relationships');

  // Helper function to normalize department names
  const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, ' ').trim();

  // Helper function to find best parent match
  const findParent = (parentName: string, childLevel: number): DepartmentHierarchy | undefined => {
    let parent = deptMap.get(parentName);
    if (parent) return parent;

    parent = aliasMap.get(normalizeName(parentName));
    if (parent) return parent;

    const normalizedParent = normalizeName(parentName);
    const potentialParents = levelMap.get(childLevel - 1) || [];
    
    return potentialParents.find(p => {
      const normalizedName = normalizeName(p.name);
      return normalizedName.includes(normalizedParent) || 
             normalizedParent.includes(normalizedName) ||
             (p.aliases || []).some(alias => 
               normalizeName(alias).includes(normalizedParent) || 
               normalizedParent.includes(normalizeName(alias))
             );
    });
  };

  // Second pass: Build hierarchy by orgLevel
  const unattachedDepts = new Set(deptMap.keys());
  unattachedDepts.delete(root.name);

  for (let level = 1; level <= Math.max(...Array.from(levelMap.keys())); level++) {
    const depts = levelMap.get(level) || [];
    
    log('DEBUG', transactionId, `Step 2.3: Processing level ${level}`, { 
      departmentCount: depts.length 
    });
    
    for (const dept of depts) {
      let attached = false;
      if (!dept.parent_agency) {
        if (level === 1) {
          root.subDepartments?.push(dept);
          attached = true;
        }
      } else {
        const parent = findParent(dept.parent_agency, level);
        
        if (parent) {
          if (!parent.subDepartments?.some((d: DepartmentHierarchy) => d.name === dept.name)) {
            parent.subDepartments = parent.subDepartments || [];
            parent.subDepartments.push(dept);
            attached = true;
          }
        } else {
          log('WARN', transactionId, 'Step 2.3: Unattached department', { 
            name: dept.name,
            level: dept.orgLevel,
            parent: dept.parent_agency
          });
        }
      }

      if (attached) {
        unattachedDepts.delete(dept.name);
      }
    }

    log('INFO', transactionId, `Step 2.3: Level ${level} complete`, {
      attached: depts.length - unattachedDepts.size,
      unattached: unattachedDepts.size
    });
  }

  // 2.4 Hierarchy Finalization
  log('INFO', transactionId, 'Step 2.4: Sorting departments alphabetically');
  const sortDepartments = (dept: DepartmentHierarchy) => {
    if (dept.subDepartments) {
      dept.subDepartments.sort((a: DepartmentHierarchy, b: DepartmentHierarchy) => a.name.localeCompare(b.name));
      dept.subDepartments.forEach(sortDepartments);
    }
  };
  sortDepartments(root);

  log('INFO', transactionId, 'Step 2.4: Calculating subordinate offices');
  const calculateSubordinatesAndAggregateData = (dept: DepartmentHierarchy): number => {
    // Initialize subordinate count
    dept.subordinateOffices = 0;
    
    // Initialize aggregated totals
    let aggregatedHeadCount = 0;
    let aggregatedWages = 0;
    let hasChildData = false;
    
    // Store original data before aggregation
    dept.originalData = {
      headCount: { yearly: { ...dept.headCount?.yearly } },
      wages: { yearly: { ...dept.wages?.yearly } },
      averageSalary: dept.averageSalary,
      tenureDistribution: dept.tenureDistribution,
      salaryDistribution: dept.salaryDistribution,
      ageDistribution: dept.ageDistribution
    };
    
    // Process subdepartments first
    if (dept.subDepartments && dept.subDepartments.length > 0) {
      // Create arrays to collect all child distributions
      const allDistributions = {
        tenure: [] as RawDistributionItem[][],
        salary: [] as RawDistributionItem[][],
        age: [] as RawDistributionItem[][]
      };

      dept.subDepartments.forEach(child => {
        dept.subordinateOffices += calculateSubordinatesAndAggregateData(child) + 1;
        
        // Aggregate headcount and wages from child departments
        if (typeof child.headCount?.yearly?.["2023"] === 'number') {
          aggregatedHeadCount += child.headCount.yearly["2023"] as number;
          hasChildData = true;
        }
        
        if (typeof child.wages?.yearly?.["2023"] === 'number') {
          aggregatedWages += child.wages.yearly["2023"] as number;
          hasChildData = true;
        }

        // Collect child distributions
        if (child.tenureDistribution?.yearly?.["2023"]) {
          allDistributions.tenure.push(child.tenureDistribution.yearly["2023"]);
        }
        if (child.salaryDistribution?.yearly?.["2023"]) {
          allDistributions.salary.push(child.salaryDistribution.yearly["2023"]);
        }
        if (child.ageDistribution?.yearly?.["2023"]) {
          allDistributions.age.push(child.ageDistribution.yearly["2023"]);
        }
      });

      // Always set aggregatedDistributions for departments with children
      dept.aggregatedDistributions = aggregateDistributions(dept.subDepartments);
    }
    
    // Get the department's own headcount and wages (if they exist)
    const ownHeadCount = typeof dept.headCount?.yearly?.["2023"] === 'number' ? dept.headCount.yearly["2023"] as number : 0;
    const ownWages = typeof dept.wages?.yearly?.["2023"] === 'number' ? dept.wages.yearly["2023"] as number : 0;
    
    // Only update data if we have either own data or child data
    if (hasChildData || ownHeadCount > 0 || ownWages > 0) {
      // Ensure yearly objects exist
      dept.headCount = dept.headCount || { yearly: {} };
      dept.wages = dept.wages || { yearly: {} };
      
      // If parent has no data of its own, use aggregated child data
      // Otherwise, keep parent's own data
      if (ownHeadCount === 0 && ownWages === 0) {
        dept.headCount.yearly["2023"] = aggregatedHeadCount;
        dept.wages.yearly["2023"] = aggregatedWages;
        
        // Calculate average salary from aggregated data
        if (aggregatedHeadCount > 0) {
          dept.averageSalary = (aggregatedWages / aggregatedHeadCount) as NonNegativeNumber;
        }
      } else {
        // Keep parent's own data
        dept.headCount.yearly["2023"] = ownHeadCount;
        dept.wages.yearly["2023"] = ownWages;
        
        // Calculate average salary from own data
        if (ownHeadCount > 0) {
          dept.averageSalary = (ownWages / ownHeadCount) as NonNegativeNumber;
        }
      }
      
      log('INFO', generateTransactionId(), 'Data applied', {
        department: dept.name,
        ownHeadCount,
        childHeadCount: aggregatedHeadCount,
        finalHeadCount: dept.headCount.yearly["2023"],
        ownWages,
        childWages: aggregatedWages,
        finalWages: dept.wages.yearly["2023"],
        calculatedAverageSalary: dept.averageSalary
      });
    }
    
    return dept.subordinateOffices;
  };
  calculateSubordinatesAndAggregateData(root);

  const totalDepartments = countDepartments(root);
  log('INFO', transactionId, 'Step 2.4: Hierarchy construction complete', {
    totalDepartments,
    levels: levelMap.size
  });

  return root;
}

interface DepartmentCardProps {
  department: DepartmentHierarchy;
  isActive: boolean;
  onClick: () => void;
  showChart: boolean;
  viewMode: 'aggregated' | 'parent-only';
}

function DepartmentCard({ department, isActive, onClick, showChart, viewMode }: DepartmentCardProps) {
  // Get FY2023 specific data with proper type checking
  const _workforceData = typeof department.headCount?.yearly?.["2023"] === 'number' ? department.headCount.yearly["2023"] : undefined;
  const _wagesData = typeof department.wages?.yearly?.["2023"] === 'number' ? department.wages.yearly["2023"] : undefined;
  const _averageSalary = typeof department.averageSalary === 'number' ? department.averageSalary : undefined;
  
  return (
    <div className={`space-y-4 ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div 
        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer relative"
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {department.name}
              {department.abbreviation && <span className="ml-2 text-sm text-gray-500">({department.abbreviation})</span>}
              {department.budgetCode && (
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {department.budgetCode}
                </span>
              )}
              <span className="ml-2 text-xs text-gray-500">(FY2023)</span>
            </h3>
            {department.keyFunctions && (
              <p className="mt-2 text-sm text-gray-600">{department.keyFunctions}</p>
            )}
          </div>
          {department.subordinateOffices !== undefined && department.subordinateOffices > 0 && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">{department.subordinateOffices}</span>
            </div>
          )}
        </div>
      </div>
      {showChart && (
        <div className="chart-wrapper">
          <AgencyDataVisualization 
            department={department} 
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}

interface SubDepartmentSectionProps {
  department: DepartmentHierarchy;
  parentPath: string[];
  activeAgencyPath: string[];
  onDepartmentClick: (_path: string[]) => void;
  viewMode: 'aggregated' | 'parent-only';
}

function SubDepartmentSection({ 
  department, 
  parentPath,
  activeAgencyPath,
  onDepartmentClick,
  viewMode
}: SubDepartmentSectionProps) {
  // Check if this is the root department "California State Government"
  const isRoot = department.name === 'California State Government';
  
  // Check if this department is the currently selected item
  const isActiveItem = activeAgencyPath.length === parentPath.length + 1 && 
    activeAgencyPath[parentPath.length] === department.name;
  
  // Check if this is a direct child of the active item
  const isChildOfActive = parentPath.length > 0 && 
    parentPath.join('/') === activeAgencyPath.join('/') &&
    !activeAgencyPath.includes(department.name);
  
  // Check if this is an ancestor in the path to the active item
  const isAncestorOfActive = activeAgencyPath.length > parentPath.length + 1 && 
    activeAgencyPath[parentPath.length] === department.name;
  
  // Show chart only when this department is specifically selected
  const showChart = isActiveItem;
  
  // Show subdepartments only if this is active or an ancestor of active
  const showSubDepartments = isActiveItem || isAncestorOfActive;
  
  const fullPath = [...parentPath, department.name];
  
  // Don't render this department if it's not in the path to active, not active, and not a child of active
  if (!isActiveItem && !isAncestorOfActive && !isChildOfActive) {
    return null;
  }
  
  // Get departments to display as children
  let displaySubDepartments = department.subDepartments || [];
  
  // Special handling for root level - only show direct children with parent_agency == "California State Government"
  if (isRoot && isActiveItem) {
    displaySubDepartments = displaySubDepartments.filter(dept => 
      dept.parent_agency === 'California State Government'
    );
  }
  
  return (
    <div>
      <DepartmentCard 
        department={department}
        isActive={isActiveItem}
        onClick={() => onDepartmentClick(fullPath)}
        showChart={showChart}
        viewMode={viewMode}
      />
      
      {displaySubDepartments && showSubDepartments && (
        <div className="grid grid-cols-1 gap-4 mt-4 ml-4">
          {displaySubDepartments.map((subDept) => (
            <SubDepartmentSection
              key={subDept.name}
              department={subDept}
              parentPath={fullPath}
              activeAgencyPath={activeAgencyPath}
              onDepartmentClick={onDepartmentClick}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkforcePage() {
  return (
    <Suspense fallback={<div className="p-4">Loading workforce data...</div>}>
      <WorkforcePageContent />
    </Suspense>
  );
}

function WorkforcePageContent() {
  // Generate a single transaction ID for the component lifecycle
  const transactionId = useMemo(() => generateTransactionId(), []);
  
  const searchParams = useSearchParams();
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | null>(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("2023");
  const [activePath, setActivePath] = useState<string[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'aggregated' | 'parent-only'>('aggregated');
  
  // Refs for tracking state changes
  const prevState = useRef<{
    hasHierarchy: boolean;
    selectedDepartment: string | null;
    activePath: string[];
    error: string | null;
  }>({
    hasHierarchy: false,
    selectedDepartment: null,
    activePath: [],
    error: null
  });

  const prevDisplayState = useRef<{
    activeDepartment: string | undefined;
    pathLength: number;
    childCount: number;
    totalDisplayed: number;
  }>({
    activeDepartment: undefined,
    pathLength: 0,
    childCount: 0,
    totalDisplayed: 0
  });
  
  // Component initialization logging - only once
  useEffect(() => {
    log('INFO', transactionId, 'Component initialized', {
      searchParams: Object.fromEntries(searchParams.entries())
    });
  }, [transactionId, searchParams]);

  // Fetch departments and build hierarchy
  useEffect(() => {
    async function loadDepartments() {
      try {
        setError(null);
        const response = await fetch('/api/departments?format=departments');
        if (!response.ok) {
          throw new Error('Failed to fetch departments');
        }
        const deps = await response.json();
        log('INFO', transactionId, 'Departments fetched successfully', {
          count: deps.length
        });
        setDepartments(deps);
      } catch (err) {
        log('ERROR', transactionId, 'Failed to load departments', { error: err });
        console.error('Error loading departments:', err);
        setError('Failed to load department data');
      }
    }
    loadDepartments();
  }, [transactionId]);

  const hierarchyData = useMemo(() => {
    if (!departments) {
      return null;
    }
    
    const hierarchy = buildHierarchy(departments);
    log('INFO', transactionId, 'Hierarchy built successfully', {
      rootDepartment: hierarchy.name,
      totalDepartments: countDepartments(hierarchy)
    });
    
    return hierarchy;
  }, [departments, transactionId]);

  // URL parameter effect
  useEffect(() => {
    const agencyParam = searchParams.get('agency');
    const departmentParam = searchParams.get('department');
    
    if (departmentParam) {
      const dept = getDepartmentByName(departmentParam);
      if (dept) {
        log('INFO', transactionId, 'Department found by name', {
          department: dept.name
        });
        setSelectedDepartmentName(dept.name);
      } else {
        const workforceDept = getDepartmentByWorkforceName(departmentParam);
        if (workforceDept) {
          log('INFO', transactionId, 'Department found by workforce name', {
            department: workforceDept.name
          });
          setSelectedDepartmentName(workforceDept.name);
        } else {
          log('WARN', transactionId, 'Department not found in mappings', {
            department: departmentParam
          });
          setSelectedDepartmentName(departmentParam);
        }
      }
    } else if (agencyParam) {
      log('INFO', transactionId, 'Setting department from agency parameter', {
        agency: agencyParam
      });
      setSelectedDepartmentName(agencyParam);
    }
  }, [searchParams, transactionId]);
  
  // Department selection effect
  useEffect(() => {
    if (!hierarchyData) return;
    
    if (!selectedDepartmentName) {
      setActivePath([hierarchyData.name]);
      log('INFO', transactionId, 'No department selected, defaulting to root');
      return;
    }
    
    // Function to find department by name in hierarchy
    const findDepartmentByName = (
      departments: DepartmentHierarchy[], 
      targetName: string, 
      currentPath: string[] = []
    ): { department: DepartmentHierarchy | null; path: string[] } => {
      for (const dept of departments) {
        const updatedPath = [...currentPath, dept.name];
        
        if (dept.name === targetName) {
          return { department: dept, path: updatedPath };
        }
        
        if (dept.subDepartments) {
          const result = findDepartmentByName(dept.subDepartments, targetName, updatedPath);
          if (result.department) {
            return result;
          }
        }
      }
      
      return { department: null, path: [] };
    };
    
    if (selectedDepartmentName === hierarchyData.name) {
      setActivePath([hierarchyData.name]);
      log('INFO', transactionId, 'Root department selected');
      return;
    }
    
    const result = findDepartmentByName(
      hierarchyData.subDepartments || [],
      selectedDepartmentName,
      [hierarchyData.name]
    );
    
    if (result.department) {
      setActivePath(result.path);
      log('INFO', transactionId, 'Active path updated', {
        path: result.path
      });
    } else {
      setActivePath([hierarchyData.name]);
      log('WARN', transactionId, 'Department not found, defaulting to root');
    }
  }, [selectedDepartmentName, hierarchyData, transactionId]);

  // Log state changes
  useEffect(() => {
    const currentState = {
      hasHierarchy: !!hierarchyData,
      selectedDepartment: selectedDepartmentName,
      activePath,
      error
    };

    // Only log if state has changed
    if (JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
      log('INFO', transactionId, 'Component state changed', currentState);
      prevState.current = currentState;
    }
  }, [hierarchyData, selectedDepartmentName, activePath, error, transactionId]);

  // Get path departments to display
  const pathDepartments = useMemo(() => {
    const departments: DepartmentData[] = [];
    let currentDepartments = [hierarchyData];
    
    for (let i = 0; i < activePath.length; i++) {
      const currentName = activePath[i];
      const foundDepartment = currentDepartments.find(d => d?.name === currentName);
      
      if (foundDepartment) {
        departments.push(foundDepartment);
        if (foundDepartment.subDepartments) {
          currentDepartments = foundDepartment.subDepartments;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    return departments;
  }, [hierarchyData, activePath]);
  
  // The last department in the path is the active one
  const currentActiveDepartment = pathDepartments[pathDepartments.length - 1] as DepartmentHierarchy;
  
  // Child departments of the active department
  const childDepartments = currentActiveDepartment?.subDepartments || [];
  const childDepartmentsToDisplay = currentActiveDepartment?.name === 'California State Government' ?
    childDepartments.filter(dept => dept.parent_agency === 'California State Government') :
    childDepartments;

  // Log display state changes
  useEffect(() => {
    const currentDisplayState = {
      activeDepartment: currentActiveDepartment?.name,
      pathLength: pathDepartments.length,
      childCount: childDepartmentsToDisplay.length,
      totalDisplayed: pathDepartments.length + childDepartmentsToDisplay.length
    };

    if (JSON.stringify(prevDisplayState.current) !== JSON.stringify(currentDisplayState)) {
      log('INFO', transactionId, 'Display state updated', currentDisplayState);
      prevDisplayState.current = currentDisplayState;
    }
  }, [currentActiveDepartment, pathDepartments, childDepartmentsToDisplay, transactionId]);
  
  // Handle department selection
  const handleSelectDepartment = (department: DepartmentData) => {
    log('INFO', transactionId, 'Department selected by user', {
      department: department.name,
      currentPath: activePath
    });
    setSelectedDepartmentName(department.name);
  };

  if (error) {
    log('ERROR', transactionId, 'Displaying error state', { error });
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!hierarchyData) {
    log('INFO', transactionId, 'Displaying loading state');
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">California State Government Workforce</h1>
          <p className="text-sm text-gray-600 mt-1">Salary, Headcount and Wages numbers are from department salaries found at <a href="https://publicpay.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">publicpay.ca.gov</a>. Wages are calculated as regulary wages plus any benefits.</p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
              <Button
                variant={viewMode === 'parent-only' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${viewMode === 'parent-only' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setViewMode('parent-only')}
              >
                Parent Only
              </Button>
              <Button
                variant={viewMode === 'aggregated' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${viewMode === 'aggregated' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => setViewMode('aggregated')}
              >
                Include Children
              </Button>
            </div>
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
              <label htmlFor="fiscalYear" className="text-xs text-gray-600 px-2">Annual Year:</label>
              <select
                id="fiscalYear"
                value={selectedFiscalYear}
                onChange={(e) => setSelectedFiscalYear(e.target.value)}
                className="text-xs font-medium rounded-full bg-gray-100 shadow-sm border-0 focus:ring-0 focus:outline-none px-2 py-1"
              >
                {Array.from({ length: 16 }, (_, i) => (2010 + i).toString()).map((year: string) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-10">
        <nav className="mb-4">
          <ol className="flex flex-wrap items-center">
            {pathDepartments.map((dept: DepartmentData, index: number) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-gray-400">/</span>
                )}
                <button 
                  onClick={() => handleSelectDepartment(dept)}
                  className={`text-sm ${
                    index === pathDepartments.length - 1 
                      ? 'font-bold text-blue-600' 
                      : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  {dept.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        
        {currentActiveDepartment && (
          <div className="mb-6">
            <DepartmentCard 
              department={currentActiveDepartment} 
              isActive={true} 
              onClick={() => {}} 
              showChart={true} 
              viewMode={viewMode}
            />
          </div>
        )}
        
        {childDepartmentsToDisplay.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Departments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {childDepartmentsToDisplay.map((dept: DepartmentHierarchy) => (
                <DepartmentCard
                  key={dept.name}
                  department={dept}
                  isActive={false}
                  onClick={() => handleSelectDepartment(dept)}
                  showChart={false}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-8">
        <h3 className="text-md font-semibold mb-2">Understanding the Hierarchy</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          <li>Click on any department to view its details and subdivisions</li>
          <li>Use the breadcrumb navigation above to return to previous levels</li>
        </ul>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Sources</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          <li>
            <a 
              href="https://publicpay.ca.gov/Reports/State/State.aspx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California State Controller&apos;s Office - Government Compensation in California
            </a>
          </li>
          <li>
            <a 
              href="https://www.calhr.ca.gov/pages/workforce-planning-statistics.aspx" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Department of Human Resources - Workforce Statistics
            </a>
          </li>
          <li>
            <a 
              href="https://lao.ca.gov/StateWorkforce" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Legislative Analyst&apos;s Office - State Workforce Reports
            </a>
          </li>
          <li>
            <a 
              href="https://dof.ca.gov/forecasting/demographics/state-and-county-population-projections/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              California Department of Finance - Employment Data
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
} 