import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Theme = CollectionEntry<'themes'>['data'] & { id: string };

export async function loadThemes(): Promise<Theme[]> {
  const themes = await getCollection('themes');
  return themes.map(theme => ({
    ...theme.data,
    id: theme.id
  }));
}

export function generateThemeCSS(theme: Theme): string {
  return `
    :root.theme-${theme.id} {
      --accent-light: ${theme.colors.accent.light};
      --accent-regular: ${theme.colors.accent.regular};
      --accent-dark: ${theme.colors.accent.dark};
      
      --chart-color-1: ${theme.colors.charts.primary[0]};
      --chart-color-2: ${theme.colors.charts.primary[1]};
      --chart-color-3: ${theme.colors.charts.primary[2]};
      --chart-color-4: ${theme.colors.charts.primary[3] || theme.colors.charts.primary[0]};
      --chart-color-5: ${theme.colors.charts.primary[4] || theme.colors.charts.primary[1]};
      
      --chart-categorical-1: ${theme.colors.charts.categorical[0]};
      --chart-categorical-2: ${theme.colors.charts.categorical[1]};
      --chart-categorical-3: ${theme.colors.charts.categorical[2]};
      --chart-categorical-4: ${theme.colors.charts.categorical[3]};
      --chart-categorical-5: ${theme.colors.charts.categorical[4]};
      --chart-categorical-6: ${theme.colors.charts.categorical[5] || theme.colors.charts.categorical[0]};
      --chart-categorical-7: ${theme.colors.charts.categorical[6] || theme.colors.charts.categorical[1]};
      --chart-categorical-8: ${theme.colors.charts.categorical[7] || theme.colors.charts.categorical[2]};
      
      --gradient-stop-1: ${theme.colors.charts.gradient[0]};
      --gradient-stop-2: ${theme.colors.charts.gradient[1]};
      --gradient-stop-3: ${theme.colors.charts.gradient[2]};
    }
  `;
}

export function getThemeChartColors(theme: Theme) {
  return {
    primary: theme.colors.charts.primary,
    categorical: theme.colors.charts.categorical,
    gradient: theme.colors.charts.gradient,
    // CSS variable references for dynamic use
    primaryVars: [
      'var(--chart-color-1)',
      'var(--chart-color-2)', 
      'var(--chart-color-3)',
      'var(--chart-color-4)',
      'var(--chart-color-5)'
    ],
    categoricalVars: [
      'var(--chart-categorical-1)',
      'var(--chart-categorical-2)',
      'var(--chart-categorical-3)',
      'var(--chart-categorical-4)',
      'var(--chart-categorical-5)',
      'var(--chart-categorical-6)',
      'var(--chart-categorical-7)',
      'var(--chart-categorical-8)'
    ]
  };
}

export function getCurrentTheme(): string {
  if (typeof document === 'undefined') return 'default';
  
  // Check for theme class on document element
  const classList = document.documentElement.classList;
  for (const className of classList) {
    if (className.startsWith('theme-')) {
      return className.replace('theme-', '');
    }
  }
  
  return 'default';
}

export function applyTheme(themeId: string): void {
  if (typeof document === 'undefined') return;
  
  // Remove existing theme classes
  const classList = document.documentElement.classList;
  const existingThemes = Array.from(classList).filter(cls => cls.startsWith('theme-'));
  existingThemes.forEach(theme => classList.remove(theme));
  
  // Add new theme class
  classList.add(`theme-${themeId}`);
  
  // Save to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('selected-theme', themeId);
  }
  
  // Dispatch custom event for components to listen to
  document.dispatchEvent(new CustomEvent('theme-changed', { 
    detail: { themeId } 
  }));
}

export function getStoredTheme(): string {
  if (typeof localStorage === 'undefined') return 'default';
  return localStorage.getItem('selected-theme') || 'default';
}