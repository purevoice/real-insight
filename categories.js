/*
 * REAL INSIGHT
 *
 * Dynamic category archive.
 *
 * Example:
 * /category/news/
 * /category/sports/
 * /category/politics/
 *
 * Posts remain at the root:
 * /post-slug
 *
 * Category pages only filter the posts.
 */


(function () {

  const categoryTitle =
    document.getElementById("categoryTitle");

  const categoryDescription =
    document.getElementById("categoryDescription");

  const categoryPostList =
    document.getElementById("categoryPostList");

  const categorySidebar =
    document.getElementById("categorySidebar");

  const pageTitle =
    document.getElementById("pageTitle");

  const pageDescription =
    document.getElementById("pageDescription");


  if (
    !categoryTitle ||
    !categoryPostList
  ) {
    return;
  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  function createSlug(value) {

    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  }


  function getCategoryFromUrl() {

    const path =
      window.location.pathname
        .replace(/^\/+|\/+$/g, "");

    const parts =
      path.split("/");

    if (
      parts.length >= 2 &&
      parts[0].toLowerCase() === "category"
    ) {

      return decodeURIComponent(parts[1]);

    }

    return "";

  }


  function formatDate(value) {

    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (Number.isNaN(date.getTime())) {
      return escapeHtml(value);
    }

    return date.toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    );

  }


  function getPostSlug(post) {

    if (post.slug) {
      return createSlug(post.slug);
    }

    if (post.title) {
      return createSlug(post.title);
    }

    return "";

  }


  function renderPost(post) {

    const slug =
      getPostSlug(post);

    if (!slug) {
      return "";
    }


    const title =
      escapeHtml(
        post.title || "Untitled Post"
      );


    const excerpt =
      escapeHtml(
        post.excerpt || ""
      );


    const date =
      formatDate(
        post.date ||
        post.publishedAt ||
        post.published
      );


    const readingTime =
      escapeHtml(
        post.readingTime || ""
      );


    return `

      <article class="post-card">

        <div class="post-card-content">

          <div class="post-card-meta">

            ${
              date
                ? `<span>${date}</span>`
                : ""
            }

            ${
              readingTime
                ? `<span>${readingTime}</span>`
                : ""
            }

          </div>


          <h2>

            <a href="/${encodeURIComponent(slug)}">

              ${title}

            </a>

          </h2>


          ${
            excerpt
              ? `
                <p>
                  ${excerpt}
                </p>
              `
              : ""
          }


          <a
            href="/${encodeURIComponent(slug)}"
            class="read-more"
          >
            Read more
          </a>

        </div>

      </article>

    `;

  }


  function renderCategories(posts) {

    if (!categorySidebar) {
      return;
    }


    const categoryMap = {};


    posts.forEach(function (post) {

      const category =
        String(
          post.category || ""
        ).trim();


      if (!category) {
        return;
      }


      const slug =
        createSlug(category);


      if (!slug) {
        return;
      }


      if (!categoryMap[slug]) {

        categoryMap[slug] = {
          name: category,
          count: 0
        };

      }


      categoryMap[slug].count++;

    });


    const categories =
      Object.values(categoryMap)
        .sort(function (a, b) {

          return a.name.localeCompare(
            b.name
          );

        });


    if (!categories.length) {

      categorySidebar.innerHTML = "";

      return;

    }


    categorySidebar.innerHTML =
      categories
        .map(function (category) {

          const slug =
            createSlug(category.name);


          const countLabel =
            category.count === 1
              ? "1 post"
              : `${category.count} posts`;


          return `

            <a
              href="/category/${encodeURIComponent(slug)}/"
              class="category-box"
            >

              <span class="category-box-name">
                ${escapeHtml(category.name)}
              </span>

              <span class="category-box-count">
                ${countLabel}
              </span>

            </a>

          `;

        })
        .join("");

  }


  function renderPosts(posts, categorySlug) {

    const matchingPosts =
      posts.filter(function (post) {

        const postCategory =
          String(
            post.category || ""
          ).trim();


        return createSlug(postCategory)
          === categorySlug;

      });


    if (!matchingPosts.length) {

      categoryPostList.innerHTML = `

        <div class="empty-state">

          <h2>
            No posts found
          </h2>

          <p>
            There are currently no published posts in this category.
          </p>

        </div>

      `;

      return;

    }


    categoryPostList.innerHTML =
      matchingPosts
        .map(renderPost)
        .join("");

  }


  async function loadCategory() {

    const categorySlug =
      getCategoryFromUrl();


    if (!categorySlug) {

      categoryTitle.textContent =
        "Category";

      categoryDescription.textContent =
        "Browse published posts by category.";

      categoryPostList.innerHTML = `

        <div class="empty-state">

          Category not found.

        </div>

      `;

      return;

    }


    try {

      const response =
        await fetch(
          "/posts.json",
          {
            cache: "no-cache"
          }
        );


      if (!response.ok) {

        throw new Error(
          "Unable to load posts."
        );

      }


      const data =
        await response.json();


      const posts =
        Array.isArray(data)
          ? data
          : Array.isArray(data.posts)
            ? data.posts
            : [];


      const matchingPost =
        posts.find(function (post) {

          return createSlug(
            String(
              post.category || ""
            ).trim()
          ) === categorySlug;

        });


      const categoryName =
        matchingPost
          ? String(
              matchingPost.category
            ).trim()
          : categorySlug
              .replace(/-/g, " ")
              .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
              });


      categoryTitle.textContent =
        categoryName;


      categoryDescription.textContent =
        `Latest posts in ${categoryName}.`;


      pageTitle.textContent =
        `${categoryName} | Real Insight`;


      pageDescription.setAttribute(
        "content",
        `Browse the latest ${categoryName} news and articles from Real Insight.`
      );


      renderPosts(
        posts,
        categorySlug
      );


      renderCategories(
        posts
      );


    } catch (error) {

      console.error(
        "Category loading failed:",
        error
      );


      categoryPostList.innerHTML = `

        <div class="empty-state">

          <h2>
            Unable to load posts
          </h2>

          <p>
            Please try again later.
          </p>

        </div>

      `;

    }

  }


  loadCategory();

})();