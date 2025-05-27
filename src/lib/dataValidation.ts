/**
 * Data Validation Utilities
 * 
 * This module provides functions for validating data against schemas and ensuring
 * data consistency across different data files.
 */

import { z } from 'zod';
import fs from 'fs';

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    path: string;
    message: string;
    value: any;
  }>;
}

/**
 * Generic data validator using Zod
 * 
 * @param data Data to validate
 * @param schema Zod schema to validate against
 * @returns Validation result
 */
function validateData(data: unknown, schema: z.ZodType): ValidationResult {
  try {
    schema.parse(data);
    return { isValid: true, errors: [] };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return {
        isValid: false,
        errors: zodError.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          value: err.path.reduce((obj, key) => obj && obj[key], data)
        }))
      };
    }
    // Handle non-ZodError errors
    return {
      isValid: false,
      errors: [{ 
        path: 'unknown', 
        message: error instanceof Error ? error.message : String(error),
        value: null
      }]
    };
  }
}

/**
 * Validate consistency between data files
 * 
 * @param validations Array of validation functions to run
 * @returns Validation result
 */
async function validateConsistency(
  validations: Array<() => Promise<ValidationResult>>
): Promise<ValidationResult> {
  const results: ValidationResult[] = [];
  
  for (const validation of validations) {
    results.push(await validation());
  }
  
  const isValid = results.every(r => r.isValid);
  const errors = results.flatMap(r => r.errors);
  
  return { isValid, errors };
}

/**
 * Check if departments in vendors exist in departments.json
 * 
 * @param vendorsPath Path to vendors.json
 * @param departmentsPath Path to departments.json
 * @returns Validation result
 */
async function validateVendorsDepartments(
  vendorsPath,
  departmentsPath
): Promise<ValidationResult> {
  try {
    // Read JSON files
    const vendorsData = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
    const departmentsData = JSON.parse(fs.readFileSync(departmentsPath, 'utf8'));
    
    const errors: Array<{path: string; message: string; value: any}> = [];
    
    // Check each vendor
    for (const vendor of vendorsData.vendors) {
      for (const nameData of vendor.vendorName) {
        for (const yearData of nameData.fiscalYear) {
          for (const projectData of yearData.projectCode) {
            for (const orgData of projectData.organizationCode) {
              // For each organizational code, ensure it exists in departments
              const orgCode = orgData.code;
              const matchingDept = departmentsData.departments.find(
                (d) => d.organizationalCode === orgCode
              );
              
              if (!matchingDept) {
                errors.push({
                  path: `${vendor.ein || 'unknown'}.vendorName[].fiscalYear[].projectCode[].organizationCode[]`,
                  message: `Organization code ${orgCode} does not match any department`,
                  value: orgCode
                });
              }
            }
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{ 
        path: 'file_read', 
        message: error instanceof Error ? error.message : String(error),
        value: null
      }]
    };
  }
}

/**
 * Validate program codes in vendors against programs.json
 * 
 * @param vendorsPath Path to vendors.json
 * @param programsPath Path to programs.json
 * @returns Validation result
 */
async function validateVendorsPrograms(
  vendorsPath,
  programsPath
): Promise<ValidationResult> {
  try {
    // Read JSON files
    const vendorsData = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
    const programsData = JSON.parse(fs.readFileSync(programsPath, 'utf8'));
    
    const errors: Array<{path: string; message: string; value: any}> = [];
    const programCodes = new Set(programsData.programs.map((p) => p.projectCode));
    
    // Check each vendor
    for (const vendor of vendorsData.vendors) {
      for (const nameData of vendor.vendorName) {
        for (const yearData of nameData.fiscalYear) {
          for (const projectData of yearData.projectCode) {
            const projectCode = projectData.code;
            
            if (!programCodes.has(projectCode)) {
              errors.push({
                path: `${vendor.ein || 'unknown'}.vendorName[].fiscalYear[].projectCode[]`,
                message: `Project code ${projectCode} does not match any program`,
                value: projectCode
              });
            }
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{ 
        path: 'file_read', 
        message: error instanceof Error ? error.message : String(error),
        value: null
      }]
    };
  }
}

module.exports = {
  validateData,
  validateConsistency,
  validateVendorsDepartments,
  validateVendorsPrograms
}; 