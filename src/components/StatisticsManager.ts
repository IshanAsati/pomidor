import { Statistics, SessionData, ProductivityReport, Elements } from '../types/index.js';
import { loadStatistics, saveStatistics, loadSessions, saveSessions } from '../utils/storage.js';
import { formatDuration, generateInsights, calculateProductivityScore, getCurrentWeek, isToday } from '../utils/time.js';

/**
 * Statistics Manager component class
 */
export class StatisticsManager {
  private statistics: Statistics;
  private sessions: SessionData[] = [];
  private elements: Elements;

  constructor(elements: Elements) {
    this.elements = elements;
    this.statistics = loadStatistics();
    this.sessions = loadSessions();
    this.initializeDisplay();
    this.updateDisplay();
  }

  /**
   * Initialize statistics display
   */
  private initializeDisplay(): void {
    // Update display immediately with loaded data
    this.updateDisplay();
  }

  /**
   * Record a completed session
   */
  public recordSession(
    type: 'work' | 'break' | 'longBreak',
    duration: number,
    completed: boolean = true,
    interruptions: number = 0
  ): void {
    const session: SessionData = {
      id: Date.now().toString(),
      type,
      duration,
      startTime: new Date(Date.now() - duration * 60 * 1000),
      endTime: new Date(),
      completed,
      interruptions
    };

    this.sessions.push(session);

    // Update statistics
    if (completed && type === 'work') {
      this.statistics.pomodoros++;
      this.statistics.focusTime += duration;
      this.statistics.totalSessions++;
      
      if (isToday(session.endTime)) {
        this.statistics.sessionsToday++;
      }
    }

    // Calculate average session length
    const completedWorkSessions = this.sessions.filter(s => s.type === 'work' && s.completed);
    if (completedWorkSessions.length > 0) {
      this.statistics.averageSessionLength = Math.round(
        completedWorkSessions.reduce((sum, s) => sum + s.duration, 0) / completedWorkSessions.length
      );
    }

    // Calculate productivity score
    this.updateProductivityScore();

    this.saveData();
    this.updateDisplay();
  }

  /**
   * Update productivity score
   */
  private updateProductivityScore(): void {
    const todaySessions = this.sessions.filter(s => isToday(s.endTime) && s.type === 'work');
    const completedToday = todaySessions.filter(s => s.completed).length;
    const targetSessions = 8; // Target 8 pomodoros per day
    
    // Get completed tasks count (this would be updated by TaskManager)
    const completedTasks = parseInt(localStorage.getItem('completedTasks') || '0');
    const targetTasks = 5; // Target 5 tasks per day

    this.statistics.productivityScore = calculateProductivityScore(
      completedToday,
      targetSessions,
      completedTasks,
      targetTasks
    );
  }

  /**
   * Update statistics display
   */
  private updateDisplay(): void {
    if (this.elements.statistics.pomodoros) {
      this.elements.statistics.pomodoros.textContent = this.statistics.pomodoros.toString();
    }

    if (this.elements.statistics.focusTime) {
      this.elements.statistics.focusTime.textContent = formatDuration(this.statistics.focusTime);
    }

    if (this.elements.statistics.tasks) {
      const completedTasks = parseInt(localStorage.getItem('completedTasks') || '0');
      this.elements.statistics.tasks.textContent = completedTasks.toString();
    }

    // Update additional statistics if elements exist
    this.updateExtendedDisplay();
  }

  /**
   * Update extended statistics display
   */
  private updateExtendedDisplay(): void {
    // This method can be extended to update additional statistics displays
    // such as productivity score, weekly goals, etc.
    
    const scoreElement = document.getElementById('productivityScore');
    if (scoreElement) {
      scoreElement.textContent = `${this.statistics.productivityScore}%`;
    }

    const sessionsElement = document.getElementById('sessionsToday');
    if (sessionsElement) {
      sessionsElement.textContent = this.statistics.sessionsToday.toString();
    }

    const averageElement = document.getElementById('averageSession');
    if (averageElement) {
      averageElement.textContent = `${this.statistics.averageSessionLength}m`;
    }
  }

  /**
   * Get daily report
   */
  public getDailyReport(date: Date = new Date()): ProductivityReport {
    const daySessions = this.sessions.filter(session => 
      session.endTime.toDateString() === date.toDateString()
    );

    const workSessions = daySessions.filter(s => s.type === 'work' && s.completed);
    const totalFocusTime = workSessions.reduce((sum, s) => sum + s.duration, 0);
    const completedPomodoros = workSessions.length;
    
    // Get tasks completed today (this would need integration with TaskManager)
    const completedTasks = isToday(date) ? 
      parseInt(localStorage.getItem('completedTasks') || '0') : 0;

    const productivityScore = calculateProductivityScore(
      completedPomodoros,
      8, // Target pomodoros
      completedTasks,
      5  // Target tasks
    );

    const insights = generateInsights(totalFocusTime, completedPomodoros, completedTasks);

    return {
      date,
      sessions: daySessions,
      totalFocusTime,
      completedPomodoros,
      completedTasks,
      productivityScore,
      insights
    };
  }

