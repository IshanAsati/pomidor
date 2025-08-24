import { TimerState, TimerSettings, TimerEvents, Elements } from '../types/index.js';
import { formatTime } from '../utils/time.js';
import { showSessionCompleteNotification, playNotificationSound } from '../utils/notifications.js';
import { validateTimerDuration, validateSessionCount, validateVolume } from '../utils/validation.js';

/**
 * Timer component class
 */
export class Timer {
  private state: TimerState;
  private settings: TimerSettings;
  private events: Partial<TimerEvents>;
  private elements: Elements;

  constructor(elements: Elements, settings: TimerSettings) {
    this.elements = elements;
    this.settings = settings;
    this.events = {};
    
    this.state = {
      isWorking: true,
      timeLeft: this.settings.work * 60,
      interval: null,
      sessionCount: 0,
      isRunning: false,
      startTime: null
    };

    this.bindEvents();
    this.updateDisplay();
  }

  /**
   * Bind event listeners
   */
  private bindEvents(): void {
    this.elements.buttons.start?.addEventListener('click', () => this.start());
    this.elements.buttons.stop?.addEventListener('click', () => this.stop());
    this.elements.buttons.reset?.addEventListener('click', () => this.reset());

    // Settings change listeners
    this.elements.inputs.work?.addEventListener('change', () => this.updateTimerDisplay());
    this.elements.inputs.break?.addEventListener('change', () => this.updateTimerDisplay());
    this.elements.inputs.longBreak?.addEventListener('change', () => this.updateTimerDisplay());
    this.elements.inputs.sessions?.addEventListener('change', () => this.updateTimerDisplay());
  }

  /**
   * Start the timer
   */
  public start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.state.startTime = Date.now();
    
    this.updateButtonStates();
    
    this.state.interval = window.setInterval(() => {
      this.tick();
    }, 1000);

