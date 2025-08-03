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
    }
  }
  
  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }
  
  private loadState(): void {
    // Load dark mode preference
    const darkPreference = this.getStoredDarkMode();
    this.state.darkMode = darkPreference === 'dark';
    
    // Load color theme preference  
    this.state.colorTheme = this.getStoredColorTheme();
    
    this.applyState();
  }
  
  private getStoredDarkMode(): string {
    if (typeof localStorage === 'undefined') {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return localStorage.getItem('theme') || 
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  
  private getStoredColorTheme(): string {
    if (typeof localStorage === 'undefined') return 'default';
    return localStorage.getItem('selected-theme') || 'default';
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', this.state.darkMode ? 'dark' : 'light');
      localStorage.setItem('selected-theme', this.state.colorTheme);
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
    if (this.state.colorTheme !== themeId) {
      this.state.colorTheme = themeId;
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