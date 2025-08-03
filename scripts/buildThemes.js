#!/usr/bin/env node

// Build-time theme CSS generation script
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = join(__dirname, '../src/content/themes');
const outputPath = join(__dirname, '../src/styles/themes.css');

// Simple theme CSS generation without full Astro environment
function generateThemeCSS(theme) {
  // Helper function for safe circular color access with fallback
  const getChartColor = (colors, index, fallback = '#7611a6') => {
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
  
  // Calculate hue rotation for image theming based on accent color
  const getThemeHueRotate = (theme) => {
    const themeHues = {
      'default': '280deg',        // Purple theme
      'ocean-blue': '200deg',     // Blue theme  
      'forest-green': '120deg',   // Green theme
      'catppuccin-latte': '350deg', // Pink/red theme
      'catppuccin-mocha': '260deg'  // Purple/pink theme
    };
    return themeHues[theme.id] || '0deg';
  };

  // Generate accent overlay colors for proper contrast
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const accentRgb = hexToRgb(theme.colors.accent.regular);
  const accentOverlay = accentRgb ? 
    `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.33)` :
    theme.colors.accent.regular + '55';
  
  // For dark themes (like Catppuccin Mocha), use the lightest gray for text over accents
  // For light themes, use the darkest gray
  const accentTextOver = theme.colors.gray ? 
    (theme.colors.gray['999'] && theme.colors.gray['999'].startsWith('#1') ? 
      theme.colors.gray['0'] : theme.colors.gray['999']) :
    '#ffffff';

  return `
    :root.theme-${theme.id} {
      --accent-light: ${theme.colors.accent.light};
      --accent-regular: ${theme.colors.accent.regular};
      --accent-dark: ${theme.colors.accent.dark};
      --accent-overlay: ${accentOverlay};
      --accent-subtle-overlay: ${accentOverlay};
      --accent-text-over: ${accentTextOver};
      
      /* Theme-aware background gradients */
      --bg-gradient-subtle: linear-gradient(135deg, ${theme.colors.accent.dark}15, transparent 50%, ${theme.colors.accent.light}08);
      --bg-gradient-hero: radial-gradient(ellipse 60% 50% at 50% 0%, ${theme.colors.accent.light}12, transparent 60%);
      --bg-gradient-footer: linear-gradient(180deg, ${theme.colors.accent.dark}08, ${theme.colors.accent.regular}15);
      
      /* Theme-aware image filters */
      --img-theme-filter: sepia(0.3) hue-rotate(${getThemeHueRotate(theme)}) saturate(0.8) brightness(1.1);
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

// Main generation function
console.log('🎨 Generating consolidated theme CSS...\n');

try {
  const themeFiles = readdirSync(themesDir).filter(file => file.endsWith('.json'));
  
  let consolidatedCSS = `/* 
 * Consolidated theme styles - Generated automatically
 * This file combines all theme CSS variables for optimal performance
 */

`;

  themeFiles.forEach(file => {
    const filePath = join(themesDir, file);
    const content = readFileSync(filePath, 'utf8');
    const theme = JSON.parse(content);
    
    // Add theme ID from filename if not present
    if (!theme.id) {
      theme.id = file.replace('.json', '');
    }
    
    consolidatedCSS += `/* ${theme.name} theme styles */`;
    consolidatedCSS += generateThemeCSS(theme);
    consolidatedCSS += '\n';
  });

  writeFileSync(outputPath, consolidatedCSS, 'utf8');
  console.log('✅ Generated consolidated theme CSS at:', outputPath);

} catch (error) {
  console.error('❌ Failed to generate theme CSS:', error);
  process.exit(1);
}