    this.events.onStart?.();
  }

  /**
   * Stop/pause the timer
   */
  public stop(): void {
    if (!this.state.isRunning) return;

    this.state.isRunning = false;
    
    if (this.state.interval) {
      clearInterval(this.state.interval);
      this.state.interval = null;
    }

    this.updateButtonStates();
    this.events.onStop?.();
  }

  /**
   * Reset the timer
   */
  public reset(): void {
    this.stop();
    
    this.state.timeLeft = this.state.isWorking 
      ? this.settings.work * 60 
      : this.settings.break * 60;
    
    this.updateDisplay();
    this.updateProgressBar();
    this.events.onReset?.();
  }

  /**
   * Timer tick function
   */
  private tick(): void {
    if (this.state.timeLeft <= 0) {
      this.handleTimerComplete();
      return;
    }

    this.state.timeLeft--;
    this.updateDisplay();
    this.updateProgressBar();
    this.events.onTick?.(this.state.timeLeft);
  }

  /**
   * Handle timer completion
   */
  private handleTimerComplete(): void {
    this.stop();
    
    // Play sound if enabled
    if (this.settings.soundEnabled) {
      playNotificationSound(this.settings.soundVolume);
    }

    // Show notification
    if (this.settings.notificationsEnabled) {
      const sessionType = this.state.isWorking ? 'work' : 
        (this.state.sessionCount % this.settings.sessions === 0 ? 'longBreak' : 'break');
      showSessionCompleteNotification(sessionType);
    }

    // Switch session type
    this.state.isWorking = !this.state.isWorking;
    this.state.sessionCount++;

    // Set next timer duration
    this.setNextTimerDuration();

    // Auto-start if enabled
    if (this.settings.autoStart) {
      this.start();
    } else {
      this.updateButtonStates();
    }

    this.events.onComplete?.();
  }

  /**
   * Set next timer duration based on session type
   */
  private setNextTimerDuration(): void {
    if (this.state.isWorking) {
      this.state.timeLeft = this.settings.work * 60;
    } else {
      // Determine if it's a long break
      const isLongBreak = this.state.sessionCount % this.settings.sessions === 0;
      this.state.timeLeft = isLongBreak 
        ? this.settings.longBreak * 60 
        : this.settings.break * 60;
    }

    this.updateDisplay();
    this.updateProgressBar();
  }

  /**
   * Update timer display
   */
  private updateDisplay(): void {
    const timeString = formatTime(this.state.timeLeft);
    
    if (this.elements.timer) {
      this.elements.timer.textContent = timeString;
    }
    
    if (this.elements.fullscreenTimer.display) {
      this.elements.fullscreenTimer.display.textContent = timeString;
    }

    // Update session label
    const sessionLabel = this.state.isWorking ? 'Focus Time' : 
      (this.state.sessionCount % this.settings.sessions === 0 ? 'Long Break' : 'Break Time');
    
    if (this.elements.fullscreenTimer.sessionLabel) {
      this.elements.fullscreenTimer.sessionLabel.textContent = sessionLabel;
    }

    // Update document title
    document.title = `${timeString} - ${sessionLabel} | Pomidor`;
  }

  /**
   * Update progress bar
   */
  private updateProgressBar(): void {
    const totalDuration = this.state.isWorking 
      ? this.settings.work * 60 
      : this.settings.break * 60;
    
    const progress = ((totalDuration - this.state.timeLeft) / totalDuration) * 100;
    
    if (this.elements.progress) {
      this.elements.progress.style.width = `${progress}%`;
    }
    
    if (this.elements.fullscreenTimer.progress) {
      this.elements.fullscreenTimer.progress.style.width = `${progress}%`;
    }
  }

  /**
   * Update button states
   */
  private updateButtonStates(): void {
    if (this.elements.buttons.start) {
      this.elements.buttons.start.disabled = this.state.isRunning;
    }
    
    if (this.elements.buttons.stop) {
      this.elements.buttons.stop.disabled = !this.state.isRunning;
    }
  }

  /**
   * Update timer display when settings change
   */
  private updateTimerDisplay(): void {
    if (!this.state.isRunning) {
      this.state.timeLeft = this.state.isWorking 
        ? (this.elements.inputs.work?.valueAsNumber || this.settings.work) * 60
        : (this.elements.inputs.break?.valueAsNumber || this.settings.break) * 60;
      
      this.updateDisplay();
      this.updateProgressBar();
    }
  }

  /**
   * Update settings
   */
  public updateSettings(newSettings: Partial<TimerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Validate settings
    const validatedSettings = {
      work: validateTimerDuration(this.settings.work) || 25,
      break: validateTimerDuration(this.settings.break) || 5,
      longBreak: validateTimerDuration(this.settings.longBreak) || 15,
      sessions: validateSessionCount(this.settings.sessions) || 4,
      soundVolume: validateVolume(this.settings.soundVolume) || 50,
      autoStart: Boolean(this.settings.autoStart),
      notificationsEnabled: Boolean(this.settings.notificationsEnabled),
      soundEnabled: Boolean(this.settings.soundEnabled)
    };

    this.settings = validatedSettings;
    
    if (!this.state.isRunning) {
      this.updateTimerDisplay();
    }
  }

  /**
   * Add event listener
   */
  public on(event: keyof TimerEvents, callback: () => void): void {
    this.events[event] = callback;
  }

  /**
   * Get current state
   */
  public getState(): Readonly<TimerState> {
    return { ...this.state };
  }

  /**
   * Get current settings
   */
  public getSettings(): Readonly<TimerSettings> {
    return { ...this.settings };
  }

  /**
   * Skip current session
   */
  public skipSession(): void {
    this.handleTimerComplete();
  }

  /**
   * Add time to current session
   */
  public addTime(minutes: number): void {
    this.state.timeLeft += minutes * 60;
    this.updateDisplay();
    this.updateProgressBar();
  }

  /**
   * Get session type
   */
  public getCurrentSessionType(): 'work' | 'break' | 'longBreak' {
    if (this.state.isWorking) return 'work';
    return this.state.sessionCount % this.settings.sessions === 0 ? 'longBreak' : 'break';
  }

  /**
   * Get session progress percentage
   */
  public getProgress(): number {
    const totalDuration = this.state.isWorking 
      ? this.settings.work * 60 
      : this.settings.break * 60;
    
    return ((totalDuration - this.state.timeLeft) / totalDuration) * 100;
  }
}