import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
	work: defineCollection({
		// Load Markdown files in the src/content/work directory.
		loader: glob({ base: './src/content/work', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			tags: z.array(z.string()),
			img: z.string(),
			img_alt: z.string().optional(),
			featured: z.boolean().default(false),
			github: z.string().optional(),
			demo: z.string().optional(),
			tools: z.array(z.string()).optional(),
			hasCharts: z.boolean().optional(),
		}),
	}),
	blog: defineCollection({
		// Load Markdown files in the src/content/blog directory.
		loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			description: z.string(),
			publishDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()),
			img: z.string().optional(),
			img_alt: z.string().optional(),
			draft: z.boolean().default(false),
			featured: z.boolean().default(false),
			category: z.string().optional(),
		}),
	}),
	themes: defineCollection({
		loader: glob({ base: './src/content/themes', pattern: '**/*.json' }),
		schema: z.object({
			name: z.string(),
			id: z.string(),
			description: z.string(),
			author: z.string().optional(),
			colors: z.object({
				accent: z.object({
					light: z.string(),
					regular: z.string(),
					dark: z.string()
				}),
				charts: z.object({
					primary: z.array(z.string()),
					categorical: z.array(z.string()),
					gradient: z.array(z.string())
				})
			})
		})
	})
};
