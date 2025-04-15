import type { RequiredDepartmentJSONFields } from '@/types/department';

/**
 * Normalize a string for matching by removing common prefixes, suffixes, and special characters
 */
export function normalizeForMatching(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .replace(/[,()]/g, '') // Remove parentheses and commas
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(of|the|and|or|in|for|to|at|on|by|county|state|california)\b/g, '') // Remove common words
    .replace(/\b(superior|municipal|justice|appellate)\s+court\b/g, 'court') // Normalize court types
    .replace(/\b(workers|worker's)\s+compensation\b/g, 'workers compensation') // Normalize workers compensation
    .replace(/\b(department|office|board|commission|authority|agency|council|panel)\b/g, '') // Remove common entity types
    .replace(/\b(california|state)\b/g, '') // Remove state references
    .trim();
}

/**
 * Get all possible name variations for a department name
 */
export function getNameVariations(name: string): string[] {
  const normalized = normalizeForMatching(name);
  const variations = new Set([normalized]);
  
  // Add variations without common prefixes
  ['department of', 'state', 'california', 'office of', 'board of', 'commission on', 'county of'].forEach(prefix => {
    if (normalized.startsWith(prefix)) {
      variations.add(normalized.slice(prefix.length).trim());
    }
  });
  
  // Add variations without common suffixes
  ['commission', 'board', 'authority', 'agency', 'office', 'department', 'council', 'panel', 'court'].forEach(suffix => {
    if (normalized.endsWith(suffix)) {
      variations.add(normalized.slice(0, -suffix.length).trim());
    }
  });
  
  // Add variations with common abbreviations
  if (normalized.includes('and')) {
    variations.add(normalized.replace(/\s+and\s+/, ' & '));
  }
  if (normalized.includes('&')) {
    variations.add(normalized.replace(/\s*&\s*/, ' and '));
  }
  
  // Add variations without articles
  variations.add(normalized.replace(/\b(a|an|the)\b/g, ''));
  
  // Add variations with common word order changes
  const words = normalized.split(' ');
  if (words.length > 2) {
    variations.add(words.slice(1).join(' ') + ' ' + words[0]);
  }
  
  return Array.from(variations);
}

/**
 * Calculate a match score between two strings
 * Returns a score between 0 and 1
 */
export function calculateMatchScore(str1: string, str2: string): number {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  // Count matching words with position weighting
  let matches = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < words1.length; i++) {
    const word1 = words1[i];
    const weight = 1 + (0.5 * (words1.length - i - 1) / words1.length); // Higher weight for earlier words
    
    for (let j = 0; j < words2.length; j++) {
      const word2 = words2[j];
      
      // Exact match
      if (word1 === word2) {
        matches += weight;
        totalWeight += weight;
        break;
      }
      
      // Partial word match (e.g., "Admin" matching "Administration")
      if (word1.length > 3 && word2.length > 3) {
        if (word1.startsWith(word2) || word2.startsWith(word1)) {
          matches += weight * 0.8;
          totalWeight += weight;
          break;
        }
      }
    }
  }
  
  // Calculate base score
  const score = totalWeight > 0 ? matches / totalWeight : 0;
  
  // Boost score for exact matches
  if (str1 === str2) return 1.0;
  
  // Boost score for significant substring matches
  const minWords = Math.min(words1.length, words2.length);
  if (matches >= Math.max(3, minWords * 0.5)) {
    return Math.max(score + 0.2, 0.8);
  }
  
  return score;
}

/**
 * Calculate a match score between a CSV name and a department
 * Returns an object with total score and detailed scoring breakdown
 */
