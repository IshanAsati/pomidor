import { describe, it, expect } from 'vitest';
import { formatTime, formatDuration, calculateProductivityScore, generateId, isToday } from '../utils/time.js';

describe('Time Utilities', () => {
  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(60)).toBe('01:00');
      expect(formatTime(125)).toBe('02:05');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle edge cases', () => {
      expect(formatTime(59)).toBe('00:59');
      expect(formatTime(3600)).toBe('60:00');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      expect(formatDuration(0)).toBe('0m');
      expect(formatDuration(30)).toBe('30m');
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(120)).toBe('2h');
    });
  });

  describe('calculateProductivityScore', () => {
    it('should calculate score correctly', () => {
      expect(calculateProductivityScore(0, 0, 0, 0)).toBe(0);
      expect(calculateProductivityScore(4, 8, 3, 6)).toBe(50);
      expect(calculateProductivityScore(8, 8, 6, 6)).toBe(100);
      expect(calculateProductivityScore(10, 8, 8, 6)).toBe(100); // Should cap at 100
    });

    it('should handle edge cases', () => {
      expect(calculateProductivityScore(0, 8, 0, 6)).toBe(0);
      expect(calculateProductivityScore(8, 0, 6, 0)).toBe(0); // No planned sessions = 0 score
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('isToday', () => {
    it('should correctly identify today', () => {
      const today = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(isToday(today)).toBe(true);
      expect(isToday(yesterday)).toBe(false);
      expect(isToday(tomorrow)).toBe(false);
    });
  });
});