  /**
   * Get weekly report
   */
  public getWeeklyReport(): ProductivityReport {
    const { start, end } = getCurrentWeek();
    
    const weekSessions = this.sessions.filter(session => 
      session.endTime >= start && session.endTime <= end
    );

    const workSessions = weekSessions.filter(s => s.type === 'work' && s.completed);
    const totalFocusTime = workSessions.reduce((sum, s) => sum + s.duration, 0);
    const completedPomodoros = workSessions.length;
    
    // This would need integration with TaskManager for accurate task counts
    const completedTasks = parseInt(localStorage.getItem('completedTasks') || '0');

    const productivityScore = calculateProductivityScore(
      completedPomodoros,
      56, // Target: 8 pomodoros × 7 days
      completedTasks,
      35  // Target: 5 tasks × 7 days
    );

    const insights = [
      `This week you completed ${completedPomodoros} focus sessions`,
      `Total focus time: ${formatDuration(totalFocusTime)}`,
      completedPomodoros >= 28 ? '🎉 Excellent weekly productivity!' : '💪 Keep building your focus habit',
      ...generateInsights(totalFocusTime, completedPomodoros, completedTasks)
    ];

    return {
      date: new Date(),
      sessions: weekSessions,
      totalFocusTime,
      completedPomodoros,
      completedTasks,
      productivityScore,
      insights
    };
  }

  /**
   * Get focus time by day of week
   */
  public getFocusTimeByDay(): { [key: string]: number } {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const focusByDay: { [key: string]: number } = {};

    dayNames.forEach(day => {
      focusByDay[day] = 0;
    });

    this.sessions
      .filter(s => s.type === 'work' && s.completed)
      .forEach(session => {
        const dayName = dayNames[session.endTime.getDay()];
        focusByDay[dayName] += session.duration;
      });

    return focusByDay;
  }

  /**
   * Get peak productivity hours
   */
  public getPeakHours(): { hour: number; sessions: number }[] {
    const hourCounts: { [hour: number]: number } = {};

    this.sessions
      .filter(s => s.type === 'work' && s.completed)
      .forEach(session => {
        const hour = session.startTime.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

    return Object.entries(hourCounts)
      .map(([hour, sessions]) => ({ hour: parseInt(hour), sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 3); // Top 3 hours
  }

  /**
   * Get streak information
   */
  public getStreaks(): { current: number; longest: number } {
    if (this.sessions.length === 0) {
      return { current: 0, longest: 0 };
    }

    const workSessions = this.sessions
      .filter(s => s.type === 'work' && s.completed)
      .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    workSessions.forEach(session => {
      const sessionDate = new Date(session.endTime.toDateString());
      
      if (lastDate) {
        const dayDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          tempStreak++;
        } else if (dayDiff === 0) {
          // Same day, continue streak
        } else {
          // Streak broken
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      
      lastDate = sessionDate;
    });

    longestStreak = Math.max(longestStreak, tempStreak);
    
    // Calculate current streak
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const lastSessionDate = workSessions[workSessions.length - 1]?.endTime.toDateString();
    
    if (lastSessionDate === today || lastSessionDate === yesterday) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Reset daily statistics (call at midnight)
   */
  public resetDailyStats(): void {
    this.statistics.sessionsToday = 0;
    this.saveData();
    this.updateDisplay();
  }

  /**
   * Export statistics data
   */
  public exportData(): { statistics: Statistics; sessions: SessionData[] } {
    return {
      statistics: { ...this.statistics },
      sessions: [...this.sessions]
    };
  }

  /**
   * Import statistics data
   */
  public importData(data: { statistics: Statistics; sessions: SessionData[] }): void {
    if (data.statistics) {
      this.statistics = { ...data.statistics };
    }
    if (data.sessions) {
      this.sessions = data.sessions.map(session => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime)
      }));
    }
    this.saveData();
    this.updateDisplay();
  }

  /**
   * Save data to storage
   */
  private saveData(): void {
    saveStatistics(this.statistics);
    saveSessions(this.sessions);
  }

  /**
   * Get current statistics
   */
  public getStatistics(): Statistics {
    return { ...this.statistics };
  }

  /**
   * Get all sessions
   */
  public getSessions(): SessionData[] {
    return [...this.sessions];
  }

  /**
   * Clear all statistics
   */
  public clearAllStats(): void {
    this.statistics = {
      pomodoros: 0,
      completedTasks: 0,
      focusTime: 0,
      sessionsToday: 0,
      totalSessions: 0,
      averageSessionLength: 25,
      productivityScore: 0
    };
    this.sessions = [];
    this.saveData();
    this.updateDisplay();
  }

  /**
   * Update task completion count
   */
  public updateTaskCount(completedTasks: number): void {
    this.statistics.completedTasks = completedTasks;
    this.updateProductivityScore();
    this.saveData();
    this.updateDisplay();
  }
}