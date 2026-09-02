const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

const POSTS_DIR =
  path.join(
    ROOT,
    "posts"
  );

const TEMPLATE_PATH =
  path.join(
    ROOT,
    "post.html"
  );

const INDEX_PATH =
  path.join(
    ROOT,
    "index.html"
  );


/* =========================================
   BASIC HELPERS
   ========================================= */

function escapeHtml(value) {

  return String(value || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return escapeHtml(value);

}


/* =========================================
   POST DATA
   ========================================= */

function createPostDataScript(post) {

  const data = {

    slug:
      post.slug,

    title:
      post.title,

    category:
      post.category,

    date:
      post.date,

    readingTime:
      post.readingTime,

    excerpt:
      post.excerpt,

    tags:
      post.tags || []

  };


  const json =
    JSON.stringify(data)
      .replace(
        /</g,
        "\\u003c"
      )
      .replace(
        />/g,
        "\\u003e"
      )
      .replace(
        /&/g,
        "\\u0026"
      );


  return `
<script
  type="application/json"
  id="realInsightPostData"
>${json}</script>`;

}


/* =========================================
   EXTRACT POST DATA
   ========================================= */

function extractPostData(
  html,
  filename
) {

  const match =
    html.match(
      /<script[^>]*id=["']realInsightPostData["'][^>]*>([\s\S]*?)<\/script>/i
    );


  if (!match) {

    throw new Error(
      `${filename} does not contain post metadata.`
    );

  }


  try {

    return JSON.parse(
      match[1].trim()
    );

  } catch (error) {

    throw new Error(
      `${filename} contains invalid post metadata.`
    );

  }

}


/* =========================================
   EXTRACT ARTICLE CONTENT
   ========================================= */

function extractPostContent(
  html,
  filename
) {

  const startMarker =
    "<!-- REAL_INSIGHT_CONTENT_START -->";

  const endMarker =
    "<!-- REAL_INSIGHT_CONTENT_END -->";


  const start =
    html.indexOf(
      startMarker
    );


  const end =
    html.indexOf(
      endMarker
    );


  if (
    start === -1 ||
    end === -1 ||
    end < start
  ) {

    throw new Error(
      `${filename} does not contain article content markers.`
    );

  }


  return html
    .slice(
      start + startMarker.length,
      end
    )
    .trim();

}


/* =========================================
   READ POSTS
   ========================================= */

function readPosts() {

  if (
    !fs.existsSync(
      POSTS_DIR
    )
  ) {

    fs.mkdirSync(
      POSTS_DIR,
      {
        recursive: true
      }
    );

  }


  const files =
    fs.readdirSync(
      POSTS_DIR
    )
    .filter(function(filename) {

      return (
        filename
          .toLowerCase()
          .endsWith(".html")
      );

    });


  const posts = [];


  for (
    const filename of files
  ) {

    const filePath =
      path.join(
        POSTS_DIR,
        filename
      );


    const html =
      fs.readFileSync(
        filePath,
        "utf8"
      );


    try {

      const data =
        extractPostData(
          html,
          filename
        );


      const content =
        extractPostContent(
          html,
          filename
        );


      const slug =
        String(
          data.slug ||
          filename.replace(
            /\.html$/i,
            ""
          )
        )
        .trim();


      posts.push({

        slug,

        title:
          String(
            data.title || ""
          ).trim(),

        category:
          String(
            data.category || ""
          ).trim(),

        date:
          String(
            data.date || ""
          ).trim(),

        readingTime:
          String(
            data.readingTime || ""
          ).trim(),

        excerpt:
          String(
            data.excerpt || ""
          ).trim(),

        tags:
          Array.isArray(
            data.tags
          )
            ? data.tags
                .map(function(tag) {
                  return String(tag).trim();
                })
                .filter(Boolean)
            : [],

        content

      });


    } catch (error) {

      console.error(
        `Skipping ${filename}: ${error.message}`
      );

    }

  }


  /*
   * Newest posts first.
   */

  posts.sort(
    function(a, b) {

      return (
        new Date(b.date || 0) -
        new Date(a.date || 0)
      );

    }
  );


  return posts;

}


/* =========================================
   TAG HTML
   ========================================= */

function renderTags(tags) {

  if (
    !Array.isArray(tags) ||
    !tags.length
  ) {

    return "";

  }


  return tags
    .map(function(tag) {

      return `
<a
  href="/categories?tag=${encodeURIComponent(tag)}"
  class="post-tag"
>
  ${escapeHtml(tag)}
</a>`;

    })
    .join("");

}


/* =========================================
   RELATED POSTS
   ========================================= */

function renderRelatedPosts(
  post,
  allPosts
) {

  const related =
    allPosts
      .filter(function(item) {

        return (
          item.slug !== post.slug &&
          item.category.toLowerCase() ===
            post.category.toLowerCase()
        );

      })
      .slice(0, 3);


  /*
   * If there aren't enough posts
   * in the same category, fill the
   * remaining spaces with recent posts.
   */

  if (
    related.length < 3
  ) {

    allPosts
      .filter(function(item) {

        return (
          item.slug !== post.slug &&
          !related.some(function(
            existing
          ) {

            return (
              existing.slug ===
              item.slug
            );

          })
        );

      })
      .slice(
        0,
        3 - related.length
      )
      .forEach(function(item) {

        related.push(item);

      });

  }


  if (!related.length) {

    return "";

  }


  return related
    .map(function(item) {

      return `
<a
  class="related-card"
  href="/${encodeURIComponent(item.slug)}"
>

  <span class="post-category">
    ${escapeHtml(item.category)}
  </span>

  <h3>
    ${escapeHtml(item.title)}
  </h3>

  <p class="excerpt">
    ${escapeHtml(item.excerpt)}
  </p>

  <div class="post-meta">

    <span>
      ${escapeHtml(item.date)}
    </span>

    <span class="dot"></span>

    <span>
      ${escapeHtml(item.readingTime)}
    </span>

  </div>

</a>`;

    })
    .join("");

}


/* =========================================
   RECENT POSTS
   ========================================= */

function renderRecentPosts(
  allPosts
) {

  return allPosts
    .slice(0, 5)
    .map(function(post) {

      return `
<li>

  <a
    href="/${encodeURIComponent(post.slug)}"
  >
    ${escapeHtml(post.title)}
  </a>

  <span class="date">
    ${escapeHtml(post.date)}
  </span>

</li>`;

    })
    .join("");

}


/* =========================================
   POST NAVIGATION
   ========================================= */

function renderPostNavigation(
  post,
  allPosts
) {

  const index =
    allPosts.findIndex(
      function(item) {

        return (
          item.slug ===
          post.slug
        );

      }
    );


  if (index === -1) {

    return "";

  }


  const previous =
    allPosts[index + 1] || null;

  const next =
    allPosts[index - 1] || null;


  let html = `
<div class="post-navigation-inner">
`;


  if (previous) {

    html += `
<a
  class="post-nav previous"
  href="/${encodeURIComponent(previous.slug)}"
>

  <span class="post-nav-label">
    Previous post
  </span>

  <strong>
    ${escapeHtml(previous.title)}
  </strong>

</a>`;

  } else {

    html += `
<div class="post-nav previous empty"></div>`;

  }


  if (next) {

    html += `
<a
  class="post-nav next"
  href="/${encodeURIComponent(next.slug)}"
>

  <span class="post-nav-label">
    Next post
  </span>

  <strong>
    ${escapeHtml(next.title)}
  </strong>

</a>`;

  } else {

    html += `
<div class="post-nav next empty"></div>`;

  }


  html += `
</div>`;


  return html;

}


/* =========================================
   RENDER POST
   ========================================= */

function renderPost(
  post,
  allPosts,
  template
) {

  const canonical =
    `https://realinsight.netlify.app/${post.slug}`;


  let html =
    template;


  html =
    html.replaceAll(
      "{{POST_DATA}}",
      createPostDataScript(
        post
      )
    );


  html =
    html.replaceAll(
      "{{TITLE}}",
      escapeHtml(
        post.title
      )
    );


  html =
    html.replaceAll(
      "{{EXCERPT}}",
      escapeHtml(
        post.excerpt
      )
    );


  html =
    html.replaceAll(
      "{{CANONICAL}}",
      escapeAttribute(
        canonical
      )
    );


  html =
    html.replaceAll(
      "{{CATEGORY}}",
      escapeHtml(
        post.category
      )
    );


  html =
    html.replaceAll(
      "{{DATE}}",
      escapeHtml(
        post.date
      )
    );


  html =
    html.replaceAll(
      "{{READING_TIME}}",
      escapeHtml(
        post.readingTime
      )
    );


  html =
    html.replaceAll(
      "{{CONTENT}}",
      post.content
    );


  html =
    html.replaceAll(
      "{{TAGS}}",
      renderTags(
        post.tags
      )
    );


  html =
    html.replaceAll(
      "{{RELATED_POSTS}}",
      renderRelatedPosts(
        post,
        allPosts
      )
    );


  html =
    html.replaceAll(
      "{{RECENT_POSTS}}",
      renderRecentPosts(
        allPosts
      )
    );


  html =
    html.replaceAll(
      "{{POST_NAVIGATION}}",
      renderPostNavigation(
        post,
        allPosts
      )
    );


  return html;

}


/* =========================================
   HOMEPAGE POST CARD
   ========================================= */

function renderHomePostCard(
  post
) {

  return `
<a
  class="post-card"
  href="/${encodeURIComponent(post.slug)}"
>

  <span class="post-category">
    ${escapeHtml(post.category)}
  </span>

  <h3>
    ${escapeHtml(post.title)}
  </h3>

  <p class="excerpt">
    ${escapeHtml(post.excerpt)}
  </p>

  <div class="post-meta">

    <span>
      ${escapeHtml(post.date)}
    </span>

    <span class="dot"></span>

    <span>
      ${escapeHtml(post.readingTime)}
    </span>

  </div>

</a>`;

}


/* =========================================
   HOMEPAGE RECENT POST
   ========================================= */

function renderHomeRecentPost(
  post
) {

  return `
<li>

  <a
    href="/${encodeURIComponent(post.slug)}"
  >
    ${escapeHtml(post.title)}
  </a>

  <span class="date">
    ${escapeHtml(post.date)}
  </span>

</li>`;

}


/* =========================================
   REPLACE MARKER CONTENT
   ========================================= */

function replaceBetweenMarkers(
  html,
  startMarker,
  endMarker,
  replacement
) {

  const start =
    html.indexOf(
      startMarker
    );


  const end =
    html.indexOf(
      endMarker
    );


  if (
    start === -1 ||
    end === -1 ||
    end < start
  ) {

    throw new Error(
      `Could not find homepage markers: ${startMarker}`
    );

  }


  return (
    html.slice(
      0,
      start + startMarker.length
    ) +

    "\n" +

    replacement +

    "\n" +

    html.slice(
      end
    )
  );

}


/* =========================================
   BUILD HOMEPAGE
   ========================================= */

function buildHomepage(
  posts
) {

  let html =
    fs.readFileSync(
      INDEX_PATH,
      "utf8"
    );


  const postCards =
    posts
      .map(
        renderHomePostCard
      )
      .join("\n");


  const recentPosts =
    posts
      .slice(0, 5)
      .map(
        renderHomeRecentPost
      )
      .join("\n");


  html =
    replaceBetweenMarkers(
      html,

      "<!-- POSTS_START -->",

      "<!-- POSTS_END -->",

      postCards
    );


  html =
    replaceBetweenMarkers(
      html,

      "<!-- RECENT_POSTS_START -->",

      "<!-- RECENT_POSTS_END -->",

      recentPosts
    );


  /*
   * Show the empty message only when
   * there are no published posts.
   */

  const emptyStateRegex =
    /<div class="empty-state" id="emptyState"[^>]*>/;


  if (
    emptyStateRegex.test(html)
  ) {

    if (posts.length) {

      html =
        html.replace(
          emptyStateRegex,
          '<div class="empty-state" id="emptyState" hidden>'
        );

    } else {

      html =
        html.replace(
          emptyStateRegex,
          '<div class="empty-state" id="emptyState">'
        );

    }

  }


  fs.writeFileSync(
    INDEX_PATH,
    html,
    "utf8"
  );

}


/* =========================================
   BUILD POSTS
   ========================================= */

function buildPosts(
  posts,
  template
) {

  for (
    const post of posts
  ) {

    const output =
      renderPost(
        post,
        posts,
        template
      );


    const filePath =
      path.join(
        POSTS_DIR,
        `${post.slug}.html`
      );


    fs.writeFileSync(
      filePath,
      output,
      "utf8"
    );


    console.log(
      `Built: /${post.slug}`
    );

  }

}


/* =========================================
   MAIN BUILD
   ========================================= */

function build() {

  console.log(
    "Starting Real Insight build..."
  );


  if (
    !fs.existsSync(
      TEMPLATE_PATH
    )
  ) {

    throw new Error(
      "post.html was not found."
    );

  }


  if (
    !fs.existsSync(
      INDEX_PATH
    )
  ) {

    throw new Error(
      "index.html was not found."
    );

  }


  const template =
    fs.readFileSync(
      TEMPLATE_PATH,
      "utf8"
    );


  const posts =
    readPosts();


  console.log(
    `Found ${posts.length} post(s).`
  );


  buildPosts(
    posts,
    template
  );


  buildHomepage(
    posts
  );


  console.log(
    "Real Insight build completed successfully."
  );

}


try {

  build();

} catch (error) {

  console.error(
    "BUILD FAILED:"
  );

  console.error(
    error
  );

  process.exit(1);

}