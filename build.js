const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TEMPLATE_PATH = path.join(ROOT, "post.html");
const INDEX_PATH = path.join(ROOT, "index.html");
const CATEGORIES_PATH = path.join(ROOT, "categories.html");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");

const EXCLUDED_FILES = new Set([
  "index.html",
  "post.html",
  "add-post.html",
  "categories.html"
]);

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function createPostDataScript(post) {
  return `
<script id="realInsightPostData" type="application/json">
${JSON.stringify({
  id: post.id || "",
  title: post.title || "",
  slug: post.slug || "",
  category: post.category || "",
  date: post.date || "",
  readingTime: post.readingTime || "",
  excerpt: post.excerpt || "",
  tags: post.tags || [],
  published: true
})}
</script>`;
}

/* =========================================================
   EXTRACT POST DATA
========================================================= */

function extractPostData(html) {
  const match = html.match(
    /<script[^>]*id=["']realInsightPostData["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    console.warn("Could not parse post metadata:", error.message);
    return null;
  }
}

function extractPostContent(html) {
  const startMarker = "<!-- REAL_INSIGHT_CONTENT_START -->";
  const endMarker = "<!-- REAL_INSIGHT_CONTENT_END -->";

  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return html
    .slice(start + startMarker.length, end)
    .trim();
}

/* =========================================================
   POST FILE DETECTION
========================================================= */

function isPostFile(fileName) {
  if (!fileName.endsWith(".html")) {
    return false;
  }

  if (EXCLUDED_FILES.has(fileName)) {
    return false;
  }

  return true;
}

/* =========================================================
   READ POSTS
========================================================= */

function readPosts() {
  const files = fs.readdirSync(ROOT);

  const posts = [];

  for (const fileName of files) {
    if (!isPostFile(fileName)) {
      continue;
    }

    const filePath = path.join(ROOT, fileName);

    if (!fs.statSync(filePath).isFile()) {
      continue;
    }

    const html = fs.readFileSync(filePath, "utf8");

    const data = extractPostData(html);

    if (!data) {
      continue;
    }

    const content = extractPostContent(html);

    const slug = data.slug || fileName.replace(/\.html$/i, "");

    posts.push({
      id: data.id || slug,
      title: data.title || "",
      slug,
      category: data.category || "Uncategorized",
      date: data.date || "",
      readingTime: data.readingTime || "",
      excerpt: data.excerpt || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      content
    });
  }

  posts.sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;

    return dateB - dateA;
  });

  return posts;
}

/* =========================================================
   TAGS
========================================================= */

function renderTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "";
  }

  return `
<div class="post-tags">
  ${tags
    .map(
      tag => `
    <a href="/categories?tag=${encodeURIComponent(tag)}" class="tag">
      ${escapeHtml(tag)}
    </a>
  `
    )
    .join("")}
</div>`;
}

/* =========================================================
   RELATED POSTS
========================================================= */

function renderRelatedPosts(post, posts) {
  const related = posts
    .filter(item => item.slug !== post.slug)
    .sort((a, b) => {
      const aSameCategory =
        a.category.toLowerCase() === post.category.toLowerCase();

      const bSameCategory =
        b.category.toLowerCase() === post.category.toLowerCase();

      if (aSameCategory && !bSameCategory) return -1;
      if (!aSameCategory && bSameCategory) return 1;

      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;

      return dateB - dateA;
    })
    .slice(0, 3);

  if (related.length === 0) {
    return "";
  }

  return `
<div class="related-posts">
  <h2>Related Posts</h2>

  <div class="related-grid">
    ${related
      .map(
        item => `
      <article class="related-card">
        <a href="/${escapeAttribute(item.slug)}">
          <span class="related-category">
            ${escapeHtml(item.category)}
          </span>

          <h3>${escapeHtml(item.title)}</h3>

          <p>${escapeHtml(item.excerpt)}</p>

          <span class="related-date">
            ${escapeHtml(item.date)}
          </span>
        </a>
      </article>
    `
      )
      .join("")}
  </div>
</div>`;
}

