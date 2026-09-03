/*
 * Real Insight Post Publisher
 *
 * Browser
 *   ↓
 * Netlify Function
 *   ↓
 * GitHub repository
 *
 * The GitHub token and admin access code
 * are NEVER exposed to the browser.
 */

const fs = require("fs");
const path = require("path");

const GITHUB_API = "https://api.github.com";

const OWNER =
  process.env.GITHUB_OWNER || "purevoice";

const REPO =
  process.env.GITHUB_REPO || "Real-Insight";

const BRANCH =
  process.env.GITHUB_BRANCH || "main";

const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN;

const ACCESS_CODE =
  process.env.ADMIN_ACCESS_CODE;


/* =========================================
   RESPONSE HELPER
   ========================================= */

function response(
  statusCode,
  body
) {

  return {

    statusCode,

    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin":
        "https://realinsight.netlify.app",
      "Access-Control-Allow-Headers":
        "Content-Type",
      "Access-Control-Allow-Methods":
        "POST, OPTIONS"
    },

    body:
      JSON.stringify(body)

  };

}


/* =========================================
   GITHUB REQUEST
   ========================================= */

async function githubRequest(
  url,
  options = {}
) {

  if (!GITHUB_TOKEN) {

    throw new Error(
      "GITHUB_TOKEN is not configured."
    );

  }


  const headers = {

    "Accept":
      "application/vnd.github+json",

    "Authorization":
      `Bearer ${GITHUB_TOKEN}`,

    "X-GitHub-Api-Version":
      "2022-11-28",

    "User-Agent":
      "Real-Insight-Netlify",

    ...(options.headers || {})

  };


  const result =
    await fetch(
      url,
      {
        ...options,
        headers
      }
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

    data = text;

  }


  if (!result.ok) {

    const message =
      data &&
      typeof data === "object" &&
      data.message

        ? data.message

        : `GitHub request failed with status ${result.status}.`;


    throw new Error(
      message
    );

  }


  return data;

}


/* =========================================
   SLUGIFY
   ========================================= */

