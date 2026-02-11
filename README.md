# Blog Template

A single-file blog post compiler. Write posts in markdown, run the build, and get a self-contained HTML file ready to share on Slack or host anywhere.

## Quick Start

```bash
npm install
npm run build
```

Output lands in `dist/`. Each post compiles to one `.html` file with all styles and images embedded inline.

## Project Structure

```
blog-template/
├── build.js          # Build script
├── template.html     # HTML template (editable)
├── styles.css        # Brand styles (editable)
├── content/          # Your posts go here
│   └── example-post.md
└── dist/             # Compiled output (gitignored)
```

## Writing a Post

Create a `.md` file in `content/`. Each post starts with YAML frontmatter followed by markdown content.

### Frontmatter

```yaml
---
title: "Your Post Title"              # Required
subtitle: "A short description"        # Optional — shows below title
author: "Author Name"                  # Optional
date: "February 2026"                  # Optional — free-form string
category: "Product"                    # Optional — rendered as a tag
slug: "url-friendly-name"             # Optional — defaults to filename
cover_image: "./images/hero.png"       # Optional — full-width image below header
og_image: "https://example.com/og.png" # Optional — for link previews (not inlined)
read_time: "5 min read"               # Optional — auto-calculated if omitted
footer: "&copy; 2026 Company Name"     # Optional — centered at bottom
---
```

Only `title` is required. Everything else is optional and the template adjusts accordingly — unused fields are simply omitted from the output.

### Content

Write standard markdown below the frontmatter:

```markdown
## Section Heading

Regular paragraph with **bold** and *italic* text.

- Bullet lists
- Work as expected

> Blockquotes are styled with a brand-colored left border.

### Code Blocks

    ```json
    { "key": "value" }
    ```

[Links](#) use the brand accent color.
```

## Images and GIFs

Local images are base64-encoded and embedded directly into the HTML so the output remains a single distributable file.

### Inline images

Place images relative to your markdown file and reference them with standard markdown syntax:

```
content/
├── my-post.md
└── images/
    ├── screenshot.png
    └── demo.gif
```

```markdown
![Dashboard screenshot](./images/screenshot.png)

![Demo animation](./images/demo.gif)
```

### Cover image

Set `cover_image` in frontmatter to a relative path:

```yaml
---
cover_image: "./images/hero.png"
---
```

### Supported formats

`.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.avif`

### External images

URLs starting with `http://` or `https://` are left as-is and not inlined:

```markdown
![External image](https://example.com/photo.png)
```

## Building

### Build all posts

```bash
npm run build
```

### Build a specific post

```bash
node build.js my-post.md
```

The filename is resolved relative to `content/`. Output goes to `dist/<slug>.html`.

## Customization

### Styles

Edit `styles.css` to change colors, typography, spacing, etc. All CSS is inlined into the output at build time. The current styles use brand colors from the device-manager-frontend project:

| Token        | Value     | Usage                  |
|--------------|-----------|------------------------|
| `--daylight` | `#E1FF17` | Accent, links, markers |
| `--shade`    | `#101820` | Page background        |
| `--heat`     | `#FF4F39` | Alerts, destructive    |
| `--frost`    | `#CFDBE2` | Body text              |

### Template

Edit `template.html` to change the HTML structure. Placeholders use `{{key}}` syntax and conditionals use `{{#if key}}...{{/if}}`.

Available placeholders: `title`, `subtitle`, `author`, `date`, `category`, `cover_image`, `og_image`, `read_time`, `footer`, `styles`, `content`.
