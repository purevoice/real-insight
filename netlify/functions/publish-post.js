/*
 * Real Insight
 *
 * Netlify Function:
 * Browser → Netlify → GitHub
 *
 * This function:
 * 1. Verifies the publishing access code.
 * 2. Generates the final slug.
 * 3. Sanitizes the article HTML.
 * 4. Gets post.html from GitHub.
 * 5. Creates /posts/slug.html.
 * 6. Commits it to GitHub.
 * 7. Netlify automatically rebuilds the site.
 */

const GITHUB_API =
  "https://api.github.com";

const OWNER =
  process.env.GITHUB_OWNER || "purevoice";

const REPO =
  process.env.GITHUB_REPO || "Real-Insight";

const BRANCH =
  process.env.GITHUB_BRANCH || "main";

const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN;

const ACCESS_CODE =
  process.env.POST_ACCESS_CODE;


/* =========================================
   RESPONSE HELPER
   ========================================= */

function response(
  statusCode,
  data
) {

  return {
    statusCode,

    headers: {
      "Content-Type":
        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin":
        "https://realinsight.netlify.app",

      "Access-Control-Allow-Headers":
        "Content-Type",

      "Access-Control-Allow-Methods":
        "POST, OPTIONS"
    },

    body: JSON.stringify(data)
  };

}


/* =========================================
   GITHUB REQUEST
   ========================================= */

async function githubRequest(
  endpoint,
  options = {}
) {

  if (!GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is not configured."
    );
  }


  const requestOptions = {

    ...options,

    headers: {

      Accept:
        "application/vnd.github+json",

      Authorization:
        `Bearer ${GITHUB_TOKEN}`,

      "X-GitHub-Api-Version":
        "2022-11-28",

      "User-Agent":
        "Real-Insight-Netlify",

      ...(options.headers || {})

    }

  };


  const result =
    await fetch(
      `${GITHUB_API}${endpoint}`,
      requestOptions
    );


  const text =
    await result.text();


  let data = null;


  try {

    data =
      text
        ? JSON.parse(text)
        : null;

  } catch {

    data = {
      message: text
    };

  }


  if (!result.ok) {

    const error =
      new Error(
        data?.message ||
        `GitHub request failed (${result.status}).`
      );

    error.status =
      result.status;

    error.githubData =
      data;

    throw error;

  }


  return data;

}


/* =========================================
   SLUG GENERATOR
   ========================================= */

function slugify(title) {

  let slug =
    String(title || "")
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim()
      .replace(
        /&/g,
        " and "
      )
      .replace(
        /[^a-z0-9\s-]/g,
        ""
      )
      .replace(
        /\s+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      )
      .slice(
        0,
        100
      );


  if (!slug) {

    slug =
      `post-${Date.now()}`;

  }


  return slug;

}


/* =========================================
   HTML ESCAPING
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


/* =========================================
   SANITIZE POST HTML
   ========================================= */

