// Core timer types
export interface TimerState {
  isWorking: boolean;
  timeLeft: number;
  interval: number | null;
  sessionCount: number;
  isRunning: boolean;
  startTime: number | null;
}

export interface TimerSettings {
  work: number;
  break: number;
  longBreak: number;
  sessions: number;
  autoStart: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
}

// Task management types
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: string | undefined;
  createdAt: Date;
  completedAt?: Date | undefined;
}

export interface TaskFilters {
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  completed?: boolean;
}

// Statistics types
export interface Statistics {
  pomodoros: number;
  completedTasks: number;
  focusTime: number; // in minutes
  sessionsToday: number;
  totalSessions: number;
  averageSessionLength: number;
  productivityScore: number;
}

// UI Elements types
export interface Elements {
  timer: HTMLElement | null;
  progress: HTMLElement | null;
  fullscreenTimer: {
    container: HTMLElement | null;
    display: HTMLElement | null;
    progress: HTMLElement | null;
    sessionLabel: HTMLElement | null;
  };
  buttons: {
    start: HTMLButtonElement | null;
    stop: HTMLButtonElement | null;
    reset: HTMLButtonElement | null;
    settings: HTMLButtonElement | null;
    darkMode: HTMLButtonElement | null;
    addTask: HTMLButtonElement | null;
    clearTasks: HTMLButtonElement | null;
    fullscreen: HTMLButtonElement | null;
    exitFullscreen: HTMLButtonElement | null;
    closeSettings: HTMLButtonElement | null;
  };
  inputs: {
    work: HTMLInputElement | null;
    break: HTMLInputElement | null;
    longBreak: HTMLInputElement | null;
    sessions: HTMLInputElement | null;
    autoStart: HTMLInputElement | null;
    newTask: HTMLInputElement | null;
    priority: HTMLSelectElement | null;
    category: HTMLInputElement | null;
    notificationsEnabled: HTMLInputElement | null;
    soundEnabled: HTMLInputElement | null;
    soundVolume: HTMLInputElement | null;
  };
  settings: HTMLElement | null;
  taskList: HTMLElement | null;
  audio: HTMLAudioElement | null;
  statistics: {
    pomodoros: HTMLElement | null;
    tasks: HTMLElement | null;
    focusTime: HTMLElement | null;
  };
  lastActiveTime: number;
  remainingTimeBeforePause: number | null;
}

// Event types
export interface TimerEvents {
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onComplete: () => void;
  onTick: (timeLeft: number) => void;
}

// Analytics types
export interface SessionData {
  id: string;
  type: 'work' | 'break' | 'longBreak';
  duration: number;
  startTime: Date;
  endTime: Date;
  completed: boolean;
  interruptions: number;
}

export interface ProductivityReport {
  date: Date;
  sessions: SessionData[];
  totalFocusTime: number;
  completedPomodoros: number;
  completedTasks: number;
  productivityScore: number;
  insights: string[];
}

// Notification types
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// Theme types
export type Theme = 'light' | 'dark' | 'auto';

// Language types
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

// Configuration types
export interface AppConfig {
  theme: Theme;
  language: Language;
  notifications: boolean;
  sound: boolean;
  autoStart: boolean;
  analytics: boolean;
}