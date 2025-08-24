import { Elements, TimerSettings, AppConfig } from '../types/index.js';
import { Timer } from '../components/Timer.js';
import { TaskManager } from '../components/TaskManager.js';
import { StatisticsManager } from '../components/StatisticsManager.js';
import { loadSettings, saveSettings } from '../utils/storage.js';
import { validateTimerDuration, validateSessionCount, validateVolume } from '../utils/validation.js';
import { initializeNotifications } from '../utils/notifications.js';

/**
 * Main Pomidor Application class
 */
export class PomidorApp {
  private elements: Elements;
  private timer: Timer;
  private taskManager: TaskManager;
  private statisticsManager: StatisticsManager;
  private settings: TimerSettings;
  private config: AppConfig;

  constructor() {
    this.elements = this.initializeElements();
    this.settings = this.loadSettings();
    this.config = this.loadConfig();
    
    // Initialize components
    this.timer = new Timer(this.elements, this.settings);
    this.taskManager = new TaskManager(this.elements);
    this.statisticsManager = new StatisticsManager(this.elements);

    this.bindEvents();
    this.initializeApp();
  }

  /**
   * Initialize DOM elements
   */
  private initializeElements(): Elements {
    return {
      timer: document.getElementById('timerDisplay'),
      progress: document.getElementById('progressBar'),
      fullscreenTimer: {
        container: document.getElementById('fullscreenTimer'),
        display: document.getElementById('fullscreenTimerDisplay'),
        progress: document.getElementById('fullscreenProgressBar'),
        sessionLabel: document.getElementById('sessionLabel')
      },
      buttons: {
        start: document.getElementById('startButton') as HTMLButtonElement,
        stop: document.getElementById('stopButton') as HTMLButtonElement,
        reset: document.getElementById('resetButton') as HTMLButtonElement,
        settings: document.getElementById('settingsButton') as HTMLButtonElement,
        darkMode: document.getElementById('darkModeButton') as HTMLButtonElement,
        addTask: document.getElementById('addTaskButton') as HTMLButtonElement,
        clearTasks: document.getElementById('clearTasksButton') as HTMLButtonElement,
        fullscreen: document.getElementById('fullscreenButton') as HTMLButtonElement,
        exitFullscreen: document.getElementById('exitFullscreen') as HTMLButtonElement,
        closeSettings: document.getElementById('closeSettings') as HTMLButtonElement
      },
      inputs: {
        work: document.getElementById('workDuration') as HTMLInputElement,
        break: document.getElementById('breakDuration') as HTMLInputElement,
        longBreak: document.getElementById('longBreakDuration') as HTMLInputElement,
        sessions: document.getElementById('sessionsBeforeLongBreak') as HTMLInputElement,
        autoStart: document.getElementById('autoStartNextSession') as HTMLInputElement,
        newTask: document.getElementById('newTaskInput') as HTMLInputElement,
        priority: document.getElementById('taskPriority') as HTMLSelectElement,
        category: document.getElementById('taskCategory') as HTMLInputElement,
        notificationsEnabled: document.getElementById('notificationsEnabled') as HTMLInputElement,
        soundEnabled: document.getElementById('soundEnabled') as HTMLInputElement,
        soundVolume: document.getElementById('soundVolume') as HTMLInputElement
      },
      settings: document.getElementById('settings'),
      taskList: document.getElementById('taskList'),
      audio: document.getElementById('dingSound') as HTMLAudioElement,
      statistics: {
        pomodoros: document.getElementById('completedPomodoros'),
        tasks: document.getElementById('completedTasks'),
        focusTime: document.getElementById('totalFocusTime')
      },
      lastActiveTime: Date.now(),
      remainingTimeBeforePause: null
    };
  }

