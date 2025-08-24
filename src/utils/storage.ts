import { Task, Statistics, SessionData } from '../types/index.js';

/**
 * Local storage utility functions
 */

const STORAGE_KEYS = {
  TASKS: 'pomidor_tasks',
  SETTINGS: 'pomidor_settings',
  STATISTICS: 'pomidor_statistics',
  SESSIONS: 'pomidor_sessions',
  THEME: 'pomidor_theme',
  LANGUAGE: 'pomidor_language'
} as const;

/**
 * Save data to localStorage with error handling
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

/**
 * Task storage functions
 */
export function saveTasks(tasks: Task[]): boolean {
  return saveToStorage(STORAGE_KEYS.TASKS, tasks);
}

export function loadTasks(): Task[] {
  const tasks = loadFromStorage<Task[]>(STORAGE_KEYS.TASKS, []);
  // Convert date strings back to Date objects
  return tasks.map(task => ({
    ...task,
    createdAt: new Date(task.createdAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined
  }));
}

/**
 * Statistics storage functions
 */
export function saveStatistics(stats: Statistics): boolean {
  return saveToStorage(STORAGE_KEYS.STATISTICS, stats);
}

export function loadStatistics(): Statistics {
  return loadFromStorage<Statistics>(STORAGE_KEYS.STATISTICS, {
    pomodoros: 0,
    completedTasks: 0,
    focusTime: 0,
    sessionsToday: 0,
    totalSessions: 0,
    averageSessionLength: 25,
    productivityScore: 0
  });
}

/**
 * Session data storage functions
 */
export function saveSessions(sessions: SessionData[]): boolean {
  return saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
}

export function loadSessions(): SessionData[] {
  const sessions = loadFromStorage<SessionData[]>(STORAGE_KEYS.SESSIONS, []);
  // Convert date strings back to Date objects
  return sessions.map(session => ({
    ...session,
    startTime: new Date(session.startTime),
    endTime: new Date(session.endTime)
  }));
}

/**
 * Settings storage functions
 */
export function saveSettings(settings: any): boolean {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

export function loadSettings(): any {
  return loadFromStorage(STORAGE_KEYS.SETTINGS, {
    work: 25,
    break: 5,
    longBreak: 15,
    sessions: 4,
    autoStart: false,
    notificationsEnabled: false,
    soundEnabled: true,
    soundVolume: 50
  });
}

/**
 * Export all data for backup
 */
export function exportData(): string {
  const data = {
    tasks: loadTasks(),
    statistics: loadStatistics(),
    sessions: loadSessions(),
    settings: loadSettings(),
    exportDate: new Date().toISOString(),
    version: '2.0.0'
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from backup
 */
export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    
    // Validate data structure
    if (!data.version || !data.exportDate) {
      throw new Error('Invalid backup file format');
    }
    
    // Import each section
    if (data.tasks) saveTasks(data.tasks);
    if (data.statistics) saveStatistics(data.statistics);
    if (data.sessions) saveSessions(data.sessions);
    if (data.settings) saveSettings(data.settings);
    
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

/**
 * Clear all application data
 */
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromStorage(key);
  });
}

/**
 * Get storage usage statistics
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage.getItem(key)?.length || 0;
    }
  }
  
  // Estimate total available space (5MB is typical)
  const total = 5 * 1024 * 1024; // 5MB in bytes
  const percentage = (used / total) * 100;
  
  return { used, total, percentage };
}