#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const matter = require("gray-matter");

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, "content");
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(ROOT, "template.html");
const STYLES_PATH = path.join(ROOT, "styles.css");

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

// Generate a PDF from a compiled HTML file using headless Chrome
async function generatePdf(htmlPath) {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });

  // Scale down text and add inner padding for PDF (background stays edge-to-edge)
  await page.addStyleTag({
    content: "html { font-size: 90%; } .blog-wrapper { padding: 1in; }",
  });

  const pdfPath = htmlPath.replace(/\.html$/, ".pdf");
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  const size = (fs.statSync(pdfPath).size / 1024).toFixed(0);
  console.log(`  -> dist/${path.basename(pdfPath)} (${size} KB)`);
  return pdfPath;
}

// Estimate reading time from word count
function readingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 230);
  return `${minutes} min read`;
}

// Convert a local image path to an inline base64 data URI
function toDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) {
    console.warn(`  ⚠ Unsupported image type: ${ext} (${filePath})`);
    return null;
  }
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

// Resolve a src path relative to the markdown file's directory
function resolveImagePath(src, contentDir) {
  if (src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
    return null; // already absolute or already inlined
  }
  const resolved = path.resolve(contentDir, src);
  if (fs.existsSync(resolved)) return resolved;
  return null;
}

// Replace local image references in HTML with inline data URIs
function inlineImages(html, contentDir) {
  let count = 0;
  const result = html.replace(
    /(<img\s[^>]*src=["'])([^"']+)(["'][^>]*>)/gi,
    (match, before, src, after) => {
      const filePath = resolveImagePath(src, contentDir);
      if (!filePath) return match;
      const dataUri = toDataUri(filePath);
      if (!dataUri) return match;
      count++;
      return `${before}${dataUri}${after}`;
    }
  );
  if (count) console.log(`  Inlined ${count} image(s)`);
  return result;
}

// Simple conditional block handler: {{#if key}}...{{/if}}
function processConditionals(html, data) {
  return html.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, block) => (data[key] ? block : "")
  );
}

// Replace {{key}} placeholders with values
function replacePlaceholders(html, data) {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] != null ? data[key] : ""
  );
}

function compile(inputFile) {
  const raw = fs.readFileSync(inputFile, "utf-8");
  const { data: frontmatter, content: markdown } = matter(raw);
  const contentDir = path.dirname(inputFile);

  const htmlContent = marked.parse(markdown);
  const styles = fs.readFileSync(STYLES_PATH, "utf-8");
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  // Inline cover_image if it's a local path
  let coverImage = frontmatter.cover_image || "";
  if (coverImage) {
    const resolved = resolveImagePath(coverImage, contentDir);
    if (resolved) coverImage = toDataUri(resolved) || coverImage;
  }

  const data = {
    title: frontmatter.title || "Untitled",
    subtitle: frontmatter.subtitle || "",
    author: frontmatter.author || "",
    date: frontmatter.date || "",
    category: frontmatter.category || "",
    cover_image: coverImage,
    og_image: frontmatter.og_image || "",
    read_time: frontmatter.read_time || readingTime(markdown),
    footer: frontmatter.footer || "",
    styles,
    content: htmlContent,
  };

  let output = processConditionals(template, data);
  output = replacePlaceholders(output, data);

  // Inline any local images/gifs referenced in the rendered HTML
  output = inlineImages(output, contentDir);

  const slug =
    frontmatter.slug || path.basename(inputFile, path.extname(inputFile));
  const outPath = path.join(DIST_DIR, `${slug}.html`);

  fs.mkdirSync(DIST_DIR, { recursive: true });
  fs.writeFileSync(outPath, output, "utf-8");

  const size = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`  ${path.basename(inputFile)} -> dist/${slug}.html (${size} KB)`);
  return outPath;
}

// --- CLI ---
async function main() {
  const args = process.argv.slice(2);
  const buildAll = args.includes("--all");
  const buildPdf = args.includes("--pdf");

  // Collect target files
  let files = [];

  if (buildAll) {
    files = fs
      .readdirSync(CONTENT_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => path.join(CONTENT_DIR, f));
  } else {
    const targets = args.filter((a) => !a.startsWith("--"));
    if (targets.length) {
      files = targets.map((t) =>
        path.isAbsolute(t) ? t : path.join(CONTENT_DIR, t)
      );
    } else {
      files = fs
        .readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => path.join(CONTENT_DIR, f));
    }
  }

  if (!files.length) {
    console.log("No markdown files found in content/. Add a .md file to get started.");
    process.exit(0);
  }

  console.log(`\nBuilding ${files.length} post(s)...\n`);
  const htmlPaths = files.map(compile);

  if (buildPdf) {
    console.log("\nGenerating PDFs...\n");
    for (const htmlPath of htmlPaths) {
      await generatePdf(htmlPath);
    }
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
