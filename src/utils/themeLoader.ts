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
  // Helper function for safe circular color access with fallback
  const getChartColor = (colors: string[], index: number, fallback = '#7611a6'): string => {
    if (!colors || colors.length === 0) return fallback;
    return colors[index % colors.length] || fallback;
  };

  const grayVars = theme.colors.gray ? `
      --gray-0: ${theme.colors.gray['0']};
      --gray-50: ${theme.colors.gray['50']};
      --gray-100: ${theme.colors.gray['100']};
      --gray-200: ${theme.colors.gray['200']};
      --gray-300: ${theme.colors.gray['300']};
      --gray-400: ${theme.colors.gray['400']};
      --gray-500: ${theme.colors.gray['500']};
      --gray-600: ${theme.colors.gray['600']};
      --gray-700: ${theme.colors.gray['700']};
      --gray-800: ${theme.colors.gray['800']};
      --gray-900: ${theme.colors.gray['900']};
      --gray-999: ${theme.colors.gray['999']};
  ` : '';

  const { primary, categorical, gradient } = theme.colors.charts;

  return `
    :root.theme-${theme.id} {
      --accent-light: ${theme.colors.accent.light};
      --accent-regular: ${theme.colors.accent.regular};
      --accent-dark: ${theme.colors.accent.dark};
      ${grayVars}
      --chart-color-1: ${getChartColor(primary, 0)};
      --chart-color-2: ${getChartColor(primary, 1)};
      --chart-color-3: ${getChartColor(primary, 2)};
      --chart-color-4: ${getChartColor(primary, 3)};
      --chart-color-5: ${getChartColor(primary, 4)};
      
      --chart-categorical-1: ${getChartColor(categorical, 0)};
      --chart-categorical-2: ${getChartColor(categorical, 1)};
      --chart-categorical-3: ${getChartColor(categorical, 2)};
      --chart-categorical-4: ${getChartColor(categorical, 3)};
      --chart-categorical-5: ${getChartColor(categorical, 4)};
      --chart-categorical-6: ${getChartColor(categorical, 5)};
      --chart-categorical-7: ${getChartColor(categorical, 6)};
      --chart-categorical-8: ${getChartColor(categorical, 7)};
      
      --gradient-stop-1: ${getChartColor(gradient, 0)};
      --gradient-stop-2: ${getChartColor(gradient, 1)};
      --gradient-stop-3: ${getChartColor(gradient, 2)};
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