export function calculateDepartmentMatchScore(
  csvName: string,
  department: RequiredDepartmentJSONFields,
  entityCode?: string
): { totalScore: number; details: Record<string, number> } {
  const cleanCsvName = csvName.trim().toLowerCase();
  const nameVariations = getNameVariations(cleanCsvName);
  const deptVariations = getNameVariations(department.name.toLowerCase());
  const canonicalVariations = getNameVariations(department.canonicalName.toLowerCase());
  
  // Check exact matches (case insensitive)
  if (department.name.toLowerCase() === cleanCsvName) {
    return { totalScore: 100, details: { exactNameMatch: 100, canonicalNameMatch: 0, aliasMatch: 0, partialNameMatch: 0 } };
  }
  
  // Check canonical name (case insensitive)
  if (department.canonicalName.toLowerCase() === cleanCsvName) {
    return { totalScore: 90, details: { exactNameMatch: 0, canonicalNameMatch: 90, aliasMatch: 0, partialNameMatch: 0 } };
  }
  
  // Check aliases (case insensitive)
  if (department.aliases?.some(alias => alias.toLowerCase() === cleanCsvName)) {
    return { totalScore: 80, details: { exactNameMatch: 0, canonicalNameMatch: 0, aliasMatch: 80, partialNameMatch: 0 } };
  }
  
  // Calculate best partial match score
  let bestScore = 0;
  
  // Try matching against all variations (name, canonical, aliases)
  const allDeptVariations = [...deptVariations, ...canonicalVariations];
  
  for (const nameVar of nameVariations) {
    for (const deptVar of allDeptVariations) {
      const score = calculateMatchScore(nameVar, deptVar);
      if (score > bestScore) {
        bestScore = score;
      }
    }
  }
  
  return {
    totalScore: Math.round(bestScore * 100),
    details: {
      exactNameMatch: 0,
      canonicalNameMatch: 0,
      aliasMatch: 0,
      partialNameMatch: bestScore * 100
    }
  };
}

/**
 * Enhanced department matching that finds all potential matches and allows user selection
 * Returns an object with the best match and all potential matches
 */
export function findDepartmentMatches(
  name: string,
  departments: RequiredDepartmentJSONFields[],
  entityCode?: string
): { 
  bestMatch: { department: RequiredDepartmentJSONFields | null; isPartialMatch: boolean; score: number } | null;
  potentialMatches: Array<{ department: RequiredDepartmentJSONFields; score: number; matchType: string }>;
} {
  const potentialMatches: Array<{ department: RequiredDepartmentJSONFields; score: number; matchType: string }> = [];
  
  // First try exact match with entity code
  if (entityCode) {
    const exactMatch = departments.find(d => 
      d.entityCode !== null && d.entityCode.toString() === entityCode
    );
    if (exactMatch) {
      return {
        bestMatch: { department: exactMatch, isPartialMatch: false, score: 100 },
        potentialMatches: [{ department: exactMatch, score: 100, matchType: 'exact_entity_code' }]
      };
    }
  }
  
  // Then try exact name match (case insensitive)
  const exactNameMatch = departments.find(d => 
    d.name.toLowerCase() === name.toLowerCase() ||
    d.canonicalName.toLowerCase() === name.toLowerCase() ||
    d.aliases?.some(a => a.toLowerCase() === name.toLowerCase())
  );
  
  if (exactNameMatch) {
    return {
      bestMatch: { department: exactNameMatch, isPartialMatch: false, score: 100 },
      potentialMatches: [{ department: exactNameMatch, score: 100, matchType: 'exact_name' }]
    };
  }
  
  // Find all potential matches with scores
  for (const dept of departments) {
    const score = calculateDepartmentMatchScore(name, dept, entityCode);
    
    // If entity codes don't match, significantly reduce the score
    if (entityCode && dept.entityCode !== null && dept.entityCode.toString() !== entityCode) {
      score.totalScore = Math.max(0, score.totalScore - 50);
    }
    
    if (score.totalScore > 0) {
      potentialMatches.push({
        department: dept,
        score: score.totalScore,
        matchType: score.details.exactNameMatch > 0 ? 'exact_name' :
                  score.details.canonicalNameMatch > 0 ? 'canonical_name' :
                  score.details.aliasMatch > 0 ? 'alias' : 'partial_match'
      });
    }
  }
  
  // Sort matches by score
  potentialMatches.sort((a, b) => b.score - a.score);
  
  // If we have a high confidence match (score > 80), return it as best match
  const highConfidenceMatch = potentialMatches.find(m => m.score > 80);
  if (highConfidenceMatch) {
    return {
      bestMatch: { 
        department: highConfidenceMatch.department, 
        isPartialMatch: highConfidenceMatch.matchType === 'partial_match',
        score: highConfidenceMatch.score
      },
      potentialMatches
    };
  }
  
  // Otherwise return null for best match but keep all potential matches
  return {
    bestMatch: null,
    potentialMatches
  };
} 