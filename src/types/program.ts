/**
 * Type definitions for program data
 */

/**
 * Represents a program description with source information
 */
export interface ProgramDescription {
  description: string;
  source: string;
}

/**
 * Represents a program with its code, name and descriptions
 */
export interface Program {
  id: string;
  project_code: string;
  name: string;
  description?: string | null;
  sources?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  
  // Legacy fields for backward compatibility
  projectCode?: string;
  programDescriptions?: ProgramDescription[];
}

/**
 * Represents the structure of programs.json
 */
export interface ProgramsJSON {
  programs: Program[];
  sources?: Array<{
    name: string;
    url: string;
  }>;
  lastUpdated?: string;
} 