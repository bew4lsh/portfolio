// Theme validation system for contrast ratios and color requirements
import type { Theme } from './themeLoader';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ContrastCheck {
  foreground: string;
  background: string;
  ratio: number;
  passes: {
    aa: boolean;
    aaa: boolean;
  };
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance for a color
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const sRGB = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if contrast meets WCAG standards
 */
export function checkContrast(foreground: string, background: string): ContrastCheck {
  const ratio = getContrastRatio(foreground, background);
  
  return {
    foreground,
    background,
    ratio,
    passes: {
      aa: ratio >= 4.5,  // WCAG AA standard
      aaa: ratio >= 7.0  // WCAG AAA standard
    }
  };
}

/**
 * Validate theme structure and required properties
 */
function validateThemeStructure(theme: Theme): string[] {
  const errors: string[] = [];

  // Check required accent colors
  if (!theme.colors?.accent) {
    errors.push('Missing accent color definition');
  } else {
    if (!theme.colors.accent.light) errors.push('Missing accent.light color');
    if (!theme.colors.accent.regular) errors.push('Missing accent.regular color');
    if (!theme.colors.accent.dark) errors.push('Missing accent.dark color');
  }

  // Check chart colors
  if (!theme.colors?.charts) {
    errors.push('Missing chart colors definition');
  } else {
    if (!theme.colors.charts.primary?.length) {
      errors.push('Missing primary chart colors');
    }
    if (!theme.colors.charts.categorical?.length) {
      errors.push('Missing categorical chart colors');
    }
    if (!theme.colors.charts.gradient?.length) {
      errors.push('Missing gradient chart colors');
    }
  }

  return errors;
}

/**
 * Validate color accessibility and contrast ratios
 */
function validateColorAccessibility(theme: Theme): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!theme.colors?.accent || !theme.colors?.gray) {
    return { errors: ['Cannot validate accessibility without complete color definitions'], warnings };
  }

  // Critical contrast checks for text readability
  const criticalChecks = [
    // Primary text on background
    { 
      name: 'Primary text contrast (light mode)',
      fg: theme.colors.gray['0'] || '#000000',
      bg: theme.colors.gray['999'] || '#ffffff'
    },
    // Secondary text on background
    {
      name: 'Secondary text contrast (light mode)',
      fg: theme.colors.gray['200'] || '#333333',
      bg: theme.colors.gray['999'] || '#ffffff'
    },
    // Accent on background
    {
      name: 'Accent on background contrast',
      fg: theme.colors.accent.regular,
      bg: theme.colors.gray['999'] || '#ffffff'
    }
  ];

  // Dark mode checks if gray colors are available
  if (theme.colors.gray['999'] && theme.colors.gray['0']) {
    criticalChecks.push(
      {
        name: 'Primary text contrast (dark mode)',
        fg: theme.colors.gray['999'],
        bg: theme.colors.gray['0']
      },
      {
        name: 'Secondary text contrast (dark mode)', 
        fg: theme.colors.gray['800'] || theme.colors.gray['700'] || '#cccccc',
        bg: theme.colors.gray['0']
      }
    );
  }

  criticalChecks.forEach(check => {
    const contrast = checkContrast(check.fg, check.bg);
    
    if (!contrast.passes.aa) {
      errors.push(`${check.name} fails WCAG AA (${contrast.ratio.toFixed(2)}:1, needs 4.5:1)`);
    } else if (!contrast.passes.aaa) {
      warnings.push(`${check.name} passes AA but fails AAA (${contrast.ratio.toFixed(2)}:1, AAA needs 7:1)`);
    }
  });

  return { errors, warnings };
}

/**
 * Validate color harmony and aesthetic quality
 */
function validateColorHarmony(theme: Theme): string[] {
  const warnings: string[] = [];

  if (!theme.colors?.accent) return warnings;

  // Check that accent variants have proper relationships
  const { light, regular, dark } = theme.colors.accent;
  
  const lightLum = getLuminance(light);
  const regularLum = getLuminance(regular);
  const darkLum = getLuminance(dark);

  // Warn if the luminance progression isn't logical
  if (lightLum <= regularLum) {
    warnings.push('Accent light should be lighter than regular');
  }
  if (regularLum <= darkLum) {
    warnings.push('Accent regular should be lighter than dark');
  }

  // Check chart color variety
  if (theme.colors.charts?.primary) {
    const primaryColors = theme.colors.charts.primary;
    if (primaryColors.length < 3) {
      warnings.push('Consider adding more primary chart colors for better variety');
    }
  }

  return warnings;
}

/**
 * Main theme validation function
 */
export function validateTheme(theme: Theme): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Structure validation
  errors.push(...validateThemeStructure(theme));

  // Accessibility validation
  if (errors.length === 0) { // Only check accessibility if structure is valid
    const accessibilityResult = validateColorAccessibility(theme);
    errors.push(...accessibilityResult.errors);
    warnings.push(...accessibilityResult.warnings);

    // Color harmony validation
    warnings.push(...validateColorHarmony(theme));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Batch validate multiple themes
 */
export function validateThemes(themes: Theme[]): { [themeId: string]: ValidationResult } {
  const results: { [themeId: string]: ValidationResult } = {};
  
  themes.forEach(theme => {
    results[theme.id] = validateTheme(theme);
  });

  return results;
}

/**
 * Generate validation report as formatted string
 */
export function generateValidationReport(results: { [themeId: string]: ValidationResult }): string {
  let report = 'Theme Validation Report\n';
  report += '='.repeat(50) + '\n\n';

  Object.entries(results).forEach(([themeId, result]) => {
    report += `Theme: ${themeId}\n`;
    report += '-'.repeat(20) + '\n';
    
    if (result.isValid) {
      report += '✅ Valid\n';
    } else {
      report += '❌ Invalid\n';
    }

    if (result.errors.length > 0) {
      report += '\nErrors:\n';
      result.errors.forEach(error => {
        report += `  • ${error}\n`;
      });
    }

    if (result.warnings.length > 0) {
      report += '\nWarnings:\n';
      result.warnings.forEach(warning => {
        report += `  ⚠ ${warning}\n`;
      });
    }

    report += '\n';
  });

  return report;
}