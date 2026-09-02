```javascript
/*
 * REAL INSIGHT
 *
 * Categories page.
 *
 * Reads the static posts.json generated
 * during the Netlify build.
 *
 * No Google Apps Script.
 * No Google Sheets.
 */


(function () {

  const categoryList =
    document.getElementById(
      "categoryList"
    );


  if (!categoryList) {
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


  function renderCategories(posts) {

    const categoryMap = {};


    posts.forEach(function (post) {

      const category =
        String(
          post.category || ""
        ).trim();


      if (!category) {
        return;
      }


      if (!categoryMap[category]) {

        categoryMap[category] = 0;

      }


      categoryMap[category]++;

    });


    const categories =
      Object.keys(categoryMap)
        .sort(function (a, b) {

          return a.localeCompare(b);

        });


    if (!categories.length) {

      categoryList.innerHTML = `
        <div class="empty-state">
          No categories have been created yet.
        </div>
      `;

      return;

    }


    categoryList.innerHTML =
      categories
        .map(function (category) {

          const count =
            categoryMap[category];


          const slug =
            createSlug(category);


          const label =
            count === 1
              ? "1 post"
              : `${count} posts`;


          return `
            <a
              class="category-card"
              href="/categories?category=${encodeURIComponent(slug)}"
            >

              <h3>
                ${escapeHtml(category)}
              </h3>

              <p>
                ${label}
              </p>

            </a>
          `;

        })
        .join("");

  }


  async function loadCategories() {

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


      renderCategories(posts);


    } catch (error) {

      console.error(
        "Category loading failed:",
        error
      );


      categoryList.innerHTML = `
        <div class="empty-state">
          Categories could not be loaded.
        </div>
      `;

    }

  }


  loadCategories();

})();
```
