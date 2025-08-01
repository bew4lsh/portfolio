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
			// Choose from Shiki's built-in themes (or add your own)
			// https://github.com/shikijs/shiki/blob/main/docs/themes.md
			theme: 'github-dark',
			// Add custom languages
			// Note: Shiki has countless langs built-in, including .astro!
			// https://github.com/shikijs/shiki/blob/main/docs/languages.md
			langs: ['python', 'sql', 'r', 'javascript', 'typescript', 'bash'],
			// Enable word wrap to prevent horizontal scrolling
			wrap: true,
		},
	},
});
