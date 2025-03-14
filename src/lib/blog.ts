import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import remarkGfm from 'remark-gfm'

const postsDirectory = path.join(process.cwd(), 'src/app/departments/posts')

export type BlogPost = {
  id: string
  title: string
  date: string
  excerpt: string
  content: string
  image?: string
  sources?: { id: string; url: string; text: string }[]
}

function cleanContent(content: string): string {
  return content
    .replace(/^###\s*{{\s*page\.title\s*}}/, '')  // Remove Jekyll title
    .replace(/{{\s*.*?\s*}}/g, '')  // Remove any remaining Jekyll templating
    .replace(/src=["']\/assets\/img\//g, 'src="/')  // Update image paths
    .trim()  // Remove any leading/trailing whitespace
}

/**
 * Process sources section in markdown content
 * Looks for a "Sources:" section and formats the numbered references that follow
 */
function processSources(content: string): { 
  processedContent: string; 
  sources: { id: string; url: string; text: string }[] 
} {
  const sources: { id: string; url: string; text: string }[] = [];
  
  // Check if there's a Sources: section
  const sourcesMatch = content.match(/(?:^|\n)Sources:\s*\n((?:.|\n)*?)(?:\n\n|$)/i);
  
  if (!sourcesMatch) {
    return { processedContent: content, sources };
  }
  
  const sourcesSection = sourcesMatch[1];
  let processedContent = content;
  
  // Extract numbered references like [1], [2], etc.
  // Updated regex to better match different source formats
  const sourceLines = sourcesSection.split('\n');
  
  sourceLines.forEach(line => {
    // Match lines that start with [number]
    const sourceMatch = line.match(/^\s*\[(\d+)\]\s*(https?:\/\/[^\s]+)(?:\s+(.*))?$/);
    if (sourceMatch) {
      const id = sourceMatch[1];
      const url = sourceMatch[2];
      const text = sourceMatch[3] || '';
      
      sources.push({ id, url, text });
    }
  });
  
  // If we found sources, replace the sources section with a formatted version
  if (sources.length > 0) {
    // Create a formatted sources section
    let formattedSources = '## Sources\n\n<div class="sources-list">\n';
    
    sources.forEach(source => {
      formattedSources += `<div class="source-item" id="source-${source.id}">\n`;
      formattedSources += `  <span class="source-number">[${source.id}]</span>\n`;
      formattedSources += `  <a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.url}</a>\n`;
      if (source.text) {
        formattedSources += `  <span class="source-description">${source.text}</span>\n`;
      }
      formattedSources += '</div>\n';
    });
    
    formattedSources += '</div>';
    
    // Replace the original sources section
    processedContent = processedContent.replace(sourcesMatch[0], formattedSources);
    
    // Also enhance references in the text [n] to be clickable links to the sources
    sources.forEach(source => {
      const refRegex = new RegExp(`\\[${source.id}\\](?!\\(|:)`, 'g');
      processedContent = processedContent.replace(
        refRegex, 
        `<a href="#source-${source.id}" class="source-reference">[${source.id}]</a>`
      );
    });
  }
  
  return { processedContent, sources };
}

async function processMarkdown(content: string): Promise<{ html: string; sources: { id: string; url: string; text: string }[] }> {
  // Process sources before markdown conversion
  const { processedContent, sources } = processSources(content);
  
  const result = await remark()
    .use(remarkGfm)  // Support GFM (tables, strikethrough, etc)
    .use(html, { 
      sanitize: false, // Don't sanitize to allow custom HTML
      allowDangerousHtml: true // Allow HTML to pass through
    })
    .process(processedContent)
  
  return { 
    html: result.toString(),
    sources
  };
}

function extractExcerpt(content: string): string {
  // Remove markdown headers and Jekyll templating
  const cleanContent = content
    .replace(/^###\s*{{\s*page\.title\s*}}/, '')  // Remove Jekyll title
    .replace(/^#+\s*.*$/gm, '')  // Remove any markdown headers
    .replace(/{{\s*.*?\s*}}/g, '')  // Remove any remaining Jekyll templating
  
  // Remove any HTML tags
  const textContent = cleanContent.replace(/<[^>]*>/g, '')
  
  // Split into paragraphs
  const paragraphs = textContent.split('\n\n')
  
  // Find first non-empty paragraph
  const firstParagraph = paragraphs.find(p => p.trim().length > 0) || ''
  
  // Limit to ~200 characters while keeping whole words
  if (firstParagraph.length > 200) {
    return firstParagraph.substr(0, 200).split(' ').slice(0, -1).join(' ') + '...'
  }
  
  return firstParagraph
}

export async function getAllPosts(): Promise<BlogPost[]> {
  // Get file names under /posts
  const fileNames = fs.readdirSync(postsDirectory)
  const allPostsData = await Promise.all(fileNames.map(async (fileName) => {
    // Remove ".md" from file name to get id
    const id = fileName.replace(/\.md$/, '')

    // Read markdown file as string
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)

    // Clean the content
    const cleanedContent = cleanContent(matterResult.content)

    // Process markdown to HTML
    const { html: processedContent, sources } = await processMarkdown(cleanedContent)

    // Extract the first image from the processed content if it exists
    const imageMatch = processedContent.match(/<img.*?src=["'](.*?)["']/)
    const image = imageMatch ? imageMatch[1] : undefined

    // Extract a proper excerpt from the cleaned content
    const excerpt = extractExcerpt(cleanedContent)

    // Combine the data
    return {
      id,
      title: matterResult.data.title || '',
      date: matterResult.data.date ? new Date(matterResult.data.date).toISOString() : '',
      excerpt,
      content: processedContent,
      image: image,
      sources
    }
  }))

  // Sort posts by date
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1))
} 