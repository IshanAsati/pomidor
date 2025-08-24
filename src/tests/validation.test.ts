import { describe, it, expect, beforeEach } from 'vitest';
import { 
  validateTimerDuration, 
  validateSessionCount, 
  validateVolume, 
  sanitizeTaskText, 
  validatePriority,
  containsXSS,
  validateInput
} from '../utils/validation.js';

describe('Validation Utilities', () => {
  describe('validateTimerDuration', () => {
    it('should validate correct durations', () => {
      expect(validateTimerDuration(25)).toBe(25);
      expect(validateTimerDuration('30')).toBe(30);
      expect(validateTimerDuration(1)).toBe(1);
      expect(validateTimerDuration(60)).toBe(60);
    });

    it('should reject invalid durations', () => {
      expect(validateTimerDuration(0)).toBeNull();
      expect(validateTimerDuration(61)).toBeNull();
      expect(validateTimerDuration(-5)).toBeNull();
      expect(validateTimerDuration('invalid')).toBeNull();
    });
  });

  describe('validateSessionCount', () => {
    it('should validate correct session counts', () => {
      expect(validateSessionCount(4)).toBe(4);
      expect(validateSessionCount('8')).toBe(8);
      expect(validateSessionCount(1)).toBe(1);
      expect(validateSessionCount(10)).toBe(10);
    });

    it('should reject invalid session counts', () => {
      expect(validateSessionCount(0)).toBeNull();
      expect(validateSessionCount(11)).toBeNull();
      expect(validateSessionCount(-1)).toBeNull();
    });
  });

  describe('validateVolume', () => {
    it('should validate correct volumes', () => {
      expect(validateVolume(50)).toBe(50);
      expect(validateVolume('75')).toBe(75);
      expect(validateVolume(0)).toBe(0);
      expect(validateVolume(100)).toBe(100);
    });

    it('should reject invalid volumes', () => {
      expect(validateVolume(-1)).toBeNull();
      expect(validateVolume(101)).toBeNull();
    });
  });

  describe('sanitizeTaskText', () => {
    it('should sanitize task text properly', () => {
      expect(sanitizeTaskText('  Normal task  ')).toBe('Normal task');
      expect(sanitizeTaskText('Task with <script>')).toBe('Task with script'); // Only removes <>'"& characters
      expect(sanitizeTaskText('Task with "quotes"')).toBe('Task with quotes');
      expect(sanitizeTaskText('A'.repeat(250))).toHaveLength(200);
    });
  });

  describe('validatePriority', () => {
    it('should validate correct priorities', () => {
      expect(validatePriority('high')).toBe('high');
      expect(validatePriority('medium')).toBe('medium');
      expect(validatePriority('low')).toBe('low');
    });

    it('should default to medium for invalid priorities', () => {
      expect(validatePriority('invalid')).toBe('medium');
      expect(validatePriority('')).toBe('medium');
    });
  });

  describe('containsXSS', () => {
    it('should detect XSS attempts', () => {
      expect(containsXSS('<script>alert("xss")</script>')).toBe(true);
      expect(containsXSS('javascript:alert(1)')).toBe(true);
      expect(containsXSS('<iframe src="evil.com"></iframe>')).toBe(true);
      expect(containsXSS('onclick="alert(1)"')).toBe(true);
    });

    it('should allow safe content', () => {
      expect(containsXSS('Normal text')).toBe(false);
      expect(containsXSS('Text with numbers 123')).toBe(false);
      expect(containsXSS('Email: user@example.com')).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should validate duration inputs', () => {
      const result = validateInput(25, 'duration');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(25);

      const invalidResult = validateInput(0, 'duration');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });

    it('should handle required fields', () => {
      const result = validateInput('', 'text', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('This field is required');

      const optionalResult = validateInput('', 'text', { required: false });
      expect(optionalResult.isValid).toBe(true);
    });

    it('should validate text inputs', () => {
      const result = validateInput('Normal task', 'text');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('Normal task');

      const xssResult = validateInput('<script>alert(1)</script>', 'text');
      expect(xssResult.isValid).toBe(false);
      expect(xssResult.error).toBe('Invalid characters detected');
    });
  });
});