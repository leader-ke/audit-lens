import { describe, it, expect } from 'vitest';
import { cn, formatKes, formatDate, getInitials } from '@/lib/utils';

describe('cn - className merger', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    // tailwind-merge should keep the latter
    expect(cn('p-4', 'p-6')).toBe('p-6');
  });

  it('handles undefined/false values', () => {
    expect(cn('a', undefined, false && 'b', 'c')).toBe('a c');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });
});

describe('formatKes', () => {
  it('formats a positive integer', () => {
    const result = formatKes(1000000);
    expect(result).toMatch(/KES/);
    expect(result).toMatch(/1[,.]?000[,.]?000/);
  });

  it('formats a number from a string', () => {
    const result = formatKes('2500');
    expect(result).toMatch(/KES/);
  });

  it('returns N/A for null', () => {
    expect(formatKes(null)).toBe('N/A');
  });

  it('returns N/A for undefined', () => {
    expect(formatKes(undefined)).toBe('N/A');
  });

  it('returns N/A for NaN string', () => {
    expect(formatKes('not a number')).toBe('N/A');
  });

  it('formats zero correctly', () => {
    const result = formatKes(0);
    expect(result).toMatch(/KES/);
    expect(result).toMatch(/0/);
  });

  it('formats negative numbers', () => {
    const result = formatKes(-5000);
    expect(result).toMatch(/KES/);
  });
});

describe('formatDate', () => {
  it('formats a Date object to a readable string', () => {
    const d = new Date('2024-12-31T00:00:00Z');
    const result = formatDate(d);
    expect(result).toMatch(/2024/);
    expect(result).not.toBe('-');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-06-30');
    expect(result).toMatch(/2024/);
  });

  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('returns "-" for undefined', () => {
    expect(formatDate(undefined)).toBe('-');
  });
});

describe('getInitials', () => {
  it('extracts initials from a full name', () => {
    expect(getInitials('Kennedy Mwangi')).toBe('KM');
  });

  it('returns only first two initials for multi-word names', () => {
    expect(getInitials('Alice Bob Charlie')).toBe('AB');
  });

  it('uppercases initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('handles single-word name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('returns empty string for empty input', () => {
    expect(getInitials('')).toBe('');
  });
});
