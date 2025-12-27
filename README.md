# Ultra-Modern Markdown Blog

A high-performance, bespoke Static Site Generator (SSG) tailored for developers. Built with Node.js, Tailwind CSS, and GSAP.

![Blog Screenshot](https://via.placeholder.com/800x400?text=Preview+Coming+Soon)

## 🚀 Features

*   **Zero Database**: "Database" is just a folder of Markdown files (`content/posts/*.md`).
*   **Deep Customization**: 
    *   **Admonitions**: GitHub-style alerts (`> [!NOTE]`).
    *   **Instant Search**: Client-side fuzzy search (Cmd+K).
    *   **Reading Progress**: Visual reading bar.
    *   **Syntax Highlighting**: Atom One Dark theme for code.
*   **Performance**: Generates pure static HTML. Blazingly fast.
*   **Design**: Glassmorphism, animations, and beautiful typography.

## 🛠️ Installation

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm start
```

## ✍️ Writing Content

1.  Create a file in `content/posts/my-new-post.md`.
2.  Add frontmatter:
    ```yaml
    ---
    title: "My Amazing Post"
    date: "2024-03-25"
    description: "A short summary."
    heroImage: "https://..."
    tags: ["Tech", "Life"]
    ---
    ```
3.  Write Markdown!
    *   Use `> [!TIP]` for tips.
    *   Use code blocks with language support ` ```js `.

## 📦 Deployment (GitHub Pages)

This repo includes a GitHub Actions workflow.
1.  Push to GitHub.
2.  Go to **Settings > Pages**.
3.  Select **GitHub Actions** as the source.
4.  The site will deploy to `your-username.github.io/repo-name`.

## 🏗️ Architecture

*   `build.js`: The compiler. Reads MD, applies templates, writes HTML.
*   `src/template.html`: The master layout.
*   `src/styles.css`: Tailwind entry point.
