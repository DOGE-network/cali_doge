import {
  levenshteinDistance,
  jaroSimilarity,
  jaroWinklerSimilarity,
  soundex,
  fuzzyMatch,
  findBestMatch,
  formatMatchResult
} from '@/lib/fuzzyMatching';

describe('Fuzzy Matching Utilities', () => {
  describe('levenshteinDistance', () => {
    test('should return 0 for identical strings', () => {
      expect(levenshteinDistance('california', 'california')).toBe(0);
    });

    test('should return correct distance for different strings', () => {
      expect(levenshteinDistance('california', 'californa')).toBe(1);
      expect(levenshteinDistance('department', 'departmnt')).toBe(1); // Missing 'e' is 1 edit
    });

    test('should handle case insensitive matching', () => {
      expect(levenshteinDistance('California', 'california')).toBe(0);
    });
  });

  describe('jaroSimilarity', () => {
    test('should return 1.0 for identical strings', () => {
      expect(jaroSimilarity('california', 'california')).toBe(1.0);
    });

    test('should return higher scores for similar strings', () => {
      const score = jaroSimilarity('california', 'californa');
      expect(score).toBeGreaterThan(0.8);
    });

    test('should return 0 for completely different strings', () => {
      const score = jaroSimilarity('abc', 'xyz');
      expect(score).toBe(0);
    });
  });

  describe('jaroWinklerSimilarity', () => {
    test('should give bonus for common prefix', () => {
      const jaroScore = jaroSimilarity('california department', 'california dept');
      const jaroWinklerScore = jaroWinklerSimilarity('california department', 'california dept');
      expect(jaroWinklerScore).toBeGreaterThan(jaroScore);
    });
  });

  describe('soundex', () => {
    test('should generate same code for similar sounding words', () => {
      expect(soundex('california')).toBe(soundex('californa'));
      expect(soundex('smith')).toBe(soundex('smyth'));
    });

    test('should handle empty strings', () => {
      expect(soundex('')).toBe('0000');
    });
  });

  describe('fuzzyMatch', () => {
    test('should return exact match for identical strings', () => {
      const result = fuzzyMatch('california department of health', 'california department of health');
      expect(result.score).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.confidence).toBe('high');
    });

    test('should detect good matches for substring queries', () => {
      const result = fuzzyMatch('health', 'california department of health');
      expect(result.score).toBeGreaterThan(0.4);
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });

    test('should use fuzzy matching for similar strings', () => {
      const result = fuzzyMatch('california dept health', 'california department of health');
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.matchType).toBe('fuzzy');
    });

    test('should respect threshold parameter', () => {
      const result = fuzzyMatch('abc', 'xyz', { threshold: 0.9 });
      expect(result.matchType).not.toBe('fuzzy');
    });
  });

  describe('findBestMatch', () => {
    test('should find best matches from candidate list', () => {
      const candidates = [
        'California Department of Health',
        'California Department of Transportation',
        'California Department of Education',
        'New York Department of Health'
      ];
      
      const matches = findBestMatch('california health', candidates);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].candidate).toBe('California Department of Health');
      expect(matches[0].result.score).toBeGreaterThan(0.6);
    });

    test('should respect limit parameter', () => {
      const candidates = ['match1', 'match2', 'match3', 'match4'];
      const matches = findBestMatch('ma', candidates, { limit: 2 });
      expect(matches.length).toBeLessThanOrEqual(2);
    });
  });

  describe('formatMatchResult', () => {
    test('should format match result with emoji and percentage', () => {
      const result = {
        score: 0.85,
        confidence: 'high' as const,
        algorithm: 'jaro-winkler',
        matchType: 'fuzzy' as const
      };
      
      const formatted = formatMatchResult(result);
      expect(formatted).toContain('🟢');
      expect(formatted).toContain('85%');
      expect(formatted).toContain('jaro-winkler');
    });

    test('should use appropriate emoji for different confidence levels', () => {
      const highResult = formatMatchResult({
        score: 0.95,
        confidence: 'high',
        algorithm: 'exact',
        matchType: 'exact'
      });
      expect(highResult).toContain('🟢');

      const mediumResult = formatMatchResult({
        score: 0.75,
        confidence: 'medium',
        algorithm: 'jaro-winkler',
        matchType: 'fuzzy'
      });
      expect(mediumResult).toContain('🟡');

      const lowResult = formatMatchResult({
        score: 0.55,
        confidence: 'low',
        algorithm: 'levenshtein',
        matchType: 'fuzzy'
      });
      expect(lowResult).toContain('🔴');
    });
  });
}); 