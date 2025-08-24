/**
 * Input validation and sanitization utilities
 */

/**
 * Validate timer duration (1-60 minutes)
 */
export function validateTimerDuration(value: number | string): number | null {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num < 1 || num > 60) {
    return null;
  }
  return num;
}

/**
 * Validate session count (1-10)
 */
export function validateSessionCount(value: number | string): number | null {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num < 1 || num > 10) {
    return null;
  }
  return num;
}

/**
 * Validate volume level (0-100)
 */
export function validateVolume(value: number | string): number | null {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(num) || num < 0 || num > 100) {
    return null;
  }
  return num;
}

/**
 * Sanitize task text input
 */
export function sanitizeTaskText(text: string): string {
  return text
    .trim()
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .substring(0, 200); // Limit length
}

/**
 * Validate task priority
 */
export function validatePriority(priority: string): 'high' | 'medium' | 'low' {
  const validPriorities = ['high', 'medium', 'low'] as const;
  return validPriorities.includes(priority as any) ? priority as any : 'medium';
}

/**
 * Sanitize category name
 */
export function sanitizeCategory(category: string): string {
  return category
    .trim()
    .replace(/[<>"'&]/g, '')
    .substring(0, 50);
}

/**
 * Validate email format (for future team features)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format (for integrations)
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if input contains XSS attempts
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[\s\S]*?<\/script>/gi, // More robust script tag detection
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize HTML input
 */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): boolean {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limiting for actions (prevent spam)
 */
const actionTimestamps = new Map<string, number>();

export function isRateLimited(action: string, limitMs: number = 1000): boolean {
  const now = Date.now();
  const lastAction = actionTimestamps.get(action);
  
  if (lastAction && now - lastAction < limitMs) {
    return true;
  }
  
  actionTimestamps.set(action, now);
  return false;
}

/**
 * Validate theme name
 */
export function validateTheme(theme: string): 'light' | 'dark' | 'auto' {
  const validThemes = ['light', 'dark', 'auto'] as const;
  return validThemes.includes(theme as any) ? theme as any : 'auto';
}

/**
 * Validate language code
 */
export function validateLanguage(lang: string): string {
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
  return supportedLanguages.includes(lang) ? lang : 'en';
}

/**
 * Error handling wrapper for async functions
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallback?: any
): T {
  return ((...args: Parameters<T>) => {
    return fn(...args).catch((error: Error) => {
      console.error(`Error in ${fn.name}:`, error);
      return fallback;
    });
  }) as T;
}

/**
 * Input validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

/**
 * Comprehensive input validator
 */
export function validateInput(
  value: any,
  type: 'duration' | 'sessions' | 'volume' | 'text' | 'email' | 'url',
  options?: { min?: number; max?: number; required?: boolean }
): ValidationResult {
  const opts = { required: false, ...options };
  
  // Check if required
  if (opts.required && (value === null || value === undefined || value === '')) {
    return { isValid: false, error: 'This field is required' };
  }
  
  // Skip validation if not required and empty
  if (!opts.required && (value === null || value === undefined || value === '')) {
    return { isValid: true, value: value };
  }
  
  switch (type) {
    case 'duration': {
      const duration = validateTimerDuration(value);
      return duration !== null 
        ? { isValid: true, value: duration }
        : { isValid: false, error: 'Duration must be between 1 and 60 minutes' };
    }
        
    case 'sessions': {
      const sessions = validateSessionCount(value);
      return sessions !== null
        ? { isValid: true, value: sessions }
        : { isValid: false, error: 'Sessions must be between 1 and 10' };
    }
        
    case 'volume': {
      const volume = validateVolume(value);
      return volume !== null
        ? { isValid: true, value: volume }
        : { isValid: false, error: 'Volume must be between 0 and 100' };
    }
        
    case 'text': {
      if (containsXSS(value)) {
        return { isValid: false, error: 'Invalid characters detected' };
      }
      const sanitized = sanitizeTaskText(value);
      return { isValid: true, value: sanitized };
    }
      
    case 'email':
      return validateEmail(value)
        ? { isValid: true, value: value }
        : { isValid: false, error: 'Invalid email format' };
        
    case 'url':
      return validateUrl(value)
        ? { isValid: true, value: value }
        : { isValid: false, error: 'Invalid URL format' };
        
    default:
      return { isValid: false, error: 'Unknown validation type' };
  }
}