/* =========================================================
   RECENT POSTS
========================================================= */

function renderRecentPosts(posts) {
  const recent = posts.slice(0, 5);

  if (recent.length === 0) {
    return "";
  }

  return recent
    .map(
      post => `
<li>
  <a href="/${escapeAttribute(post.slug)}">
    ${escapeHtml(post.title)}
  </a>
</li>`
    )
    .join("");
}

/* =========================================================
   POST NAVIGATION
========================================================= */

function renderPostNavigation(post, posts) {
  const index = posts.findIndex(item => item.slug === post.slug);

  if (index === -1) {
    return "";
  }

  const previous = posts[index + 1] || null;
  const next = posts[index - 1] || null;

  return `
<div class="post-navigation">

  <div class="post-nav-prev">
    ${
      previous
        ? `
      <span>Previous Post</span>
      <a href="/${escapeAttribute(previous.slug)}">
        ${escapeHtml(previous.title)}
      </a>
    `
        : ""
    }
  </div>

  <div class="post-nav-next">
    ${
      next
        ? `
      <span>Next Post</span>
      <a href="/${escapeAttribute(next.slug)}">
        ${escapeHtml(next.title)}
      </a>
    `
        : ""
    }
  </div>

</div>`;
}

/* =========================================================
   RENDER INDIVIDUAL POST
========================================================= */

function renderPost(post, posts, template) {
  const siteUrl =
    process.env.NETLIFY_SITE_URL ||
    process.env.URL ||
    "https://realinsight.netlify.app";

  const canonicalUrl = `${siteUrl.replace(/\/$/, "")}/${post.slug}`;

  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(post.title)} | Real Insight</title>`
  );

  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeAttribute(post.excerpt)}">`
  );

  html = html.replace(
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeAttribute(canonicalUrl)}">`
  );

  if (!/<link\s+rel=["']canonical["']/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${escapeAttribute(canonicalUrl)}">\n</head>`
    );
  }

  html = html.replace(
    /\{\{TITLE\}\}/g,
    escapeHtml(post.title)
  );

  html = html.replace(
    /\{\{CATEGORY\}\}/g,
    escapeHtml(post.category)
  );

  html = html.replace(
    /\{\{DATE\}\}/g,
    escapeHtml(post.date)
  );

  html = html.replace(
    /\{\{READING_TIME\}\}/g,
    escapeHtml(post.readingTime)
  );

  html = html.replace(
    /\{\{EXCERPT\}\}/g,
    escapeHtml(post.excerpt)
  );

  html = html.replace(
    /\{\{CONTENT\}\}/g,
    post.content
  );

  html = html.replace(
    /\{\{TAGS\}\}/g,
    renderTags(post.tags)
  );

  html = html.replace(
    /\{\{RELATED_POSTS\}\}/g,
    renderRelatedPosts(post, posts)
  );

  html = html.replace(
    /\{\{RECENT_POSTS\}\}/g,
    renderRecentPosts(posts)
  );

  html = html.replace(
    /\{\{POST_NAVIGATION\}\}/g,
    renderPostNavigation(post, posts)
  );

  const postDataScript = createPostDataScript(post);

  if (html.includes("</body>")) {
    html = html.replace(
      /<\/body>/i,
      `${postDataScript}\n</body>`
    );
  } else {
    html += postDataScript;
  }

  return html;
}

/* =========================================================
   HOMEPAGE
========================================================= */

function renderHomePostCard(post) {
  return `
<article class="post-card">

  <div class="post-card-content">

    <div class="post-card-meta">
      <span class="post-card-category">
        ${escapeHtml(post.category)}
      </span>

      <span class="post-card-date">
        ${escapeHtml(post.date)}
      </span>
    </div>

    <h3>
      <a href="/${escapeAttribute(post.slug)}">
        ${escapeHtml(post.title)}
      </a>
    </h3>

    <p>
      ${escapeHtml(post.excerpt)}
    </p>

    <div class="post-card-footer">
      <span>
        ${escapeHtml(post.readingTime)}
      </span>

      <a href="/${escapeAttribute(post.slug)}">
        Read more
      </a>
    </div>

  </div>

</article>`;
}

