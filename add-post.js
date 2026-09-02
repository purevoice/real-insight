/*
 * REAL INSIGHT
 *
 * New post editor and GitHub publisher.
 *
 * Posts are published through:
 *
 * Browser
 *    ↓
 * Netlify Function
 *    ↓
 * GitHub
 *    ↓
 * Netlify build
 */

const form = document.getElementById("postForm");
const titleInput = document.getElementById("title");
const slugInput = document.getElementById("slug");
const slugPreview = document.getElementById("slugPreview");

const categoryInput = document.getElementById("category");
const readingTimeInput = document.getElementById("readingTime");
const excerptInput = document.getElementById("excerpt");

const editor = document.getElementById("contentEditor");
const contentInput = document.getElementById("content");

const tagsInput = document.getElementById("tags");
const accessCodeInput = document.getElementById("accessCode");

const message = document.getElementById("formMessage");
const publishButton = document.getElementById("publishButton");

let savedRange = null;


/* =========================================
   SLUG GENERATION
   ========================================= */

function generateSlug(title) {
  return String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}


function updateSlug() {
  const slug = generateSlug(titleInput.value);

  slugInput.value = slug;
  slugPreview.textContent = slug || "your-post-title";
}


titleInput.addEventListener(
  "input",
  updateSlug
);


/* =========================================
   EDITOR SELECTION
   ========================================= */

function saveSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);

  if (
    editor.contains(range.commonAncestorContainer)
  ) {
    savedRange = range.cloneRange();
  }
}


function restoreSelection() {
  if (!savedRange) {
    editor.focus();
    return;
  }

  const selection = window.getSelection();

  selection.removeAllRanges();
  selection.addRange(savedRange);

  editor.focus();
}


editor.addEventListener(
  "mouseup",
  saveSelection
);

editor.addEventListener(
  "keyup",
  saveSelection
);

editor.addEventListener(
  "focus",
  saveSelection
);


/* =========================================
   FORMATTING
   ========================================= */

function executeCommand(command, value = null) {
  restoreSelection();

  document.execCommand(
    command,
    false,
    value
  );

  saveSelection();

  editor.focus();
}


document
  .querySelectorAll(
    ".editor-toolbar button[data-command]"
  )
  .forEach(function(button) {

    button.addEventListener(
      "mousedown",
      function(event) {
        event.preventDefault();
      }
    );

    button.addEventListener(
      "click",
      function() {

        executeCommand(
          button.dataset.command
        );

      }
    );

  });


/* =========================================
   HEADINGS / PARAGRAPHS
   ========================================= */

const formatBlock =
  document.getElementById("formatBlock");


formatBlock.addEventListener(
  "change",
  function() {

    executeCommand(
      "formatBlock",
      formatBlock.value
    );

  }
);


/* =========================================
   BLOCKQUOTE
   ========================================= */

const blockquoteButton =
  document.getElementById(
    "blockquoteButton"
  );


blockquoteButton.addEventListener(
  "mousedown",
  function(event) {
    event.preventDefault();
  }
);


blockquoteButton.addEventListener(
  "click",
  function() {

    executeCommand(
      "formatBlock",
      "blockquote"
    );

  }
);


/* =========================================
   LINK
   ========================================= */

const linkButton =
  document.getElementById(
    "linkButton"
  );


linkButton.addEventListener(
  "mousedown",
  function(event) {
    event.preventDefault();
  }
);


linkButton.addEventListener(
  "click",
  function() {

    restoreSelection();

    const url =
      window.prompt(
        "Enter the URL:",
        "https://"
      );

    if (!url) {
      editor.focus();
      return;
    }

    executeCommand(
      "createLink",
      url
    );

  }
);


/* =========================================
   HORIZONTAL RULE
   ========================================= */

const horizontalRuleButton =
  document.getElementById(
    "horizontalRuleButton"
  );


horizontalRuleButton.addEventListener(
  "mousedown",
  function(event) {
    event.preventDefault();
  }
);