  /**
   * Bind global event listeners
   */
  private bindEvents(): void {
    // Settings modal
    this.elements.buttons.settings?.addEventListener('click', () => {
      this.toggleSettings();
    });

    this.elements.buttons.closeSettings?.addEventListener('click', () => {
      this.hideSettings();
    });

    // Dark mode toggle
    this.elements.buttons.darkMode?.addEventListener('click', () => {
      this.toggleDarkMode();
    });

    // Fullscreen functionality
    this.elements.buttons.fullscreen?.addEventListener('click', () => {
      this.enterFullscreen();
    });

    this.elements.buttons.exitFullscreen?.addEventListener('click', () => {
      this.exitFullscreen();
    });

    // Settings input listeners
    this.bindSettingsInputs();

    // Keyboard shortcuts
    this.bindKeyboardShortcuts();

    // Timer events
    this.timer.on('onComplete', () => {
      this.handleSessionComplete();
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.saveAllData();
    });

    // Visibility change (for pause detection)
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Bind settings input events
   */
  private bindSettingsInputs(): void {
    // Timer duration settings
    this.elements.inputs.work?.addEventListener('change', (e) => {
      const value = validateTimerDuration((e.target as HTMLInputElement).value);
      if (value) {
        this.settings.work = value;
        this.updateTimerSettings();
      }
    });

    this.elements.inputs.break?.addEventListener('change', (e) => {
      const value = validateTimerDuration((e.target as HTMLInputElement).value);
      if (value) {
        this.settings.break = value;
        this.updateTimerSettings();
      }
    });

    this.elements.inputs.longBreak?.addEventListener('change', (e) => {
      const value = validateTimerDuration((e.target as HTMLInputElement).value);
      if (value) {
        this.settings.longBreak = value;
        this.updateTimerSettings();
      }
    });

    this.elements.inputs.sessions?.addEventListener('change', (e) => {
      const value = validateSessionCount((e.target as HTMLInputElement).value);
      if (value) {
        this.settings.sessions = value;
        this.updateTimerSettings();
      }
    });

    // Other settings
    this.elements.inputs.autoStart?.addEventListener('change', (e) => {
      this.settings.autoStart = (e.target as HTMLInputElement).checked;
      this.updateTimerSettings();
    });

    this.elements.inputs.notificationsEnabled?.addEventListener('change', (e) => {
      this.settings.notificationsEnabled = (e.target as HTMLInputElement).checked;
      if (this.settings.notificationsEnabled) {
        initializeNotifications();
      }
      this.updateTimerSettings();
    });

    this.elements.inputs.soundEnabled?.addEventListener('change', (e) => {
      this.settings.soundEnabled = (e.target as HTMLInputElement).checked;
      this.updateTimerSettings();
    });

    this.elements.inputs.soundVolume?.addEventListener('input', (e) => {
      const value = validateVolume((e.target as HTMLInputElement).value);
      if (value !== null) {
        this.settings.soundVolume = value;
        this.updateTimerSettings();
      }
    });
  }

  /**
   * Bind keyboard shortcuts
   */
  private bindKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          e.preventDefault();
          this.toggleTimer();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with refresh
          e.preventDefault();
          this.timer.reset();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with save
          e.preventDefault();
          this.toggleSettings();
          break;
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'd':
          e.preventDefault();
          this.toggleDarkMode();
          break;
        case 'escape':
          this.exitFullscreen();
          this.hideSettings();
          break;
      }
    });
  }

  /**
   * Initialize the application
   */
  private async initializeApp(): Promise<void> {
    // Load saved theme
    this.applyTheme();

    // Initialize settings display
    this.updateSettingsDisplay();

    // Initialize notifications if enabled
    if (this.settings.notificationsEnabled) {
      await initializeNotifications();
    }

    // Set up periodic statistics reset (daily)
    this.setupDailyReset();

    // Add PWA install prompt handling
    this.setupPWAInstall();

    console.log('Pomidor app initialized successfully');
  }

  /**
   * Toggle timer (start/stop)
   */
  private toggleTimer(): void {
    const timerState = this.timer.getState();
    if (timerState.isRunning) {
      this.timer.stop();
    } else {
      this.timer.start();
    }
  }

  /**
   * Toggle settings modal
   */
  private toggleSettings(): void {
    if (this.elements.settings) {
      const isVisible = this.elements.settings.style.display !== 'none';
      this.elements.settings.style.display = isVisible ? 'none' : 'block';
    }
  }

  /**
   * Hide settings modal
   */
  private hideSettings(): void {
    if (this.elements.settings) {
      this.elements.settings.style.display = 'none';
    }
  }

  /**
   * Toggle dark mode
   */
  private toggleDarkMode(): void {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    this.config.theme = isDark ? 'dark' : 'light';
    this.saveConfig();
  }

  /**
   * Apply saved theme
   */
  private applyTheme(): void {
    if (this.config.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else if (this.config.theme === 'auto') {
      // Apply system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.classList.add('dark-mode');
      }
    }
  }

  /**
   * Toggle fullscreen
   */
  private toggleFullscreen(): void {
    const isFullscreen = this.elements.fullscreenTimer.container?.classList.contains('active');
    if (isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  /**
   * Enter fullscreen mode
   */
  private enterFullscreen(): void {
    this.elements.fullscreenTimer.container?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Exit fullscreen mode
   */
  private exitFullscreen(): void {
    this.elements.fullscreenTimer.container?.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Handle session completion
   */
  private handleSessionComplete(): void {
    const sessionType = this.timer.getCurrentSessionType();
    const sessionDuration = this.timer.getSettings().work; // Or appropriate duration

    // Record session in statistics
    if (sessionType === 'work') {
      this.statisticsManager.recordSession('work', sessionDuration, true);
    }
  }

  /**
   * Handle visibility change (tab switching, etc.)
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.elements.lastActiveTime = Date.now();
    } else {
      // App became visible again
      const timePaused = Date.now() - this.elements.lastActiveTime;
      
      // If paused for more than 5 minutes, consider it an interruption
      if (timePaused > 5 * 60 * 1000) {
        const timerState = this.timer.getState();
        if (timerState.isRunning) {
          // Optionally pause the timer or ask user what to do
          console.log('Long pause detected, you may want to handle this');
        }
      }
    }
  }

  /**
   * Update timer settings
   */
  private updateTimerSettings(): void {
    this.timer.updateSettings(this.settings);
    this.saveSettings();
  }

  /**
   * Update settings display
   */
  private updateSettingsDisplay(): void {
    if (this.elements.inputs.work) this.elements.inputs.work.value = this.settings.work.toString();
    if (this.elements.inputs.break) this.elements.inputs.break.value = this.settings.break.toString();
    if (this.elements.inputs.longBreak) this.elements.inputs.longBreak.value = this.settings.longBreak.toString();
    if (this.elements.inputs.sessions) this.elements.inputs.sessions.value = this.settings.sessions.toString();
    if (this.elements.inputs.autoStart) this.elements.inputs.autoStart.checked = this.settings.autoStart;
    if (this.elements.inputs.notificationsEnabled) this.elements.inputs.notificationsEnabled.checked = this.settings.notificationsEnabled;
    if (this.elements.inputs.soundEnabled) this.elements.inputs.soundEnabled.checked = this.settings.soundEnabled;
    if (this.elements.inputs.soundVolume) this.elements.inputs.soundVolume.value = this.settings.soundVolume.toString();
  }

  /**
   * Setup daily statistics reset
   */
  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.statisticsManager.resetDailyStats();
      // Set up daily interval
      setInterval(() => {
        this.statisticsManager.resetDailyStats();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Setup PWA install prompt
   */
  private setupPWAInstall(): void {
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or prompt
      this.showInstallPrompt(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      deferredPrompt = null;
    });
  }

  /**
   * Show PWA install prompt
   */
  private showInstallPrompt(deferredPrompt: any): void {
    // Create install button if it doesn't exist
    let installBtn = document.getElementById('installBtn');
    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'installBtn';
      installBtn.textContent = '📱 Install App';
      installBtn.className = 'install-btn';
      
      // Add to appropriate container
      const container = document.querySelector('.header') || document.body;
      container.appendChild(installBtn);
    }

    installBtn.style.display = 'block';
    installBtn.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        installBtn.style.display = 'none';
        deferredPrompt = null;
      }
    };
  }

  /**
   * Load settings from storage
   */
  private loadSettings(): TimerSettings {
    return loadSettings();
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    saveSettings(this.settings);
  }

  /**
   * Load app configuration
   */
  private loadConfig(): AppConfig {
    const saved = localStorage.getItem('pomidor_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved config');
      }
    }

    return {
      theme: 'auto',
      language: 'en',
      notifications: true,
      sound: true,
      autoStart: false,
      analytics: true
    };
  }

  /**
   * Save app configuration
   */
  private saveConfig(): void {
    localStorage.setItem('pomidor_config', JSON.stringify(this.config));
  }

  /**
   * Save all application data
   */
  private saveAllData(): void {
    this.saveSettings();
    this.saveConfig();
    // Task and statistics data are saved automatically by their respective managers
  }

  /**
   * Get application statistics
   */
  public getAppStatistics(): any {
    return {
      timer: this.timer.getState(),
      tasks: this.taskManager.getStatistics(),
      productivity: this.statisticsManager.getStatistics()
    };
  }

  /**
   * Export all application data
   */
  public exportAllData(): string {
    const data = {
      settings: this.settings,
      config: this.config,
      tasks: this.taskManager.exportTasks(),
      statistics: this.statisticsManager.exportData(),
      exportDate: new Date().toISOString(),
      version: '2.0.0'
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import application data
   */
  public importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.settings) {
        this.settings = { ...this.settings, ...data.settings };
        this.updateTimerSettings();
        this.updateSettingsDisplay();
      }

      if (data.config) {
        this.config = { ...this.config, ...data.config };
        this.saveConfig();
        this.applyTheme();
      }

      if (data.tasks) {
        this.taskManager.importTasks(data.tasks);
      }

      if (data.statistics) {
        this.statisticsManager.importData(data.statistics);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}