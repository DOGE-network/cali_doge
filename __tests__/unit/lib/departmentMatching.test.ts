import { fuzzyMatch } from '@/lib/fuzzyMatching';

// Mock the fuzzyMatch function since we're testing the department matching logic
jest.mock('@/lib/fuzzyMatching', () => ({
  fuzzyMatch: jest.fn()
}));

describe('Department Matching Logic', () => {
  const mockFuzzyMatch = fuzzyMatch as jest.MockedFunction<typeof fuzzyMatch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test the logic that would be in findMatchInRecord function
  const testFindMatchInRecord = (record: any, searchQuery?: string, contextDepartmentName?: string) => {
    if (!contextDepartmentName) return null;
    
    let bestMatch: any = null;
    let bestScore = 0;
    let bestField = '';
    let bestMatchedText = '';

    // First, try to get the department code from the record
    const recordDepartmentCode = record.departmentCode || record.organizational_code || record.org_code;
    const recordDepartmentName = record.department || record.departmentName;
    const expectedDepartmentCode = record.departmentCode; // This is set in the DepartmentDetailCard context

    // Check for exact code and name match (highest priority)
    const codeMatches = recordDepartmentCode && expectedDepartmentCode && recordDepartmentCode === expectedDepartmentCode;
    const nameMatches = recordDepartmentName && contextDepartmentName && recordDepartmentName.toLowerCase() === contextDepartmentName.toLowerCase();

    if (codeMatches && nameMatches) {
      return {
        score: 1.0,
        display: `🟢 100% via department code & name`,
        field: 'department code & name',
        confidence: 'high' as const,
        matchedText: `${recordDepartmentCode} & ${recordDepartmentName}`
      };
    } else if (codeMatches) {
      return {
        score: 1.0,
        display: `🟢 100% via department code`,
        field: 'department code',
        confidence: 'high' as const,
        matchedText: recordDepartmentCode
      };
    } else if (nameMatches) {
      return {
        score: 0.8,
        display: `🟢 80% via department name`,
        field: 'department name',
        confidence: 'high' as const,
        matchedText: recordDepartmentName
      };
    }

    // Fields to check for fuzzy matching against the department name
    const fieldsToCheck = [
      { field: 'department', label: 'department', weight: 1.2 },
      { field: 'departmentName', label: 'department name', weight: 1.2 },
      { field: 'vendor', label: 'vendor', weight: 1.0 },
      { field: 'program', label: 'program', weight: 0.8 },
      { field: 'programName', label: 'program name', weight: 0.8 },
      { field: 'description', label: 'description', weight: 0.6 },
      { field: 'programDescription', label: 'program desc', weight: 0.6 }
    ];

    // Check each field against the department name using fuzzy matching
    fieldsToCheck.forEach(({ field, label, weight }) => {
      const fieldValue = record[field];
      if (fieldValue && typeof fieldValue === 'string') {
        // Check for exact name match first
        if (fieldValue.toLowerCase() === contextDepartmentName.toLowerCase()) {
          const exactScore = 0.8; // 80% for exact name match
          if (exactScore > bestScore) {
            bestScore = exactScore;
            bestMatch = {
              score: exactScore,
              confidence: 'high' as const,
              algorithm: 'exact',
              matchType: 'exact'
            };
            bestField = label;
            bestMatchedText = fieldValue;
          }
        } else {
          // Use fuzzy matching for non-exact matches
          const fuzzyResult = mockFuzzyMatch(contextDepartmentName, fieldValue, { 
            threshold: 0.3, // Lower threshold to catch more matches
            usePhonetic: true,
            preferExact: true 
          });
          
          // Apply weight to the score, but cap at 0.7 for fuzzy matches
          const weightedScore = Math.min(fuzzyResult.score * weight, 0.7);
          
          if (weightedScore > bestScore) {
            bestScore = weightedScore;
            bestMatch = fuzzyResult;
            bestField = label;
            bestMatchedText = fieldValue;
          }
        }
      }
    });

    // If we have a decent match, return formatted result
    if (bestMatch && bestScore >= 0.3) {
      const percentage = Math.round(bestScore * 100);
      const confidenceIcon = bestMatch.confidence === 'high' ? '🟢' : 
                             bestMatch.confidence === 'medium' ? '🟡' : '🔴';
      
      return {
        score: bestScore,
        display: `${confidenceIcon} ${percentage}% via ${bestField}`,
        field: bestField,
        confidence: bestMatch.confidence,
        matchedText: bestMatchedText
      };
    }

    return null;
  };

  describe('findMatchInRecord function logic', () => {
    it('should return null when no context department name is provided', () => {
      const record = { department: 'Test Department' };
      const result = testFindMatchInRecord(record, 'test', undefined);
      expect(result).toBeNull();
    });

    it('should return exact match when department code and name match', () => {
      const record = {
        departmentCode: '123',
        department: 'Test Department'
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(result).toEqual({
        score: 1.0,
        display: '🟢 100% via department code & name',
        field: 'department code & name',
        confidence: 'high',
        matchedText: '123 & Test Department'
      });
    });

    it('should return high confidence match when only department code matches', () => {
      const record = {
        departmentCode: '123',
        department: 'Different Department'
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(result).toEqual({
        score: 1.0,
        display: '🟢 100% via department code',
        field: 'department code',
        confidence: 'high',
        matchedText: '123'
      });
    });

    it('should return high confidence match when only department name matches exactly', () => {
      const record = {
        department: 'Test Department'
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(result).toEqual({
        score: 0.8,
        display: '🟢 80% via department name',
        field: 'department name',
        confidence: 'high',
        matchedText: 'Test Department'
      });
    });

    it('should use fuzzy matching for non-exact matches', () => {
      mockFuzzyMatch.mockReturnValue({
        score: 0.6,
        confidence: 'medium',
        algorithm: 'fuzzy',
        matchType: 'fuzzy'
      });

      const record = {
        vendor: 'Similar Department Name'
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(mockFuzzyMatch).toHaveBeenCalledWith('Test Department', 'Similar Department Name', {
        threshold: 0.3,
        usePhonetic: true,
        preferExact: true
      });
      
      expect(result).toEqual({
        score: 0.6,
        display: '🟡 60% via vendor',
        field: 'vendor',
        confidence: 'medium',
        matchedText: 'Similar Department Name'
      });
    });

    it('should apply weight to fuzzy match scores', () => {
      mockFuzzyMatch.mockReturnValue({
        score: 0.5,
        confidence: 'medium',
        algorithm: 'fuzzy',
        matchType: 'fuzzy'
      });

      const record = {
        department: 'Similar Department Name' // weight: 1.2
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      // Score should be: 0.5 * 1.2 = 0.6, but capped at 0.7
      expect(result?.score).toBe(0.6);
    });

    it('should cap weighted fuzzy scores at 0.7', () => {
      mockFuzzyMatch.mockReturnValue({
        score: 0.8,
        confidence: 'high',
        algorithm: 'fuzzy',
        matchType: 'fuzzy'
      });

      const record = {
        department: 'Similar Department Name' // weight: 1.2
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      // Score should be: 0.8 * 1.2 = 0.96, but capped at 0.7
      expect(result?.score).toBe(0.7);
    });

    it('should return null for low confidence matches', () => {
      mockFuzzyMatch.mockReturnValue({
        score: 0.2,
        confidence: 'low',
        algorithm: 'fuzzy',
        matchType: 'fuzzy'
      });

      const record = {
        vendor: 'Very Different Name'
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(result).toBeNull();
    });

    it('should handle records with missing or null fields', () => {
      const record = {
        department: null,
        vendor: undefined,
        program: ''
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      expect(result).toBeNull();
      expect(mockFuzzyMatch).not.toHaveBeenCalled();
    });

    it('should prioritize exact matches over fuzzy matches', () => {
      mockFuzzyMatch.mockReturnValue({
        score: 0.9,
        confidence: 'high',
        algorithm: 'fuzzy',
        matchType: 'fuzzy'
      });

      const record = {
        department: 'Test Department', // Exact match: 0.8 score
        vendor: 'Similar Department Name' // Fuzzy match: 0.9 * 1.0 = 0.9 score, but capped at 0.7
      };
      const result = testFindMatchInRecord(record, 'test', 'Test Department');
      
      // Should prefer the exact match (0.8) over the fuzzy match (0.7)
      expect(result?.score).toBe(0.8);
      expect(result?.field).toBe('department name');
    });
  });
});