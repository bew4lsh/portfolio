#!/usr/bin/env node

// Theme validation script for build-time checks
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = join(__dirname, '../src/content/themes');

// Simple theme validation without full Astro environment
function validateThemeFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const theme = JSON.parse(content);
    
    const errors = [];
    const warnings = [];

    // Basic structure validation
    if (!theme.name) errors.push('Missing theme name');
    if (!theme.id) errors.push('Missing theme id');
    if (!theme.colors) errors.push('Missing colors object');
    
    if (theme.colors) {
      // Accent colors
      if (!theme.colors.accent) {
        errors.push('Missing accent colors');
      } else {
        if (!theme.colors.accent.light) errors.push('Missing accent.light');
        if (!theme.colors.accent.regular) errors.push('Missing accent.regular');
        if (!theme.colors.accent.dark) errors.push('Missing accent.dark');
      }

      // Chart colors
      if (!theme.colors.charts) {
        errors.push('Missing chart colors');
      } else {
        if (!theme.colors.charts.primary?.length) errors.push('Missing primary chart colors');
        if (!theme.colors.charts.categorical?.length) errors.push('Missing categorical chart colors');
        if (!theme.colors.charts.gradient?.length) errors.push('Missing gradient chart colors');
      }

      // Gray colors recommendation
      if (!theme.colors.gray) {
        warnings.push('Missing gray colors - theme may not provide complete visual transformation');
      }
    }

    // Hex color validation
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    function validateHexColors(obj, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && key !== 'name' && key !== 'id' && key !== 'description' && key !== 'author') {
          if (!hexRegex.test(value)) {
            errors.push(`Invalid hex color at ${currentPath}: ${value}`);
          }
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string' && !hexRegex.test(item)) {
              errors.push(`Invalid hex color at ${currentPath}[${index}]: ${item}`);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          validateHexColors(value, currentPath);
        }
      }
    }

    if (theme.colors) {
      validateHexColors(theme.colors, 'colors');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse theme file: ${error.message}`],
      warnings: []
    };
  }
}

// Main validation
console.log('🎨 Validating theme files...\n');

const themeFiles = readdirSync(themesDir).filter(file => file.endsWith('.json'));
let totalValid = 0;
let totalInvalid = 0;

themeFiles.forEach(file => {
  const filePath = join(themesDir, file);
  const result = validateThemeFile(filePath);
  
  console.log(`Theme: ${file}`);
  console.log('-'.repeat(30));
  
  if (result.isValid) {
    console.log('✅ Valid');
    totalValid++;
  } else {
    console.log('❌ Invalid');
    totalInvalid++;
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
  }

  console.log('\n');
});

console.log('='.repeat(50));
console.log(`Summary: ${totalValid} valid, ${totalInvalid} invalid`);

if (totalInvalid > 0) {
  process.exit(1);
}