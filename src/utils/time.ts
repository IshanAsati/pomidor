/**
 * Utility functions for time formatting and calculations
 */

/**
 * Format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Format minutes into human-readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Get time of day greeting
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Calculate productivity score based on completed sessions and tasks
 */
export function calculateProductivityScore(
  completedSessions: number,
  plannedSessions: number,
  completedTasks: number,
  totalTasks: number
): number {
  const sessionScore = plannedSessions > 0 ? (completedSessions / plannedSessions) * 50 : 0;
  const taskScore = totalTasks > 0 ? (completedTasks / totalTasks) * 50 : 0;
  return Math.min(100, Math.round(sessionScore + taskScore));
}

/**
 * Generate insights based on productivity data
 */
export function generateInsights(
  focusTime: number,
  completedPomodoros: number,
  completedTasks: number
): string[] {
  const insights: string[] = [];
  
  if (completedPomodoros >= 8) {
    insights.push('🎉 Excellent focus today! You completed 8+ pomodoros.');
  } else if (completedPomodoros >= 4) {
    insights.push('👍 Good productivity! You had a solid focus session.');
  }
  
  if (focusTime >= 120) {
    insights.push('⏰ You focused for over 2 hours today - great dedication!');
  }
  
  if (completedTasks >= 5) {
    insights.push('✅ Task master! You completed multiple tasks today.');
  }
  
  if (insights.length === 0) {
    insights.push('💪 Every journey starts with a single step. Keep going!');
  }
  
  return insights;
}

/**
 * Get current week start and end dates
 */
export function getCurrentWeek(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Generate a random ID for tasks and sessions
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}