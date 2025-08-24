/**
 * Internationalization (i18n) utility
 */

import { Language } from '../types/index.js';

interface TranslationData {
  [key: string]: any;
}

class I18n {
  private currentLanguage: Language = 'en';
  private translations: Map<Language, TranslationData> = new Map();
  private fallbackLanguage: Language = 'en';

  constructor() {
    this.loadSavedLanguage();
    this.loadDefaultTranslations();
  }

  /**
   * Load saved language from storage
   */
  private loadSavedLanguage(): void {
    const saved = localStorage.getItem('pomidor_language');
    if (saved && this.isValidLanguage(saved)) {
      this.currentLanguage = saved as Language;
    } else {
      // Detect browser language
      const browserLang = navigator.language.slice(0, 2);
      if (this.isValidLanguage(browserLang)) {
        this.currentLanguage = browserLang as Language;
      }
    }
  }

  /**
   * Check if language code is valid
   */
  private isValidLanguage(lang: string): boolean {
    const supportedLanguages: Language[] = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
    return supportedLanguages.includes(lang as Language);
  }

  /**
   * Load default translations
   */
  private async loadDefaultTranslations(): Promise<void> {
    try {
      // Load English (default)
      const enModule = await import('./locales/en.json');
      this.translations.set('en', enModule.default);

      // Load Spanish
      const esModule = await import('./locales/es.json');
      this.translations.set('es', esModule.default);

      // Load other languages on demand
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  /**
   * Load additional language
   */
  public async loadLanguage(language: Language): Promise<boolean> {
    if (this.translations.has(language)) {
      return true;
    }

    try {
      const module = await import(`./locales/${language}.json`);
      this.translations.set(language, module.default);
      return true;
    } catch (error) {
      console.error(`Failed to load language ${language}:`, error);
      return false;
    }
  }

  /**
   * Set current language
   */
  public async setLanguage(language: Language): Promise<boolean> {
    if (!this.isValidLanguage(language)) {
      return false;
    }

    // Load language if not already loaded
    const loaded = await this.loadLanguage(language);
    if (!loaded) {
      return false;
    }

    this.currentLanguage = language;
    localStorage.setItem('pomidor_language', language);
    
    // Update document language
    document.documentElement.lang = language;
    
    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language } 
    }));

    return true;
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Get translation for a key
   */
  public t(key: string, variables?: Record<string, string | number>): string {
    const translation = this.getTranslation(key, this.currentLanguage) || 
                       this.getTranslation(key, this.fallbackLanguage) || 
                       key;

    // Replace variables in translation
    if (variables && typeof translation === 'string') {
      return this.interpolate(translation, variables);
    }

    return translation;
  }

  /**
   * Get translation from specific language
   */
  private getTranslation(key: string, language: Language): string | null {
    const translations = this.translations.get(language);
    if (!translations) {
      return null;
    }

    // Support nested keys like 'app.title'
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * Interpolate variables in translation
   */
  private interpolate(template: string, variables: Record<string, string | number>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return key in variables ? String(variables[key]) : match;
    });
  }

  /**
   * Get available languages
   */
  public getAvailableLanguages(): Language[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Check if language is loaded
   */
  public isLanguageLoaded(language: Language): boolean {
    return this.translations.has(language);
  }

  /**
   * Get language display name
   */
  public getLanguageDisplayName(language: Language): string {
    const displayNames: Record<Language, string> = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文',
      'ja': '日本語'
    };
    return displayNames[language] || language;
  }

  /**
   * Format number according to current locale
   */
  public formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLanguage, options).format(number);
  }

  /**
   * Format date according to current locale
   */
  public formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  public formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    try {
      const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, { numeric: 'auto' });
      
      if (diffDays > 0) {
        return rtf.format(-diffDays, 'day');
      } else if (diffHours > 0) {
        return rtf.format(-diffHours, 'hour');
      } else if (diffMinutes > 0) {
        return rtf.format(-diffMinutes, 'minute');
      } else {
        return rtf.format(0, 'second');
      }
    } catch (error) {
      // Fallback for unsupported browsers
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffMinutes > 0) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else {
        return 'just now';
      }
    }
  }
}

// Create singleton instance
export const i18n = new I18n();

// Global translation function
export const t = (key: string, variables?: Record<string, string | number>): string => 
  i18n.t(key, variables);

// Export types
export type { Language };