horizontalRuleButton.addEventListener(
  "click",
  function() {

    executeCommand(
      "insertHorizontalRule"
    );

  }
);


/* =========================================
   CLEAN EDITOR HTML
   ========================================= */

function cleanEditorHTML(html) {

  const container =
    document.createElement("div");

  container.innerHTML = html;

  container
    .querySelectorAll(
      "[style], [class]"
    )
    .forEach(function(element) {

      element.removeAttribute("style");

      /*
       * Keep only classes that we
       * explicitly want.
       */

      if (
        element.classList.contains("lead")
      ) {
        element.setAttribute(
          "class",
          "lead"
        );
      } else {
        element.removeAttribute("class");
      }

    });


  container
    .querySelectorAll("a")
    .forEach(function(link) {

      link.setAttribute(
        "target",
        "_blank"
      );

      link.setAttribute(
        "rel",
        "noopener noreferrer"
      );

    });


  return container.innerHTML.trim();
}


/* =========================================
   READING TIME
   ========================================= */

function calculateReadingTime(html) {

  const temp =
    document.createElement("div");

  temp.innerHTML = html;

  const text =
    temp.textContent
      .replace(/\s+/g, " ")
      .trim();

  const words =
    text
      ? text.split(" ").length
      : 0;

  const minutes =
    Math.max(
      1,
      Math.ceil(words / 200)
    );

  return `${minutes} min read`;
}


/* =========================================
   PUBLISH
   ========================================= */

form.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    message.textContent = "";
    message.className = "form-message";

    const title =
      titleInput.value.trim();

    const slug =
      generateSlug(title);

    const category =
      categoryInput.value.trim();

    const excerpt =
      excerptInput.value.trim();

    const content =
      cleanEditorHTML(
        editor.innerHTML
      );

    const tags =
      tagsInput.value
        .split(",")
        .map(function(tag) {
          return tag.trim();
        })
        .filter(Boolean);

    const accessCode =
      accessCodeInput.value;


    if (!title) {
      showError("Please enter a title.");
      titleInput.focus();
      return;
    }


    if (!slug) {
      showError("A valid URL could not be generated from the title.");
      return;
    }


    if (!category) {
      showError("Please enter a category.");
      categoryInput.focus();
      return;
    }


    if (!excerpt) {
      showError("Please enter an excerpt.");
      excerptInput.focus();
      return;
    }


    if (!content) {
      showError("Please write the post content.");
      editor.focus();
      return;
    }


    if (!accessCode) {
      showError("Please enter the access code.");
      accessCodeInput.focus();
      return;
    }


    const readingTime =
      readingTimeInput.value.trim() ||
      calculateReadingTime(content);


    const post = {

      title,

      slug,

      category,

      date:
        new Date()
          .toISOString()
          .slice(0, 10),

      readingTime,

      excerpt,

      tags,

      content

    };


    publishButton.disabled = true;
    publishButton.textContent =
      "Publishing...";


    try {

      const response =
        await fetch(
          "/.netlify/functions/publish-post",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              post,
              accessCode
            })
          }
        );


      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The publishing server returned an invalid response."
        );
      }


      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Publishing failed."
        );
      }


      message.className =
        "form-message success";

      message.innerHTML =
        `
          <strong>Post published successfully.</strong><br>
          GitHub has received the post and Netlify will rebuild the site.
          <br><br>
          <a
            href="/${encodeURIComponent(slug)}"
            target="_blank"
            rel="noopener"
          >
            View post
          </a>
        `;


      form.reset();

      editor.innerHTML = "";

      slugInput.value = "";
      slugPreview.textContent =
        "your-post-title";


    } catch (error) {

      console.error(
        "Publishing error:",
        error
      );

      showError(
        error.message ||
        "Publishing failed."
      );

    } finally {

      publishButton.disabled = false;

      publishButton.textContent =
        "Publish Post";

    }

  }
);


/* =========================================
   MESSAGES
   ========================================= */

function showError(text) {

  message.className =
    "form-message error";

  message.textContent =
    text;

}