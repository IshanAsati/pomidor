import { NotificationOptions } from '../types/index.js';

/**
 * Notification utility functions
 */

let notificationsEnabled = false;

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    notificationsEnabled = true;
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notifications are blocked by the user');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    notificationsEnabled = permission === 'granted';
    return notificationsEnabled;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Show a notification
 */
export function showNotification(options: NotificationOptions): Notification | null {
  if (!notificationsEnabled || !('Notification' in window)) {
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo.png',
      tag: options.tag || 'pomidor',
      requireInteraction: options.requireInteraction || false,
      silent: false
    });

    // Auto-close after 5 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    return notification;
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Show session complete notification
 */
export function showSessionCompleteNotification(sessionType: 'work' | 'break' | 'longBreak'): void {
  const messages = {
    work: {
      title: '🍅 Pomodoro Complete!',
      body: 'Great job! Time for a well-deserved break.'
    },
    break: {
      title: '⏰ Break Time Over',
      body: 'Ready to get back to work? Let\'s focus!'
    },
    longBreak: {
      title: '🌟 Long Break Complete',
      body: 'You\'ve earned this rest. Ready for another productive session?'
    }
  };

  const message = messages[sessionType];
  showNotification({
    title: message.title,
    body: message.body,
    requireInteraction: true
  });
}

/**
 * Show task completion notification
 */
export function showTaskCompleteNotification(taskText: string): void {
  showNotification({
    title: '✅ Task Completed!',
    body: `"${taskText}" - Great work!`,
    tag: 'task-complete'
  });
}

/**
 * Show daily summary notification
 */
export function showDailySummaryNotification(
  completedPomodoros: number,
  completedTasks: number,
  focusTime: number
): void {
  const hours = Math.floor(focusTime / 60);
  const minutes = focusTime % 60;
  const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  showNotification({
    title: '📊 Daily Summary',
    body: `${completedPomodoros} pomodoros • ${completedTasks} tasks • ${timeText} focused`,
    tag: 'daily-summary'
  });
}

/**
 * Show motivation notification
 */
export function showMotivationNotification(): void {
  const motivationMessages = [
    '💪 You\'ve got this! Every minute counts.',
    '🎯 Stay focused on your goals.',
    '⭐ Small steps lead to big achievements.',
    '🚀 Keep pushing forward!',
    '🌟 Your future self will thank you.',
    '🔥 Consistency is the key to success.',
    '💡 Great things happen when you stay focused.'
  ];

  const randomMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)];

  showNotification({
    title: 'Motivation Boost',
    body: randomMessage,
    tag: 'motivation'
  });
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Initialize notifications
 */
export async function initializeNotifications(): Promise<boolean> {
  const permission = await requestNotificationPermission();
  
  if (permission) {
    console.log('Notifications initialized successfully');
    
    // Show welcome notification
    setTimeout(() => {
      showNotification({
        title: '🍅 Pomidor Ready!',
        body: 'Notifications are enabled. Start your first session!',
        tag: 'welcome'
      });
    }, 1000);
  }
  
  return permission;
}

/**
 * Disable notifications
 */
export function disableNotifications(): void {
  notificationsEnabled = false;
}

/**
 * Enable notifications (if permission is granted)
 */
export function enableNotifications(): boolean {
  if (Notification.permission === 'granted') {
    notificationsEnabled = true;
    return true;
  }
  return false;
}

/**
 * Check if notifications are currently enabled
 */
export function areNotificationsEnabled(): boolean {
  return notificationsEnabled;
}

/**
 * Schedule a delayed notification
 */
export function scheduleNotification(
  options: NotificationOptions,
  delayMs: number
): number {
  return window.setTimeout(() => {
    showNotification(options);
  }, delayMs);
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(timeoutId: number): void {
  clearTimeout(timeoutId);
}

/**
 * Play notification sound
 */
export function playNotificationSound(volume: number = 0.5): void {
  try {
    const audio = new Audio('https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3');
    audio.volume = Math.max(0, Math.min(1, volume / 100));
    audio.play().catch(error => {
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.warn('Error creating notification sound:', error);
  }
}