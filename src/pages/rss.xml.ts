import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  try {
    const posts = await getCollection('blog');
    
    // Filter out draft posts and sort by date
    const publishedPosts = posts
      .filter(post => !post.data.draft && post.data.publishDate)
      .sort((a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf());

    return rss({
      title: 'Lia | Data Analyst Blog',
      description: 'Insights and tutorials on data analysis, visualization, and data science techniques.',
      site: context.site || 'https://bew4lsh.github.io/portfolio/',
      items: publishedPosts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.publishDate,
        link: `/blog/${post.slug}/`,
        categories: post.data.tags,
        ...(post.data.category && { category: post.data.category }),
      })),
      customData: `<language>en-us</language>`,
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
}