function renderHomeRecentPost(post) {
  return `
<li>
  <a href="/${escapeAttribute(post.slug)}">
    ${escapeHtml(post.title)}
  </a>
</li>`;
}

function replaceBetweenMarkers(
  html,
  startMarker,
  endMarker,
  replacement
) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);

  if (start === -1 || end === -1 || end < start) {
    return html;
  }

  return (
    html.slice(0, start + startMarker.length) +
    "\n" +
    replacement +
    "\n" +
    html.slice(end)
  );
}

function buildHomepage(posts) {
  let html = fs.readFileSync(INDEX_PATH, "utf8");

  const postCards = posts
    .map(renderHomePostCard)
    .join("\n");

  const recentPosts = posts
    .slice(0, 5)
    .map(renderHomeRecentPost)
    .join("\n");

  html = replaceBetweenMarkers(
    html,
    "<!-- POSTS_START -->",
    "<!-- POSTS_END -->",
    postCards
  );

  html = replaceBetweenMarkers(
    html,
    "<!-- RECENT_POSTS_START -->",
    "<!-- RECENT_POSTS_END -->",
    recentPosts
  );

  if (posts.length > 0) {
    html = html.replace(
      /<div[^>]*class=["']empty-state["'][^>]*id=["']emptyState["'][^>]*hidden[^>]*>[\s\S]*?<\/div>/i,
      match => match
    );
  }

  fs.writeFileSync(INDEX_PATH, html, "utf8");
}

/* =========================================================
   BUILD POSTS
========================================================= */

function buildPosts(posts, template) {
  for (const post of posts) {
    const outputPath = path.join(ROOT, `${post.slug}.html`);

    const html = renderPost(
      post,
      posts,
      template
    );

    fs.writeFileSync(
      outputPath,
      html,
      "utf8"
    );

    console.log(`Built post: ${post.slug}.html`);
  }
}

/* =========================================================
   CATEGORY POST LIST
========================================================= */

function renderCategoryPost(post) {
  return `
<article class="post-card">

  <div class="post-card-content">

    <div class="post-card-meta">
      <span class="post-card-category">
        ${escapeHtml(post.category)}
      </span>

      <span class="post-card-date">
        ${escapeHtml(post.date)}
      </span>
    </div>

    <h3>
      <a href="/${escapeAttribute(post.slug)}">
        ${escapeHtml(post.title)}
      </a>
    </h3>

    <p>
      ${escapeHtml(post.excerpt)}
    </p>

    <div class="post-card-footer">
      <span>
        ${escapeHtml(post.readingTime)}
      </span>

      <a href="/${escapeAttribute(post.slug)}">
        Read more
      </a>
    </div>

  </div>

</article>`;
}

function buildCategories(posts) {
  if (!fs.existsSync(CATEGORIES_PATH)) {
    console.warn("categories.html not found. Skipping category build.");
    return;
  }

  let html = fs.readFileSync(
    CATEGORIES_PATH,
    "utf8"
  );

  /*
   * Group posts by category.
   */
  const grouped = {};

  for (const post of posts) {
    const category =
      post.category &&
      post.category.trim()
        ? post.category.trim()
        : "Uncategorized";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(post);
  }

  /*
   * Sort category names alphabetically.
   */
  const categories = Object.keys(grouped).sort(
    (a, b) => a.localeCompare(b)
  );

  const categorySections = categories
    .map(category => {
      const categoryPosts = grouped[category];

      return `
<section class="category-section">

  <div class="section-heading">
    <h2 class="category-title">
      ${escapeHtml(category)}
    </h2>

    <span class="category-count">
      ${categoryPosts.length}
      ${categoryPosts.length === 1 ? "post" : "posts"}
    </span>
  </div>

  <div class="category-posts">
    ${categoryPosts
      .map(renderCategoryPost)
      .join("\n")}
  </div>

</section>`;
    })
    .join("\n");

  /*
   * The category page contains:
   *
   * <div class="category-list" id="categoryList"></div>
   *
   * Replace only the inside of that element.
   */
  const categoryListRegex =
    /(<div[^>]*id=["']categoryList["'][^>]*>)[\s\S]*?(<\/div>\s*)(?=<\/section>|<\/main>|<footer|<script|$)/i;

  if (categoryListRegex.test(html)) {
    html = html.replace(
      categoryListRegex,
      `$1\n${categorySections}\n$2`
    );
  } else {
    /*
     * Fallback for a categoryList element where the closing
     * div is not immediately followed by one of the expected
     * elements.
     */
    const openingMatch = html.match(
      /<div[^>]*id=["']categoryList["'][^>]*>/i
    );

    if (openingMatch) {
      const openingTag = openingMatch[0];
      const start = html.indexOf(openingTag);

      const contentStart =
        start + openingTag.length;

      const closingTag =
        html.indexOf("</div>", contentStart);

      if (closingTag !== -1) {
        html =
          html.slice(0, contentStart) +
          "\n" +
          categorySections +
          "\n" +
          html.slice(closingTag);
      }
    } else {
      console.warn(
        "categoryList element not found in categories.html"
      );
    }
  }

  fs.writeFileSync(
    CATEGORIES_PATH,
    html,
    "utf8"
  );

  console.log(
    `Built category page with ${categories.length} categories.`
  );
}

/* =========================================================
   SITEMAP
========================================================= */

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getSiteUrl() {
  return (
    process.env.NETLIFY_SITE_URL ||
    process.env.URL ||
    "https://realinsight.netlify.app"
  ).replace(/\/$/, "");
}

function formatSitemapDate(date) {
  if (!date) {
    return new Date().toISOString().split("T")[0];
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  return parsed.toISOString().split("T")[0];
}

function buildSitemap(posts) {
  const siteUrl = getSiteUrl();

  const urls = [];

  /*
   * Homepage
   */
  urls.push(`
  <url>
    <loc>${escapeXml(`${siteUrl}/`)}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  /*
   * Categories page
   */
  urls.push(`
  <url>
    <loc>${escapeXml(`${siteUrl}/categories`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

  /*
   * Individual posts
   */
  for (const post of posts) {
    urls.push(`
  <url>
    <loc>${escapeXml(
      `${siteUrl}/${encodeURIComponent(post.slug)}`
    )}</loc>
    <lastmod>${escapeXml(
      formatSitemapDate(post.date)
    )}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
>
${urls.join("\n")}
</urlset>
`;

  fs.writeFileSync(
    SITEMAP_PATH,
    sitemap,
    "utf8"
  );

  console.log(
    `Built sitemap.xml with ${posts.length + 2} URLs.`
  );
}

/* =========================================================
   BUILD
========================================================= */

function build() {
  console.log("Starting Real Insight build...");

  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error("post.html template not found.");
  }

  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error("index.html not found.");
  }

  const template = fs.readFileSync(
    TEMPLATE_PATH,
    "utf8"
  );

  const posts = readPosts();

  console.log(
    `Found ${posts.length} published post(s).`
  );

  /*
   * Build individual post pages.
   */
  buildPosts(
    posts,
    template
  );

  /*
   * Build homepage listings.
   */
  buildHomepage(posts);

  /*
   * Build category page listings.
   */
  buildCategories(posts);

  /*
   * Build sitemap.xml.
   */
  buildSitemap(posts);

  console.log("Real Insight build completed.");
}

/* =========================================================
   RUN
========================================================= */

try {
  build();
} catch (error) {
  console.error("Build failed:");
  console.error(error);

  process.exit(1);
}