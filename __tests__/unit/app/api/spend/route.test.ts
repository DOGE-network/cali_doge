process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE = 'test-service-role-key';

import { parseFilterValue, matchesFilter } from '@/lib/utils';

describe('spend API utility functions', () => {
  describe('parseFilterValue', () => {
    it('parses AND-separated terms', () => {
      expect(parseFilterValue('foo AND bar')).toEqual({ terms: ['foo', 'bar'], operator: 'AND' });
    });
    it('parses OR-separated terms', () => {
      expect(parseFilterValue('foo OR bar')).toEqual({ terms: ['foo', 'bar'], operator: 'OR' });
    });
    it('parses quoted terms', () => {
      expect(parseFilterValue('"foo bar" AND baz')).toEqual({ terms: ['foo bar', 'baz'], operator: 'AND' });
    });
    it('treats commas as AND', () => {
      expect(parseFilterValue('foo,bar')).toEqual({ terms: ['foo', 'bar'], operator: 'AND' });
    });
  });

  describe('matchesFilter', () => {
    it('matches all terms with AND', () => {
      const filter: { terms: string[]; operator: "AND" } = { terms: ['foo', 'bar'], operator: "AND" };
      expect(matchesFilter('foo bar baz', filter)).toBe(true);
      expect(matchesFilter('foo something', filter)).toBe(false);
    });
    it('matches any term with OR', () => {
      const filter: { terms: string[]; operator: "OR" } = { terms: ['foo', 'bar'], operator: "OR" };
      expect(matchesFilter('foo something', filter)).toBe(true);
      expect(matchesFilter('bar something', filter)).toBe(true);
      expect(matchesFilter('baz', filter)).toBe(false);
    });
  });
}); 