function sanitizeHtml(html) {

  let clean =
    String(html || "");


  /*
   * Remove dangerous elements
   * and their contents.
   */

  clean =
    clean.replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|canvas|video|audio)[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    );


  /*
   * Remove self-closing dangerous elements.
   */

  clean =
    clean.replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|meta|link|base|svg|canvas|video|audio)[^>]*\/?>/gi,
      ""
    );


  /*
   * Remove inline JavaScript event handlers.
   */

  clean =
    clean.replace(
      /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      ""
    );


  /*
   * Remove javascript: URLs.
   */

  clean =
    clean.replace(
      /(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
      ""
    );


  /*
   * Remove data URLs from links.
   */

  clean =
    clean.replace(
      /href\s*=\s*(["'])\s*data:[\s\S]*?\1/gi,
      ""
    );


  /*
   * Remove dangerous protocol values
   * that may have been pasted into HTML.
   */

  clean =
    clean.replace(
      /\s+(href|src)\s*=\s*(["'])\s*(vbscript|javascript):[\s\S]*?\2/gi,
      ""
    );


  return clean.trim();

}


/* =========================================
   READING TIME
   ========================================= */

function calculateReadingTime(
  html
) {

  const text =
    String(html || "")
      .replace(
        /<[^>]*>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const words =
    text
      ? text.split(" ").length
      : 0;


  const minutes =
    Math.max(
      1,
      Math.ceil(
        words / 200
      )
    );


  return `${minutes} min read`;

}


/* =========================================
   LAGOS DATE
   ========================================= */

function getPublishDate() {

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Africa/Lagos",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit"
    }
  ).format(
    new Date()
  );

}


/* =========================================
   POST DATA SCRIPT
   ========================================= */

function createPostDataScript(
  post
) {

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
      post.tags

  };


  /*
   * Escape characters that could
   * accidentally terminate the script tag.
   */

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
   CREATE SOURCE POST
   ========================================= */

function createSourcePost(
  template,
  post
) {

  const canonical =
    `https://realinsight.netlify.app/${post.slug}`;


  const postDataScript =
    createPostDataScript(
      post
    );


  const content =
    `
<!-- REAL_INSIGHT_CONTENT_START -->
${post.content}
<!-- REAL_INSIGHT_CONTENT_END -->
`;


  let html =
    template;


  html =
    html.replaceAll(
      "{{POST_DATA}}",
      postDataScript
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
      canonical
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
      content
    );


  /*
   * These sections are populated later
   * by build.js.
   */

  html =
    html.replaceAll(
      "{{TAGS}}",
      ""
    );


  html =
    html.replaceAll(
      "{{RELATED_POSTS}}",
      ""
    );


  html =
    html.replaceAll(
      "{{RECENT_POSTS}}",
      ""
    );


  html =
    html.replaceAll(
      "{{POST_NAVIGATION}}",
      ""
    );


  return html;

}


/* =========================================
   GET FILE FROM GITHUB
   ========================================= */

async function getGithubFile(
  filePath
) {

  try {

    return await githubRequest(
      `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${filePath}?ref=${encodeURIComponent(BRANCH)}`
    );

  } catch (error) {

    if (
      error.status === 404
    ) {
      return null;
    }

    throw error;

  }

}


/* =========================================
   MAIN FUNCTION
   ========================================= */

exports.handler =
  async function(event) {

    /*
     * Handle browser preflight.
     */

    if (
      event.httpMethod ===
      "OPTIONS"
    ) {

      return response(
        204,
        {}
      );

    }


    if (
      event.httpMethod !==
      "POST"
    ) {

      return response(
        405,
        {
          success: false,
          message:
            "Method not allowed."
        }
      );

    }


    /*
     * Check server configuration.
     */

    if (!ACCESS_CODE) {

      return response(
        500,
        {
          success: false,
          message:
            "POST_ACCESS_CODE is not configured."
        }
      );

    }


    if (!GITHUB_TOKEN) {

      return response(
        500,
        {
          success: false,
          message:
            "GITHUB_TOKEN is not configured."
        }
      );

    }


    /*
     * Parse request.
     */

    let body;

    try {

      body =
        JSON.parse(
          event.body || "{}"
        );

    } catch {

      return response(
        400,
        {
          success: false,
          message:
            "Invalid request."
        }
      );

    }


    /*
     * Verify access code.
     */

    if (
      body.accessCode !==
      ACCESS_CODE
    ) {

      return response(
        401,
        {
          success: false,
          message:
            "Invalid access code."
        }
      );

    }


    const incoming =
      body.post || {};


    /*
     * Validate required fields.
     */

    const title =
      String(
        incoming.title || ""
      ).trim();


    const category =
      String(
        incoming.category || ""
      ).trim();


    const excerpt =
      String(
        incoming.excerpt || ""
      ).trim();


    const rawContent =
      String(
        incoming.content || ""
      ).trim();


    if (!title) {

      return response(
        400,
        {
          success: false,
          message:
            "A post title is required."
        }
      );

    }


    if (!category) {

      return response(
        400,
        {
          success: false,
          message:
            "A category is required."
        }
      );

    }


    if (!excerpt) {

      return response(
        400,
        {
          success: false,
          message:
            "An excerpt is required."
        }
      );

    }


    if (!rawContent) {

      return response(
        400,
        {
          success: false,
          message:
            "Post content is required."
        }
      );

    }


    /*
     * Generate the slug on the server.
     *
     * The server does NOT trust the
     * slug sent by the browser.
     */

    const slug =
      slugify(title);


    /*
     * Sanitize article content.
     */

    const content =
      sanitizeHtml(
        rawContent
      );


    if (!content) {

      return response(
        400,
        {
          success: false,
          message:
            "The post content is empty after sanitization."
        }
      );

    }


    /*
     * Tags.
     */

    const tags =
      Array.isArray(
        incoming.tags
      )

        ? incoming.tags
            .map(
              tag =>
                String(tag)
                  .trim()
            )
            .filter(Boolean)
            .slice(0, 20)

        : [];


    /*
     * Date is generated on the server.
     */

    const date =
      getPublishDate();


    /*
     * Reading time is also calculated
     * from the actual content.
     */

    const readingTime =
      calculateReadingTime(
        content
      );


    const post = {

      title,

      slug,

      category,

      date,

      readingTime,

      excerpt,

      tags,

      content

    };


    try {

      /*
       * Get the current post template.
       */

      const templateFile =
        await getGithubFile(
          "post.html"
        );


      if (!templateFile) {

        return response(
          500,
          {
            success: false,
            message:
              "post.html could not be found in GitHub."
          }
        );

      }


      const template =
        Buffer
          .from(
            templateFile.content,
            "base64"
          )
          .toString(
            "utf8"
          );


      /*
       * Create the source HTML.
       */

      const sourceHtml =
        createSourcePost(
          template,
          post
        );


      /*
       * GitHub path.
       */

      const filePath =
        `posts/${slug}.html`;


      /*
       * Check whether this post
       * already exists.
       */

      const existingFile =
        await getGithubFile(
          filePath
        );


      const commitBody = {

        message:
          existingFile
            ? `Update post: ${title}`
            : `Publish post: ${title}`,

        content:
          Buffer
            .from(
              sourceHtml,
              "utf8"
            )
            .toString(
              "base64"
            ),

        branch:
          BRANCH

      };


      /*
       * Existing GitHub files require
       * their SHA when being updated.
       */

      if (
        existingFile &&
        existingFile.sha
      ) {

        commitBody.sha =
          existingFile.sha;

      }


      /*
       * Create or update the post.
       */

      await githubRequest(
        `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${filePath}`,
        {
          method:
            "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              commitBody
            )
        }
      );


      /*
       * Success.
       */

      return response(
        200,
        {
          success: true,

          message:
            existingFile
              ? "Post updated successfully."
              : "Post published successfully.",

          slug,

          url:
            `/${slug}`,

          githubPath:
            filePath
        }
      );


    } catch (error) {

      console.error(
        "GitHub publishing error:",
        error
      );


      return response(
        error.status === 401
          ? 500
          : 500,

        {
          success: false,

          message:
            error.message ||
            "Unable to publish the post."
        }
      );

    }

  };