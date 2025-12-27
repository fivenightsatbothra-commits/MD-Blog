const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const matter = require('gray-matter');
const hljs = require('highlight.js');

// Config
const config = {
    src: './content/posts',
    dist: './dist',
    template: './src/template.html'
};

// Ensure dist exists
fs.ensureDirSync(config.dist);
fs.ensureDirSync(path.join(config.dist, 'posts'));

// Read Template
const templateHtml = fs.readFileSync(config.template, 'utf-8');

// Helper: Estimate Reading Time
function getReadingTime(content) {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

// Helper: Custom Renderer & TOC
function processMarkdown(content) {
    const toc = [];
    const renderer = new marked.Renderer();

    // 1. Heading Renderer (TOC)
    renderer.heading = function ({ text, depth, raw } = {}) {
        let headerText, headerLevel, headerRaw;

        if (typeof arguments[0] === 'object' && arguments[0] !== null && !Array.isArray(arguments[0])) {
            const obj = arguments[0];
            headerText = obj.text || '';
            headerLevel = obj.depth || obj.level || 1;
            headerRaw = obj.raw || headerText;
        } else {
            headerText = arguments[0];
            headerLevel = arguments[1];
            headerRaw = arguments[2];
        }

        const anchor = (headerRaw || headerText || '').toLowerCase().replace(/[^\w]+/g, '-');
        if (headerLevel <= 3) {
            toc.push({ anchor, text: headerText, level: headerLevel });
        }
        return `<h${headerLevel} id="${anchor}">${headerText}</h${headerLevel}>`;
    };

    // 2. Blockquote Renderer (Admonitions)
    renderer.blockquote = function ({ text } = {}) {
        const contentStr = (typeof arguments[0] === 'string') ? arguments[0] : (arguments[0].text || '');

        // Check for GitHub style alerts
        const alertMatch = contentStr.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*?)<\/p>([\s\S]*)/);

        if (alertMatch) {
            const type = alertMatch[1].toLowerCase();
            const title = alertMatch[1];
            // Remove the first line
            const restOfContent = contentStr.replace(/^<p>\[!.*?\]\s*<\/p>/, '');

            const icons = {
                note: '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
                tip: '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>',
                important: '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
                warning: '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
                caution: '<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
            };

            const colors = {
                note: 'border-blue-500 bg-blue-500/10 text-blue-200',
                tip: 'border-green-500 bg-green-500/10 text-green-200',
                important: 'border-purple-500 bg-purple-500/10 text-purple-200',
                warning: 'border-yellow-500 bg-yellow-500/10 text-yellow-200',
                caution: 'border-red-500 bg-red-500/10 text-red-200',
            };

            return `
                <div class="my-8 p-4 border-l-4 rounded-r-lg flex gap-4 ${colors[type] || colors.note}">
                    <div class="shrink-0 mt-1">${icons[type] || icons.note}</div>
                    <div class="prose prose-invert prose-sm max-w-none">
                        <strong class="block mb-1 capitalize text-white font-bold">${title}</strong>
                        ${restOfContent}
                    </div>
                </div>
            `;
        }

        return `<blockquote>${contentStr}</blockquote>`;
    };

    marked.setOptions({
        renderer,
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });

    const htmlContent = marked.parse(content);
    return { toc, htmlContent };
}

