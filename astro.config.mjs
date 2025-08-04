// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	// Configure for GitHub Pages deployment
	site: 'https://bew4lsh.github.io',
	base: '/portfolio',
	integrations: [sitemap()],
	markdown: {
		shikiConfig: {
			// Use dual themes for light/dark mode support with CSS variables
			// https://shiki.style/guide/dual-themes
			themes: {
				light: 'github-light',
				dark: 'github-dark',
			},
			// Add custom languages
			// Note: Shiki has countless langs built-in, including .astro!
			// https://github.com/shikijs/shiki/blob/main/docs/languages.md
			langs: ['python', 'sql', 'r', 'javascript', 'typescript', 'bash', 'astro'],
			// Enable word wrap to prevent horizontal scrolling
			wrap: true,
			// Generate CSS variables for theme integration
			defaultColor: false,
		},
	},
});
