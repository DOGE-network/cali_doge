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
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AgencyDataVisualization from '../../components/AgencyDataVisualization';
import type { DepartmentData, DepartmentHierarchy, NonNegativeInteger, BudgetStatus, RawDistributionItem, AnnualYear, TenureRange, SalaryRange, AgeRange, NonNegativeNumber } from '@/types/department';
import { log, generateTransactionId } from '@/lib/logging';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analytics } from '@/lib/analytics';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface WorkforceResponse {
  departments: DepartmentData[];
}

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
function aggregateDistributions(departments: DepartmentHierarchy[], selectedFiscalYear: AnnualYear): {
  tenureDistribution: RawDistributionItem[];
  salaryDistribution: RawDistributionItem[];
  ageDistribution: RawDistributionItem[];
  childHeadCount: number;
  childWages: number;
  childAverageSalary: number | null;
} {
  const transactionId = generateTransactionId();
  
  // 3.1 Distribution Processing
  log('INFO', transactionId, 'Step 3.1: Starting distribution aggregation');
  
  const result = {
    tenureDistribution: [] as RawDistributionItem[],
    salaryDistribution: [] as RawDistributionItem[],
    ageDistribution: [] as RawDistributionItem[],
    childHeadCount: 0,
    childWages: 0,
    childAverageSalary: null as number | null
  };

  // Helper to aggregate a single distribution type
  const aggregateDistribution = (distributions: RawDistributionItem[][], type: 'tenure' | 'salary' | 'age'): RawDistributionItem[] => {
    log('DEBUG', transactionId, 'Step 3.1: Processing department', { 
      distributionCount: distributions.length,
      fiscalYear: selectedFiscalYear
    });

    const rangeMap = new Map<string, number>();

    distributions.forEach((dist, index) => {
      if (!dist || !Array.isArray(dist)) {
        log('WARN', transactionId, `Step 3.1: Missing ${type} distribution data`, { 
          department: 'unknown',
          index,
          fiscalYear: selectedFiscalYear
        });
        return;
      }
      dist.forEach(item => {
        if (!item || !Array.isArray(item.range)) {
          log('WARN', transactionId, `Step 3.1: Invalid ${type} distribution item`, { 
            item,
            index,
            fiscalYear: selectedFiscalYear
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
      totalCount: result.reduce((sum, item) => sum + item.count, 0),
      fiscalYear: selectedFiscalYear
    });
    return result;
  };

  // 3.2 Yearly Data Aggregation
  log('INFO', transactionId, 'Step 3.2: Aggregating yearly data', { fiscalYear: selectedFiscalYear });
  
  // Get all distributions from departments and their subdepartments recursively
  const getAllDistributions = (depts: DepartmentHierarchy[]): {
    tenure: RawDistributionItem[][];
    salary: RawDistributionItem[][];
    age: RawDistributionItem[][];
    headCount: number;
    wages: number;
  } => {
    log('DEBUG', transactionId, 'Step 3.2: Processing departments', { 
      departmentCount: depts.length,
      fiscalYear: selectedFiscalYear
    });

    const distributions = {
      tenure: [] as RawDistributionItem[][],
      salary: [] as RawDistributionItem[][],
      age: [] as RawDistributionItem[][],
      headCount: 0,
      wages: 0
    };

    depts.forEach(dept => {
      // Always include the current department's distributions if they exist
      if (dept.tenureDistribution?.yearly?.[selectedFiscalYear]) {
        log('DEBUG', transactionId, 'Step 3.2: Found tenure distribution', {
          department: dept.name,
          distributionCount: dept.tenureDistribution.yearly[selectedFiscalYear].length,
          fiscalYear: selectedFiscalYear
        });
        distributions.tenure.push(dept.tenureDistribution.yearly[selectedFiscalYear]);
      }
      if (dept.salaryDistribution?.yearly?.[selectedFiscalYear]) {
        log('DEBUG', transactionId, 'Step 3.2: Found salary distribution', {
          department: dept.name,
          distributionCount: dept.salaryDistribution.yearly[selectedFiscalYear].length,
          fiscalYear: selectedFiscalYear
        });
        distributions.salary.push(dept.salaryDistribution.yearly[selectedFiscalYear]);
      }
      if (dept.ageDistribution?.yearly?.[selectedFiscalYear]) {
        log('DEBUG', transactionId, 'Step 3.2: Found age distribution', {
          department: dept.name,
          distributionCount: dept.ageDistribution.yearly[selectedFiscalYear].length,
          fiscalYear: selectedFiscalYear
        });
        distributions.age.push(dept.ageDistribution.yearly[selectedFiscalYear]);
      }

      // Get department's own headcount and wages
      if (typeof dept.headCount?.yearly?.[selectedFiscalYear] === 'number') {
        distributions.headCount += dept.headCount.yearly[selectedFiscalYear] as number;
      }
      
      if (typeof dept.wages?.yearly?.[selectedFiscalYear] === 'number') {
        distributions.wages += dept.wages.yearly[selectedFiscalYear] as number;
      }

      // Process subdepartments if they exist - RECURSIVELY
      if (dept.subDepartments?.length) {
        log('DEBUG', transactionId, 'Step 3.2: Processing subdepartments recursively', {
          department: dept.name,
          subDepartmentCount: dept.subDepartments.length,
          fiscalYear: selectedFiscalYear
        });
        
        const subDistributions = getAllDistributions(dept.subDepartments);
        
        // Add subdepartment distributions
        distributions.tenure.push(...subDistributions.tenure);
        distributions.salary.push(...subDistributions.salary);
        distributions.age.push(...subDistributions.age);
        distributions.headCount += subDistributions.headCount;
        distributions.wages += subDistributions.wages;
      }
    });

    return distributions;
  };

  const allDistributions = getAllDistributions(departments);
  
  // 3.3 Final Aggregation
  log('INFO', transactionId, 'Step 3.3: Computing final aggregated distributions', { fiscalYear: selectedFiscalYear });
  
  result.tenureDistribution = aggregateDistribution(allDistributions.tenure, 'tenure');
  result.salaryDistribution = aggregateDistribution(allDistributions.salary, 'salary');
  result.ageDistribution = aggregateDistribution(allDistributions.age, 'age');
  result.childHeadCount = allDistributions.headCount;
  result.childWages = allDistributions.wages;
  
  // Calculate average salary from aggregated data
  if (result.childHeadCount > 0) {
    result.childAverageSalary = (result.childWages / result.childHeadCount) as number;
  }

  log('DEBUG', transactionId, 'Step 3.3: Distribution counts and aggregated data', {
    tenure: result.tenureDistribution.length,
    salary: result.salaryDistribution.length,
    age: result.ageDistribution.length,
    headCount: result.childHeadCount,
    wages: result.childWages,
    averageSalary: result.childAverageSalary,
    fiscalYear: selectedFiscalYear
  });
  
  log('INFO', transactionId, 'Step 3.3: Aggregation complete', { 
    totalProcessed: departments.length,
    fiscalYear: selectedFiscalYear
  });

  return result;
}

function buildHierarchy(departments: DepartmentData[], selectedFiscalYear: AnnualYear): DepartmentHierarchy {
  const transactionId = generateTransactionId();
  
  // 2.1 Root Department Setup
  log('INFO', transactionId, 'Step 2.1: Initializing root department');
  log('DEBUG', transactionId, 'Step 2.1: Root department data', { 
    name: 'California State Government',
    level: 0,
    parent: null,
    fiscalYear: selectedFiscalYear
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
      _slug: ('california_state_government' as any),
      canonicalName: 'California State Government',
      aliases: [],
      orgLevel: (0 as NonNegativeInteger),
      budget_status: 'active' as BudgetStatus,
      keyFunctions: 'State Government',
      abbreviation: 'CA',
      parent_agency: '',
      headCount: { yearly: emptyYearlyRecord },
      wages: { yearly: emptyYearlyRecord },
      _averageTenureYears: null,
      _averageSalary: null,
      _averageAge: null,
      tenureDistribution: { yearly: emptyTenureRecord },
      salaryDistribution: { yearly: emptySalaryRecord },
      ageDistribution: { yearly: emptyAgeRecord },
      entityCode: null
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
  // Ensure root.subDepartments is always initialized
  if (!root.subDepartments) root.subDepartments = [];

  // 2.3 Parent-Child Relationships
  log('INFO', transactionId, 'Step 2.3: Establishing parent-child relationships');

  // Helper function to normalize department names (lowercase, remove punctuation, trim spaces)
  const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  // Helper function to find best parent match
  const findParent = (parentName: string, childLevel: number): DepartmentHierarchy | undefined => {
    const normalizedParent = normalizeName(parentName);
    // Try direct match in deptMap
    for (const [deptName, dept] of Array.from(deptMap.entries())) {
      if (normalizeName(deptName) === normalizedParent) return dept;
    }
    // Try alias match
    for (const [alias, dept] of Array.from(aliasMap.entries())) {
      if (normalizeName(alias) === normalizedParent) return dept;
    }
    // Try substring match in potential parents at previous level
    const potentialParents = levelMap.get(childLevel - 1) || [];
    return potentialParents.find(p => {
      const normalizedName = normalizeName(p.name);
      if (normalizedName === normalizedParent) return true;
      if (normalizedName.includes(normalizedParent) || normalizedParent.includes(normalizedName)) return true;
      return (p.aliases || []).some(alias => {
        const normAlias = normalizeName(alias);
        return normAlias === normalizedParent || normAlias.includes(normalizedParent) || normalizedParent.includes(normAlias);
      });
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

  // PATCH: Attach any remaining unattached departments directly to root
  if (unattachedDepts.size > 0) {
    log('WARN', transactionId, 'Attaching unattached departments directly to root', {
      unattached: Array.from(unattachedDepts)
    });
    unattachedDepts.forEach(deptName => {
      if (deptName !== root.name) {
        const dept = deptMap.get(deptName);
        if (dept && (!root.subDepartments || !root.subDepartments.some(d => d.name === dept.name))) {
          if (!root.subDepartments) root.subDepartments = [];
          root.subDepartments.push(dept);
        }
      }
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
    
    // Store original data before aggregation - this is the parent's own data
    dept.originalData = {
      headCount: { yearly: { ...dept.headCount?.yearly } },
      wages: { yearly: { ...dept.wages?.yearly } },
      _averageSalary: dept._averageSalary,
      tenureDistribution: dept.tenureDistribution,
      salaryDistribution: dept.salaryDistribution,
      ageDistribution: dept.ageDistribution
    };
    
    // Get the parent department's own data
    const parentHeadCount = typeof dept.headCount?.yearly?.[selectedFiscalYear] === 'number' ? 
      dept.headCount.yearly[selectedFiscalYear] as number : 0;
    const parentWages = typeof dept.wages?.yearly?.[selectedFiscalYear] === 'number' ? 
      dept.wages.yearly[selectedFiscalYear] as number : 0;
    const parentAverageSalary = parentHeadCount > 0 ? 
      (parentWages / parentHeadCount) as NonNegativeNumber : null;
    
    // Process subdepartments first - RECURSIVELY
    if (dept.subDepartments && dept.subDepartments.length > 0) {
      // Process all subdepartments recursively to get subordinate counts
      dept.subDepartments.forEach(child => {
        dept.subordinateOffices += calculateSubordinatesAndAggregateData(child) + 1;
      });

      // Calculate aggregated distributions, headcount, wages and average salary
      // This will now include ALL levels recursively
      const aggregated = aggregateDistributions(dept.subDepartments, selectedFiscalYear);
      
      // Store child-only aggregated data (includes all subdepartments at all levels)
      const childHeadCount = aggregated.childHeadCount;
      const childWages = aggregated.childWages;
      const childAverageSalary = aggregated.childAverageSalary;
      
      // Calculate combined (parent + children) totals
      const combinedHeadCount = parentHeadCount + childHeadCount;
      const combinedWages = parentWages + childWages;
      const combinedAverageSalary = combinedHeadCount > 0 ? 
        (combinedWages / combinedHeadCount) as NonNegativeNumber : null;
      
      // Store all aggregated information
      dept.aggregatedDistributions = {
        // Distribution arrays (includes all levels)
        tenureDistribution: aggregated.tenureDistribution,
        salaryDistribution: aggregated.salaryDistribution,
        ageDistribution: aggregated.ageDistribution,
        
        // Parent data (department's own data)
        parentHeadCount,
        parentWages,
        parentAverageSalary,
        
        // Child data (sum of all subdepartments at all levels)
        childHeadCount,
        childWages,
        childAverageSalary,
        
        // Combined data (parent + children)
        combinedHeadCount,
        combinedWages,
        combinedAverageSalary
      };
      
      log('INFO', generateTransactionId(), 'Aggregated data calculated', {
        department: dept.name,
        fiscalYear: selectedFiscalYear,
        subordinateOffices: dept.subordinateOffices,
        parent: {
          headCount: parentHeadCount,
          wages: parentWages,
          averageSalary: parentAverageSalary
        },
        children: {
          headCount: childHeadCount,
          wages: childWages,
          averageSalary: childAverageSalary
        },
        combined: {
          headCount: combinedHeadCount,
          wages: combinedWages,
          averageSalary: combinedAverageSalary
        }
      });
    }
    else {
      // For departments without subdepartments, ensure headCount and wages objects exist
      dept.headCount = dept.headCount || { yearly: {} };
      dept.wages = dept.wages || { yearly: {} };
      
      log('INFO', generateTransactionId(), 'No subdepartments for', {
        department: dept.name,
        fiscalYear: selectedFiscalYear,
        headCount: parentHeadCount,
        wages: parentWages,
        averageSalary: parentAverageSalary
      });
    }
    
    return dept.subordinateOffices;
  };
  calculateSubordinatesAndAggregateData(root);

  const totalDepartments = countDepartments(root);
  log('INFO', transactionId, 'Step 2.4: Hierarchy construction complete', {
    totalDepartments,
    levels: levelMap.size,
    fiscalYear: selectedFiscalYear
  });

  return root;
}

interface DepartmentCardProps {
  department: DepartmentHierarchy;
  isActive: boolean;
  onClick: () => void;
  showChart: boolean;
  viewMode: 'aggregated' | 'parent-only';
  fiscalYear: AnnualYear;
}

function DepartmentCard({ department, isActive, onClick, showChart, viewMode, fiscalYear }: DepartmentCardProps) {
  // Get FY2023 specific data with proper type checking
  const _workforceData = typeof department.headCount?.yearly?.[fiscalYear] === 'number' ? department.headCount.yearly[fiscalYear] : undefined;
  const _wagesData = typeof department.wages?.yearly?.[fiscalYear] === 'number' ? department.wages.yearly[fiscalYear] : undefined;
  const _averageSalary = typeof department._averageSalary === 'number' ? department._averageSalary : undefined;
  
  // State for checking if department has a markdown page
  const [hasPage, setHasPage] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  // Check if department has a markdown page
  useEffect(() => {
    const checkForPage = async () => {
      try {
        const response = await fetch('/api/departments/available');
        const data = await response.json();
        
        // Construct the potential slug from organizational code and name
        if (department.organizationalCode && department.name) {
          const potentialSlug = `${department.organizationalCode}_${department.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '_')}`;
          setHasPage(data.slugs.includes(potentialSlug));
        } else {
          setHasPage(false);
        }
      } catch (error) {
        console.error('Error checking for department page:', error);
        setHasPage(false);
      } finally {
        setIsLoadingPage(false);
      }
    };

    checkForPage();
  }, [department.organizationalCode, department.name]);
  
  const handleCardClick = () => {
    // Track workforce card click - only pass number values
    const employeeCount = typeof _workforceData === 'number' ? _workforceData : undefined;
    analytics.workforceCardClick(department.name, employeeCount);
    onClick();
  };
  
  return (
    <div className={`space-y-4 ${isActive ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}>
      <div 
        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer relative"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {!isLoadingPage && hasPage ? (
                <Link 
                  href={`/departments/${department.organizationalCode}_${department.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '_')}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {department.name}
                </Link>
              ) : (
                department.name
              )}
              {department.abbreviation && <span className="ml-2 text-sm text-gray-500">({department.abbreviation})</span>}
              {department.organizationalCode && (
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {department.organizationalCode}
                </span>
              )}
              <span className="ml-2 text-xs text-gray-500">(FY{fiscalYear})</span>
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
            fiscalYear={fiscalYear}
          />
        </div>
      )}
    </div>
  );
}

// Client component that uses useSearchParams
function WorkforcePageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for filters and sorting
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | null>(null);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<AnnualYear>("2023");
  const [activePath, setActivePath] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'aggregated' | 'parent-only'>('aggregated');
  
  // Generate a single transaction ID for the component lifecycle
  const transactionId = useMemo(() => generateTransactionId(), []);
  
  // Refs for tracking state changes
  const prevState = useRef<{
    hasHierarchy: boolean;
    selectedDepartment: string | null;
    activePath: string[];
  }>({
    hasHierarchy: false,
    selectedDepartment: null,
    activePath: [],
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

  // Build API URL
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.set('format', 'departments');
    return `/api/departments?${params.toString()}`;
  };

  // Fetch departments data using SWR
  const { data: workforceData, error, isLoading } = useSWR<WorkforceResponse>(
    buildApiUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000
    }
  );

  // Component initialization logging - only once
  useEffect(() => {
    log('INFO', transactionId, 'Component initialized', {
      searchParams: Object.fromEntries(searchParams.entries())
    });
    
    // Track page view
    analytics.pageView('/workforce', 'California State Government Workforce');
  }, [transactionId, searchParams]);

  const departments = useMemo(() => {
    return workforceData?.departments || [];
  }, [workforceData?.departments]);

  const hierarchyData = useMemo(() => {
    if (!departments.length) {
      return null;
    }
    
    const hierarchy = buildHierarchy(departments, selectedFiscalYear);
    log('INFO', transactionId, 'Hierarchy built successfully', {
      rootDepartment: hierarchy.name,
      totalDepartments: countDepartments(hierarchy),
      fiscalYear: selectedFiscalYear
    });
    
    return hierarchy;
  }, [departments, selectedFiscalYear, transactionId]);

  // URL parameter effect
  useEffect(() => {
    const agencyParam = searchParams.get('agency');
    const departmentParam = searchParams.get('department');
    
    if (departmentParam) {
      // Find department directly in the hierarchy
      const findDepartmentInHierarchy = (depts: DepartmentHierarchy[], targetName: string): DepartmentHierarchy | null => {
        for (const dept of depts) {
          if (dept.name === targetName || dept._slug === targetName) {
            return dept;
          }
          if (dept.subDepartments) {
            const found = findDepartmentInHierarchy(dept.subDepartments, targetName);
            if (found) return found;
          }
        }
        return null;
      };

      if (hierarchyData) {
        const foundDept = findDepartmentInHierarchy([hierarchyData], departmentParam);
        if (foundDept) {
          log('INFO', transactionId, 'Department found in hierarchy', {
            department: foundDept.name
          });
          setSelectedDepartmentName(foundDept.name);
        } else {
          log('WARN', transactionId, 'Department not found in hierarchy', {
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
  }, [searchParams, hierarchyData, transactionId]);
  
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
    };

    // Only log if state has changed
    if (JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
      log('INFO', transactionId, 'Component state changed', currentState);
      prevState.current = currentState;
    }
  }, [hierarchyData, selectedDepartmentName, activePath, transactionId]);

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
    
    // Track department view
    analytics.departmentView(department.name, department._slug);
    
    setSelectedDepartmentName(department.name);
  };

  // Update URL when filters change
  const updateUrl = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/workforce?${params.toString()}`);
  };

  // Handle view mode change
  const handleViewModeChange = (newViewMode: 'aggregated' | 'parent-only') => {
    setViewMode(newViewMode);
    analytics.filterApplied('view_mode', newViewMode, 'workforce_page');
    updateUrl({ viewMode: newViewMode });
  };

  // Handle fiscal year change
  const handleFiscalYearChange = (year: string) => {
    if (year.match(/^\d{4}$/)) {
      analytics.filterApplied('fiscal_year', year, 'workforce_page');
      setSelectedFiscalYear(year as AnnualYear);
      updateUrl({ fiscalYear: year });
    }
  };

  if (error) {
    log('ERROR', transactionId, 'Displaying error state', { error });
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>Failed to load workforce data</p>
      </div>
    );
  }
  
  if (isLoading || !hierarchyData) {
    log('INFO', transactionId, 'Displaying loading state');
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600">Loading department hierarchy...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">California State Government Workforce</h1>
          <p className="text-sm text-gray-600 mt-1">
            Salary, Headcount and Wages numbers are from department salaries found at <a href="https://publicpay.ca.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">publicpay.ca.gov</a>. 
            <a href="https://transparentcalifornia.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> Transparent California</a> provides additional salary and headcount details due to their many years of submitting FOIA requests.
            <a href="https://openthebooks.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"> Open The Books</a> also offers valuable salary and spending information.
            Wages are calculated as regular wages plus any benefits.
          </p>
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
              <Button
                variant={viewMode === 'parent-only' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${viewMode === 'parent-only' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => handleViewModeChange('parent-only')}
              >
                Parent Only
              </Button>
              <Button
                variant={viewMode === 'aggregated' ? "secondary" : "ghost"}
                size="sm"
                className={`rounded-full text-xs ${viewMode === 'aggregated' ? 'bg-white shadow-sm' : ''}`}
                onClick={() => handleViewModeChange('aggregated')}
              >
                Include Children
              </Button>
            </div>
            <div className="flex items-center space-x-2 border rounded-full p-1 bg-gray-100">
              <label htmlFor="fiscalYear" className="text-xs text-gray-600 px-2">Annual Year:</label>
              <Select value={selectedFiscalYear} onValueChange={handleFiscalYearChange}>
                <SelectTrigger className="text-xs font-medium rounded-full bg-white shadow-sm border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none px-3 py-1 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg">
                  {Array.from({ length: 16 }, (_, i) => {
                    const year = (2010 + i).toString() as AnnualYear;
                    return (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
              fiscalYear={selectedFiscalYear}
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
                  fiscalYear={selectedFiscalYear}
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
              onClick={() => analytics.externalLinkClick('https://publicpay.ca.gov/Reports/State/State.aspx', 'workforce_sources')}
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
              onClick={() => analytics.externalLinkClick('https://www.calhr.ca.gov/pages/workforce-planning-statistics.aspx', 'workforce_sources')}
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
              onClick={() => analytics.externalLinkClick('https://lao.ca.gov/StateWorkforce', 'workforce_sources')}
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
              onClick={() => analytics.externalLinkClick('https://dof.ca.gov/forecasting/demographics/state-and-county-population-projections/', 'workforce_sources')}
            >
              California Department of Finance - Employment Data
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function WorkforcePage() {
  return (
    <Suspense fallback={
      <div className="p-4 flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600">Loading workforce data...</p>
      </div>
    }>
      <WorkforcePageClient />
    </Suspense>
  );
} 