// Build-time theme CSS generation utility
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadThemes, generateThemeCSS } from './themeLoader';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function generateConsolidatedThemeCSS(): Promise<string> {
  const themes = await loadThemes();
  
  let consolidatedCSS = `/* 
 * Consolidated theme styles - Generated automatically
 * This file combines all theme CSS variables for optimal performance
 */\n\n`;

  themes.forEach(theme => {
    consolidatedCSS += `/* ${theme.name} theme styles */\n`;
    consolidatedCSS += generateThemeCSS(theme);
    consolidatedCSS += '\n';
  });

  return consolidatedCSS;
}

// Build script function
export async function buildThemeCSS(): Promise<void> {
  try {
    const css = await generateConsolidatedThemeCSS();
    const outputPath = join(__dirname, '../styles/themes.css');
    
    writeFileSync(outputPath, css, 'utf8');
    console.log('✅ Generated consolidated theme CSS at:', outputPath);
  } catch (error) {
    console.error('❌ Failed to generate theme CSS:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildThemeCSS();
}