function slugify(
  value,
  maxWords = 8,
  maxCharacters = 70
) {

  let slug =
    String(value || "")
      .normalize("NFKD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim();


  /*
   * Convert ampersands to "and".
   */

  slug =
    slug.replace(
      /&/g,
      " and "
    );


  /*
   * Remove apostrophes.
   */

  slug =
    slug.replace(
      /['’]/g,
      ""
    );


  /*
   * Convert anything that isn't
   * a letter or number into a hyphen.
   */

  slug =
    slug.replace(
      /[^a-z0-9]+/g,
      "-"
    );


  /*
   * Remove leading/trailing hyphens.
   */

  slug =
    slug.replace(
      /^-+|-+$/g,
      ""
    );


  /*
   * Limit the slug to a maximum
   * number of words.
   */

  const words =
    slug
      .split("-")
      .filter(Boolean)
      .slice(
        0,
        maxWords
      );


  /*
   * Rebuild the slug while also
   * enforcing the character limit.
   *
   * This prevents one unusually long
   * word from making the URL too long.
   */

  slug = "";

  for (
    const word of words
  ) {

    const nextSlug =
      slug
        ? `${slug}-${word}`
        : word;


    if (
      nextSlug.length >
      maxCharacters
    ) {

      break;

    }


    slug =
      nextSlug;

  }


  /*
   * Remove trailing hyphens just
   * in case the character limit
   * stopped partway through.
   */

  slug =
    slug.replace(
      /-+$/g,
      ""
    );


  /*
   * Fallback if the title somehow
   * produces an empty slug.
   */

  if (!slug) {

    slug =
      `post-${Date.now()}`;

  }


  return slug;

}


/* =========================================
   ESCAPE HTML
   ========================================= */

function escapeHtml(
  value
) {

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
   SANITIZE EDITOR HTML
   ========================================= */

function sanitizeHtml(
  html
) {

  let clean =
    String(html || "");


  /*
   * Remove dangerous elements.
   */

  clean =
    clean.replace(
      /<\s*(script|iframe|object|embed|style|form|input|button|textarea|select|meta|link|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    );


  /*
   * Remove self-closing dangerous elements.
   */

  clean =
    clean.replace(
      /<\s*(script|iframe|object|embed|style|form|input|button|textarea|select|meta|link|base)[^>]*\/?\s*>/gi,
      ""
    );


  /*
   * Remove inline event handlers.
   *
   * Examples:
   * onclick=""
   * onmouseover=""
   * onload=""
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
      /\s+(href|src|action|formaction)\s*=\s*(?:"[^"]*javascript:[^"]*"|'[^']*javascript:[^']*'|[^\s>]*javascript:[^\s>]*)/gi,
      ""
    );


  /*
   * Remove data: URLs from attributes.
   */

  clean =
    clean.replace(
      /\s+(href|src|action|formaction)\s*=\s*(?:"[^"]*data:[^"]*"|'[^']*data:[^']*'|[^\s>]*data:[^\s>]*)/gi,
      ""
    );


  /*
   * Remove contenteditable attributes
   * from published content.
   */

  clean =
    clean.replace(
      /\s+contenteditable\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      ""
    );


  /*
   * Add safe attributes to normal links.
   */

  clean =
    clean.replace(
      /<a\b([^>]*)>/gi,
      function(match, attributes) {

        let result =
          attributes;


        /*
         * Remove existing target/rel so
         * we can add our controlled values.
         */

        result =
          result.replace(
            /\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
          );


        result =
          result.replace(
            /\s+rel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
            ""
          );


        return (
          `<a${result}` +
          ` target="_blank"` +
          ` rel="noopener noreferrer">`
        );

      }
    );


  return clean.trim();

}


/* =========================================
   CALCULATE READING TIME
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


  const wordCount =
    text
      ? text.split(/\s+/).length
      : 0;


  const minutes =
    Math.max(
      1,
      Math.ceil(
        wordCount / 200
      )
    );


  return `${minutes} min read`;

}


/* =========================================
   PUBLISH DATE
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
   CREATE POST DATA SCRIPT
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

publishedAt:
  post.publishedAt,

readingTime:
  post.readingTime,

    excerpt:
      post.excerpt,

    tags:
      post.tags || []

  };


  const json =
    JSON.stringify(
      data
    )
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

  const siteUrl =
    (
      process.env.NETLIFY_SITE_URL ||
      process.env.URL ||
      "https://realinsight.netlify.app"
    )
    .replace(
      /\/+$/,
      ""
    );


  const canonical =
    `${siteUrl}/${post.slug}`;


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
      escapeHtml(
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


  /*
   * This is the important part.
   *
   * build.js uses these markers to
   * recover the original article content.
   */

  html =
    html.replaceAll(
      "{{CONTENT}}",
      `<!-- REAL_INSIGHT_CONTENT_START -->
${post.content}
<!-- REAL_INSIGHT_CONTENT_END -->`
    );


  /*
   * These are deliberately left empty.
   *
   * build.js generates:
   *
   * - tags
   * - related posts
   * - recent posts
   * - previous/next navigation
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

  const url =
    `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(BRANCH)}`;


  try {

    return await githubRequest(
      url,
      {
        method: "GET"
      }
    );

  } catch (error) {

    /*
     * GitHub returns 404 when the file
     * doesn't exist.
     */

    if (
      error.message
        .toLowerCase()
        .includes("not found")
    ) {

      return null;

    }


    throw error;

  }

}


/* =========================================
   CHECK IF SLUG EXISTS
   ========================================= */

async function postExists(
  slug
) {

  const filePath =
    `${slug}.html`;


  const existing =
    await getGithubFile(
      filePath
    );


  return existing !== null;

}


/* =========================================
   NETLIFY FUNCTION HANDLER
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


    /*
     * Only POST is allowed.
     */

    if (
      event.httpMethod !==
      "POST"
    ) {

      return response(
        405,
        {
          success: false,
          error:
            "Method not allowed."
        }
      );

    }


    /*
     * Check server configuration.
     */

    if (!ACCESS_CODE) {

      console.error(
        "ADMIN_ACCESS_CODE is not configured."
      );


      return response(
        500,
        {
          success: false,
          error:
            "Publishing is not configured."
        }
      );

    }


    if (!GITHUB_TOKEN) {

      console.error(
        "GITHUB_TOKEN is not configured."
      );


      return response(
        500,
        {
          success: false,
          error:
            "Publishing is not configured."
        }
      );

    }


    /* =====================================
       PARSE REQUEST
       ===================================== */

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
          error:
            "Invalid request."
        }
      );

    }


    const suppliedAccessCode =
      String(
        body.accessCode || ""
      );


    /*
     * Verify the publishing access code.
     *
     * The actual code remains on the
     * server and is never returned.
     */

    if (
      suppliedAccessCode !==
      ACCESS_CODE
    ) {

      return response(
        401,
        {
          success: false,
          error:
            "Invalid access code."
        }
      );

    }


    /* =====================================
       VALIDATE POST
       ===================================== */

    const submittedPost =
      body.post || {};


    const title =
      String(
        submittedPost.title || ""
      ).trim();


    const category =
      String(
        submittedPost.category || ""
      ).trim();


    const excerpt =
      String(
        submittedPost.excerpt || ""
      ).trim();


    const content =
      String(
        submittedPost.content || ""
      ).trim();


    if (!title) {

      return response(
        400,
        {
          success: false,
          error:
            "Title is required."
        }
      );

    }


    if (!category) {

      return response(
        400,
        {
          success: false,
          error:
            "Category is required."
        }
      );

    }


    if (!excerpt) {

      return response(
        400,
        {
          success: false,
          error:
            "Excerpt is required."
        }
      );

    }


    if (!content) {

      return response(
        400,
        {
          success: false,
          error:
            "Content is required."
        }
      );

    }


    /* =====================================
       CREATE SERVER-SIDE POST DATA
       ===================================== */

    const slug =
      slugify(
        title
      );


    const cleanContent =
      sanitizeHtml(
        content
      );


    if (!cleanContent) {

      return response(
        400,
        {
          success: false,
          error:
            "Post content is empty after sanitization."
        }
      );

    }


    let tags = [];


    if (
      Array.isArray(
        submittedPost.tags
      )
    ) {

      tags =
        submittedPost.tags
          .map(function(tag) {

            return String(
              tag
            ).trim();

          })
          .filter(Boolean)
          .slice(
            0,
            20
          );

    }


    const post = {

      title,

      slug,

      category,

      date:
  getPublishDate(),

publishedAt:
  new Date().toISOString(),

      readingTime:
        calculateReadingTime(
          cleanContent
        ),

      excerpt,

      tags,

      content:
        cleanContent

    };


    /* =====================================
       LOAD POST TEMPLATE
       ===================================== */

    const templateFile =
      await getGithubFile(
        "post.html"
      );


    if (!templateFile) {

      return response(
        500,
        {
          success: false,
          error:
            "post.html was not found in the GitHub repository."
        }
      );

    }


    let template;


    try {

      template =
        Buffer.from(
          templateFile.content,
          "base64"
        ).toString(
          "utf8"
        );

    } catch (error) {

      console.error(
        "Could not decode post.html:",
        error
      );


      return response(
        500,
        {
          success: false,
          error:
            "Could not read post template."
        }
      );

    }


    /* =====================================
       CREATE POST HTML
       ===================================== */

    const sourcePost =
      createSourcePost(
        template,
        post
      );


    const encodedContent =
      Buffer.from(
        sourcePost,
        "utf8"
      ).toString(
        "base64"
      );


    /*
     * IMPORTANT:
     *
     * The post is stored at the ROOT.
     *
     * Example:
     *
     * iran-fires-on-its-gulf-neighbors.html
     *
     * NOT:
     *
     * posts/iran-fires-on-its-gulf-neighbors.html
     */

    const filePath =
      `${slug}.html`;


    /* =====================================
       CHECK FOR EXISTING POST
       ===================================== */

    const existing =
      await getGithubFile(
        filePath
      );


    /*
     * If a file with the same slug exists,
     * update it.
     *
     * Otherwise create it.
     */

    const githubBody = {

      message:
        existing
          ? `Update post: ${title}`
          : `Publish post: ${title}`,

      content:
        encodedContent,

      branch:
        BRANCH

    };


    if (
      existing &&
      existing.sha
    ) {

      githubBody.sha =
        existing.sha;

    }


    /* =====================================
       WRITE TO GITHUB
       ===================================== */

    const githubUrl =
      `${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filePath)}`;


    let result;


    try {

      result =
        await githubRequest(
          githubUrl,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                githubBody
              )

          }
        );

    } catch (error) {

      console.error(
        "GitHub publish error:",
        error
      );


      return response(
        500,
        {
          success: false,
          error:
            "Could not publish the post to GitHub."
        }
      );

    }


    /* =====================================
       SUCCESS
       ===================================== */

    return response(
      200,
      {
        success: true,

        message:
          existing
            ? "Post updated successfully."
            : "Post published successfully.",

        slug:
          post.slug,

        url:
          `/${post.slug}`,

        githubPath:
          filePath,

        commit:
          result &&
          result.commit
            ? result.commit.sha
            : null

      }
    );

  };