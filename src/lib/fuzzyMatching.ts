/**
 * Fuzzy Matching Utilities
 * 
 * This module provides various fuzzy matching algorithms for string comparison
 * including Levenshtein distance, Jaro-Winkler similarity, and Soundex phonetic matching.
 * 
 * Based on research from:
 * - https://www.thedataschool.co.uk/frederik-egervari/understanding-fuzzy-logic/
 * - https://redis.io/blog/what-is-fuzzy-matching/
 */

export interface FuzzyMatchResult {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  algorithm: string;
  matchType: 'exact' | 'fuzzy' | 'phonetic';
  distance?: number;
}

/**
 * Calculate Levenshtein distance between two strings
 * The minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Calculate Jaro similarity between two strings
 * Accounts for character positions and transpositions
 */
export function jaroSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  if (matchWindow < 0) return 0.0;

  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3.0;
}

/**
 * Calculate Jaro-Winkler similarity (enhanced Jaro with prefix bonus)
 * Gives higher similarity scores for strings that match from the beginning
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  const jaroScore = jaroSimilarity(str1, str2);
  
  if (jaroScore < 0.7) return jaroScore;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Calculate common prefix length (up to 4 characters)
  let prefixLength = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaroScore + (0.1 * prefixLength * (1 - jaroScore));
}

/**
 * Generate Soundex code for phonetic matching
 * Converts a string to a 4-character code based on how it sounds
 */
export function soundex(str: string): string {
  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '0000';

  const firstLetter = s[0];
  const soundexMap: { [key: string]: string } = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };

  let soundexCode = firstLetter;
  let prevCode = soundexMap[firstLetter] || '';

  for (let i = 1; i < s.length && soundexCode.length < 4; i++) {
    const currentCode = soundexMap[s[i]] || '';
    if (currentCode && currentCode !== prevCode) {
      soundexCode += currentCode;
      prevCode = currentCode;
    } else if (!currentCode) {
      prevCode = '';
    }
  }

  return soundexCode.padEnd(4, '0');
}

/**
 * Comprehensive fuzzy matching function that combines multiple algorithms
 */
export function fuzzyMatch(str1: string, str2: string, options: {
  threshold?: number;
  usePhonetic?: boolean;
  preferExact?: boolean;
} = {}): FuzzyMatchResult {
  const { threshold = 0.6, usePhonetic = true, preferExact = true } = options;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) {
    return {
      score: 1.0,
      confidence: 'high',
      algorithm: 'exact',
      matchType: 'exact',
      distance: 0
    };
  }

  // Check for substring matches first if preferExact is true
  if (preferExact) {
    if (s1.includes(s2) || s2.includes(s1)) {
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      const score = shorter.length / longer.length;
      
      if (score >= threshold) {
        return {
          score,
          confidence: score > 0.8 ? 'high' : 'medium',
          algorithm: 'substring',
          matchType: 'fuzzy'
        };
      }
    }
  }

  // Jaro-Winkler similarity (best for names and similar strings)
  const jaroWinklerScore = jaroWinklerSimilarity(s1, s2);
  
  // Levenshtein distance (normalized)
  const levDistance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levScore = maxLength > 0 ? 1 - (levDistance / maxLength) : 0;

  // Choose the best score
  let bestScore = Math.max(jaroWinklerScore, levScore);
  let bestAlgorithm = jaroWinklerScore > levScore ? 'jaro-winkler' : 'levenshtein';

  // Phonetic matching if enabled
  if (usePhonetic) {
    const soundex1 = soundex(s1);
    const soundex2 = soundex(s2);
    if (soundex1 === soundex2) {
      // Soundex match gives a bonus but doesn't override other scores
      bestScore = Math.max(bestScore, 0.7);
      if (bestScore === 0.7) {
        bestAlgorithm = 'soundex';
      }
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (bestScore >= 0.9) {
    confidence = 'high';
  } else if (bestScore >= 0.7) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    score: bestScore,
    confidence,
    algorithm: bestAlgorithm,
    matchType: bestScore >= threshold ? 'fuzzy' : 'phonetic',
    distance: levDistance
  };
}

/**
 * Find the best fuzzy match from a list of candidates
 */
export function findBestMatch(
  target: string, 
  candidates: string[], 
  options: {
    threshold?: number;
    usePhonetic?: boolean;
    preferExact?: boolean;
    limit?: number;
  } = {}
): Array<{ candidate: string; result: FuzzyMatchResult; index: number }> {
  const { threshold = 0.6, limit = 10 } = options;
  
  const matches = candidates
    .map((candidate, index) => ({
      candidate,
      result: fuzzyMatch(target, candidate, options),
      index
    }))
    .filter(match => match.result.score >= threshold)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limit);

  return matches;
}

/**
 * Utility function to format match result for display
 */
export function formatMatchResult(result: FuzzyMatchResult): string {
  const percentage = Math.round(result.score * 100);
  const confidenceIcon = result.confidence === 'high' ? '🟢' : 
                         result.confidence === 'medium' ? '🟡' : '🔴';
  
  return `${confidenceIcon} ${percentage}% (${result.algorithm})`;
} 