async function build() {
    console.log('🚀 Starting Build...');

    const files = fs.readdirSync(config.src).filter(file => file.endsWith('.md'));
    const posts = [];

    // 1. Process all posts
    files.forEach(file => {
        const rawContent = fs.readFileSync(path.join(config.src, file), 'utf-8');
        const { data, content } = matter(rawContent);

        const { toc, htmlContent } = processMarkdown(content);

        const slug = file.replace('.md', '');
        const readingTime = getReadingTime(content);

        posts.push({
            ...data,
            slug,
            readingTime,
            toc,
            htmlContent,
            date: new Date(data.date),
            tags: data.tags || [],
            heroImage: data.heroImage || null
        });
    });

    posts.sort((a, b) => b.date - a.date);

    // 2. Generate Search Index
    const searchIndex = posts.map(p => ({
        title: p.title,
        slug: p.slug,
        description: p.description,
        tags: p.tags,
        content: p.htmlContent.replace(/<[^>]*>?/gm, ' ').substring(0, 300) // snippet
    }));
    fs.writeFileSync(path.join(config.dist, 'search.json'), JSON.stringify(searchIndex));
    console.log('🔍 Search Index Generated');

    // 3. Generate Pages
    posts.forEach(post => {
        let postHtml = templateHtml;

        // --- Related Posts Logic ---
        const related = posts
            .filter(p => p.slug !== post.slug)
            .map(p => ({
                post: p,
                matches: p.tags.filter(tag => post.tags.includes(tag)).length
            }))
            .filter(x => x.matches > 0)
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 3)
            .map(x => x.post);

        const relatedHtml = related.length > 0 ? `
            <div class="max-w-screen-xl mx-auto px-6 mt-24 mb-20 relative z-10">
                <h3 class="text-2xl font-bold text-white mb-8 border-b border-white/10 pb-4">You might also like</h3>
                <div class="grid md:grid-cols-3 gap-6">
                    ${related.map(p => `
                        <a href="{{base}}/posts/${p.slug}.html" class="block group bg-white/5 rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
                             <div class="text-xs text-brand-accent font-bold mb-2">${p.tags[0] || 'Blog'}</div>
                             <h4 class="text-lg font-bold text-slate-200 group-hover:text-white mb-2 leading-tight">${p.title}</h4>
                             <p class="text-sm text-slate-500 line-clamp-2">${p.description}</p>
                        </a>
                    `).join('')}
                </div>
            </div>
        ` : '';
        // ---------------------------

        // TOC
        let tocHtml = `<aside class="hidden lg:block w-72 sticky top-32 h-fit">
            <h4 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Table of Contents</h4>
            <nav class="relative">
                <div class="absolute left-0 top-0 bottom-0 w-px bg-white/10"></div>
                <ul class="space-y-4 text-sm relative">
                    ${post.toc.map(item => `
                        <li class="pl-${(item.level - 1) * 4} relative">
                             <a href="#${item.anchor}" class="toc-link block py-1 pl-4 border-l-2 border-transparent text-slate-400 hover:text-white hover:border-white/30 transition-all duration-300">${item.text}</a>
                        </li>
                    `).join('')}
                </ul>
            </nav>
        </aside>`;

        // Tags
        const tagsHtml = post.tags.map(tag =>
            `<span class="px-3 py-1 text-xs font-semibold rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">#${tag}</span>`
        ).join('');

        // Hero
        const heroHtml = post.heroImage ?
            `<div class="mb-12 rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-video relative group">
                <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60"></div>
                <img src="${post.heroImage}" alt="${post.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700">
             </div>` : '';

        // Template Body
        const articleHtml = `
            <div class="max-w-screen-xl mx-auto px-6 relative z-10">
                <div class="fixed top-20 left-0 w-full h-1 bg-white/5 z-50">
                    <div id="read-progress" class="h-full bg-brand-accent w-0"></div>
                </div>

                <header class="py-20 text-center max-w-4xl mx-auto">
                    <div class="flex flex-wrap items-center justify-center gap-2 mb-8">
                        ${tagsHtml}
                    </div>
                    <h1 class="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-500 mb-8 tracking-tight leading-[1.1]">${post.title}</h1>
                     <div class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm font-medium mb-10 backdrop-blur-sm">
                        <span>${post.date.toLocaleDateString()}</span>
                        <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span>${post.readingTime} min read</span>
                        <span class="w-1 h-1 rounded-full bg-slate-600"></span>
                        <span>${post.author}</span>
                    </div>
                    ${heroHtml}
                    <p class="text-xl md:text-2xl text-slate-400 font-light leading-relaxed max-w-2xl mx-auto mb-10">${post.description}</p>
                </header>

                <div class="flex flex-col lg:flex-row gap-12 lg:gap-24 relative">
                    <article class="prose prose-invert prose-lg md:prose-xl prose-slate max-w-none flex-1
                        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
                        prose-p:text-slate-400 prose-p:leading-relaxed
                        prose-a:text-brand-accent prose-a:font-semibold prose-a:no-underline hover:prose-a:text-brand-accent/80 hover:prose-a:border-b hover:prose-a:border-brand-accent/50
                        prose-img:rounded-3xl prose-img:shadow-2xl prose-img:border prose-img:border-white/10
                        prose-code:text-brand-accent prose-code:bg-brand-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-[#1e293b] prose-pre:border prose-pre:border-white/10 prose-pre:shadow-2xl prose-pre:rounded-2xl prose-pre:!p-0
                        prose-blockquote:border-l-brand-accent prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:pl-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-200">
                        ${post.htmlContent}
                    </article>
                     ${post.toc.length > 0 ? tocHtml : ''}
                </div>
                
                 ${relatedHtml}

                <div class="mt-10 pt-10 border-t border-white/10 text-center pb-20">
                     <a href="{{base}}/" class="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-medium">
                        <span>←</span> Back to Home
                     </a>
                </div>
            </div>
            
            <script>
                // Reading Progress
                gsap.to("#read-progress", {
                    width: "100%",
                    ease: "none",
                    scrollTrigger: {
                        trigger: "article",
                        start: "top 20%",
                        end: "bottom bottom",
                        scrub: true
                    }
                });
            </script>
        `;

        postHtml = postHtml.replace('{{title}}', post.title);
        postHtml = postHtml.replace('{{content}}', articleHtml);

        // Rel paths for Posts (deep 1 level)
        postHtml = postHtml.replace(/{{base}}/g, '..');

        fs.writeFileSync(path.join(config.dist, 'posts', `${post.slug}.html`), postHtml);
        console.log(`✅ Generated: posts/${post.slug}.html`);
    });

    // 4. Generate Home Page
    const homeHtml = templateHtml.replace('{{title}}', 'Home');
    const postsListHtml = `
        <div class="max-w-4xl mx-auto px-6 py-32 relative z-10">
            <h2 class="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-slate-200 to-slate-600 mb-6 text-center tracking-tighter" style="line-height: 1.1;">
                Thoughts &<br>Perspectives
            </h2>
            <p class="text-center text-slate-400 mb-12 text-lg max-w-lg mx-auto leading-relaxed">
                Exploring the intersection of code, design, and digital narratives.
            </p>

            <!-- Search Bar Trigger -->
            <div class="max-w-md mx-auto mb-20 relative text-center">
                <button onclick="toggleSearch()" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-accent/50 transition-all text-slate-400 hover:text-white w-full justify-center group">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span>Search articles (Cmd+K)...</span>
                    <span class="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded text-slate-500 group-hover:text-white">⌘K</span>
                </button>
            </div>
            
            <div class="grid gap-8">
                ${posts.map(post => `
                    <a href="{{base}}/posts/${post.slug}.html" class="group relative block p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_50px_-12px_rgba(56,189,248,0.3)] overflow-hidden">
                         <div class="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="relative z-10">
                            <div class="flex flex-wrap gap-2 mb-6">
                                ${post.tags.map(tag => `<span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-white/5 border border-white/10 text-slate-400 group-hover:text-white group-hover:border-white/20 transition-colors">${tag}</span>`).join('')}
                            </div>
                            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                                <h3 class="text-3xl font-bold text-white group-hover:text-brand-accent transition-colors duration-300">${post.title}</h3>
                                <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 group-hover:text-white transition-colors">${post.date.toLocaleDateString()}</span>
                            </div>
                            <p class="text-slate-400 text-lg mb-8 max-w-2xl leading-relaxed group-hover:text-slate-300 transition-colors">${post.description}</p>
                            <div class="flex items-center text-brand-accent font-bold tracking-wide text-sm">
                                <span class="group-hover:mr-2 transition-all duration-300">Read Article</span>
                                <svg class="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </div>
                        </div>
                    </a>
                `).join('')}
            </div>
        </div>
    `;

    // Rel paths for Home (root)
    const finalHomeHtml = homeHtml
        .replace('{{content}}', postsListHtml)
        .replace(/{{base}}/g, '.'); // Styles and links are in current dir

    fs.writeFileSync(path.join(config.dist, 'index.html'), finalHomeHtml);
    console.log('✅ Generated: index.html');
    console.log('✨ Build Complete!');
}

build().catch(console.error);
