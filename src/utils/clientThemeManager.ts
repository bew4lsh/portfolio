// Client-side unified theme management system
export interface ThemeState {
  colorTheme: string;
  darkMode: boolean;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private state: ThemeState = { colorTheme: 'default', darkMode: false };
  
  private constructor() {
    if (typeof document !== 'undefined') {
      this.loadState();
      this.initializePostRender();
    }
  }
  
  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }
  
  private loadState(): void {
    // Sync with existing DOM state (set by inline script)
    const docClass = document.documentElement.classList;
    this.state.darkMode = docClass.contains('theme-dark');
    
    // Extract color theme from existing classes
    const colorThemeClass = Array.from(docClass)
      .find(cls => cls.startsWith('theme-') && cls !== 'theme-dark');
    this.state.colorTheme = colorThemeClass ? 
      colorThemeClass.replace('theme-', '') : 'default';
  }
  
  private initializePostRender(): void {
    // Set up persistence observer after initial load
    if (typeof localStorage !== 'undefined') {
      const observer = new MutationObserver(() => {
        this.persistState();
      });
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
    }
  }
  
  private getStoredValue(key: string, fallback: string): string {
    try {
      return localStorage?.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }
  
  private applyState(): void {
    if (typeof document === 'undefined') return;
    
    const classList = document.documentElement.classList;
    
    // Apply dark mode
    classList.toggle('theme-dark', this.state.darkMode);
    
    // Remove existing color theme classes (but preserve theme-dark)
    const existingColorThemes = Array.from(classList).filter(cls => 
      cls.startsWith('theme-') && cls !== 'theme-dark'
    );
    existingColorThemes.forEach(theme => classList.remove(theme));
    
    // Add current color theme
    classList.add(`theme-${this.state.colorTheme}`);
  }
  
  private persistState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', this.state.darkMode ? 'dark' : 'light');
        localStorage.setItem('selected-theme', this.state.colorTheme);
      }
    } catch (error) {
      // Silently handle localStorage errors (e.g., storage quota exceeded, private browsing)
      console.warn('Failed to persist theme preferences:', error);
    }
  }
  
  private dispatchEvents(): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('theme-changed', {
        detail: this.state
      }));
    }
  }
  
  // Public API
  public getState(): ThemeState {
    return { ...this.state };
  }
  
  public setColorTheme(themeId: string): void {
    // Validate theme ID exists (basic validation)
    if (!themeId || typeof themeId !== 'string') {
      console.warn('Invalid theme ID provided:', themeId);
      return;
    }
    
    // Sanitize theme ID to prevent CSS injection
    const sanitizedThemeId = themeId.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedThemeId !== themeId) {
      console.warn('Theme ID sanitized from', themeId, 'to', sanitizedThemeId);
    }
    
    if (this.state.colorTheme !== sanitizedThemeId) {
      this.state.colorTheme = sanitizedThemeId;
      this.applyState();
      this.persistState();
      this.dispatchEvents();
    }
  }
  
  public setDarkMode(isDark: boolean): void {
    if (this.state.darkMode !== isDark) {
      this.state.darkMode = isDark;
      this.applyState();
      this.persistState();
      this.dispatchEvents();
    }
  }
  
  public toggleDarkMode(): boolean {
    this.setDarkMode(!this.state.darkMode);
    return this.state.darkMode;
  }
  
  public getCurrentColorTheme(): string {
    return this.state.colorTheme;
  }
  
  public isDarkMode(): boolean {
    return this.state.darkMode;
  }
}

// Enhanced error handling utilities
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function getThemeWithFallback(key: string, fallback: string): string {
  try {
    return localStorage?.getItem(key) || fallback;
  } catch (error) {
    console.warn(`Failed to access localStorage for key "${key}":`, error);
    return fallback;
  }
}

// Legacy compatibility functions (for gradual migration)
export function getCurrentTheme(): string {
  return ThemeManager.getInstance().getCurrentColorTheme();
}

export function applyTheme(themeId: string): void {
  ThemeManager.getInstance().setColorTheme(themeId);
}

export function getStoredTheme(): string {
  return ThemeManager.getInstance().getCurrentColorTheme();
}