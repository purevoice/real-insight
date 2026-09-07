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
  slugPreview.textContent =
    slug || "your-post-title";
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

  if (editor.contains(range.commonAncestorContainer)) {
    savedRange = range.cloneRange();
  }
}


function restoreSelection() {
  editor.focus();

  if (!savedRange) {
    return;
  }

  const selection = window.getSelection();

  selection.removeAllRanges();
  selection.addRange(savedRange);
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

editor.addEventListener(
  "input",
  function() {
    saveSelection();
    syncContent();
  }
);


/*
 * Save the selection before the toolbar
 * button takes focus away from the editor.
 */

document
  .querySelectorAll(".editor-toolbar button")
  .forEach(function(button) {

    button.addEventListener(
      "mousedown",
      function(event) {
        event.preventDefault();
        saveSelection();
      }
    );

  });


/* =========================================
   SYNC EDITOR CONTENT
   ========================================= */

function syncContent() {
  contentInput.value =
    cleanEditorHTML(
      editor.innerHTML
    );
}


/* =========================================
   FORMATTING
   ========================================= */

function executeCommand(
  command,
  value = null
) {

  restoreSelection();

  document.execCommand(
    command,
    false,
    value
  );

  syncContent();

  saveSelection();

  editor.focus();
}


/* =========================================
   STANDARD TOOLBAR COMMANDS
   ========================================= */

document
  .querySelectorAll(
    ".editor-toolbar button[data-command]"
  )
  .forEach(function(button) {

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


if (formatBlock) {

  formatBlock.addEventListener(
    "change",
    function() {

      executeCommand(
        "formatBlock",
        formatBlock.value
      );

    }
  );

}


/* =========================================
   BLOCKQUOTE
   ========================================= */

const blockquoteButton =
  document.getElementById(
    "blockquoteButton"
  );


if (blockquoteButton) {

  blockquoteButton.addEventListener(
    "click",
    function() {

      restoreSelection();

      const selection =
        window.getSelection();

      let node =
        selection.anchorNode;

      if (
        node &&
        node.nodeType === Node.TEXT_NODE
      ) {
        node = node.parentElement;
      }

      const existingBlockquote =
        node &&
        node.closest &&
        node.closest("blockquote");

      if (existingBlockquote) {

        document.execCommand(
          "formatBlock",
          false,
          "p"
        );

      } else {

        document.execCommand(
          "formatBlock",
          false,
          "blockquote"
        );

      }

      syncContent();

      saveSelection();

      editor.focus();

    }
  );

}


/* =========================================
   LINK
   ========================================= */

const linkButton =
  document.getElementById(
    "linkButton"
  );


if (linkButton) {

  linkButton.addEventListener(
    "click",
    function() {

      restoreSelection();

      const selection =
        window.getSelection();

      const selectedText =
        selection
          ? selection.toString()
          : "";

      const url =
        window.prompt(
          "Enter the URL:",
          "https://"
        );

      if (!url) {
        editor.focus();
        return;
      }

      const trimmedUrl =
        url.trim();

      if (
        !/^https?:\/\//i.test(
          trimmedUrl
        )
      ) {
        showError(
          "Please enter a valid URL starting with http:// or https://."
        );

        editor.focus();
        return;
      }

      executeCommand(
        "createLink",
        trimmedUrl
      );

      /*
       * If there was no selected text,
       * createLink has nothing to wrap.
       * Insert the URL as linked text instead.
       */

      if (!selectedText) {

        restoreSelection();

        const link =
          document.createElement("a");

        link.href =
          trimmedUrl;

        link.target =
          "_blank";

        link.rel =
          "noopener noreferrer";

        link.textContent =
          trimmedUrl;

        const selectionNow =
          window.getSelection();

        if (
          selectionNow &&
          selectionNow.rangeCount
        ) {

          const range =
            selectionNow.getRangeAt(0);

          range.deleteContents();

          range.insertNode(link);

          range.setStartAfter(link);
          range.collapse(true);

          selectionNow.removeAllRanges();
          selectionNow.addRange(range);

        }

        syncContent();

      }

    }
  );

}


/* =========================================
   REMOVE LINK
   ========================================= */

const unlinkButton =
  document.querySelector(
    '[data-command="unlink"]'
  );


if (unlinkButton) {

  unlinkButton.addEventListener(
    "click",
    function() {

      executeCommand("unlink");

    }
  );

}


/* =========================================
   IMAGE INSERTION
   ========================================= */

const imageButton =
  document.getElementById(
    "imageButton"
  );

const imageDialog =
  document.getElementById(
    "imageDialog"
  );

const imageUrlInput =
  document.getElementById(
    "imageUrl"
  );

const imageAltInput =
  document.getElementById(
    "imageAlt"
  );

const cancelImageButton =
  document.getElementById(
    "cancelImageButton"
  );

const insertImageButton =
  document.getElementById(
    "insertImageButton"
  );


if (
  imageButton &&
  imageDialog
) {

  imageButton.addEventListener(
    "click",
    function() {

      saveSelection();

      imageUrlInput.value = "";
      imageAltInput.value = "";

      imageDialog.showModal();

      setTimeout(
        function() {
          imageUrlInput.focus();
        },
        50
      );

    }
  );

}


if (cancelImageButton) {

  cancelImageButton.addEventListener(
    "click",
    function() {

      imageDialog.close();

      editor.focus();

    }
  );

}


if (insertImageButton) {

  insertImageButton.addEventListener(
    "click",
    function() {

      const url =
        imageUrlInput.value.trim();

      const alt =
        imageAltInput.value.trim();

      if (!url) {

        imageUrlInput.focus();

        return;

      }

      if (
        !/^https?:\/\//i.test(url)
      ) {

        showError(
          "Please enter a valid image URL starting with http:// or https://."
        );

        imageUrlInput.focus();

        return;

      }

      restoreSelection();

      const image =
        document.createElement("img");

      image.src = url;
      image.alt = alt;

      /*
       * Keep images responsive inside
       * the published article.
       */

      image.loading = "lazy";

      image.style.maxWidth = "100%";
      image.style.height = "auto";

      const selection =
        window.getSelection();

      if (
        selection &&
        selection.rangeCount
      ) {

        const range =
          selection.getRangeAt(0);

        range.deleteContents();

        /*
         * Add a paragraph before/after the
         * image when needed so images don't
         * run directly into surrounding text.
         */

        const paragraph =
          document.createElement("p");

        paragraph.appendChild(image);

        range.insertNode(paragraph);

        range.setStartAfter(paragraph);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);

      } else {

        editor.appendChild(
          document.createElement("p")
        );

        const paragraph =
          editor.lastElementChild;

        paragraph.appendChild(image);

      }

      syncContent();

      imageDialog.close();

      saveSelection();

      editor.focus();

    }
  );

}


/* =========================================
   HORIZONTAL RULE
   ========================================= */

const horizontalRuleButton =
  document.getElementById(
    "horizontalRuleButton"
  );


if (horizontalRuleButton) {

  horizontalRuleButton.addEventListener(
    "click",
    function() {

      executeCommand(
        "insertHorizontalRule"
      );

    }
  );

}


/* =========================================
   UNDO / REDO
   ========================================= */

const undoButton =
  document.getElementById(
    "undoButton"
  );

const redoButton =
  document.getElementById(
    "redoButton"
  );


if (undoButton) {

  undoButton.addEventListener(
    "click",
    function() {

      executeCommand("undo");

    }
  );

}


if (redoButton) {

  redoButton.addEventListener(
    "click",
    function() {

      executeCommand("redo");

    }
  );

}


/* =========================================
   CLEAN EDITOR HTML
   ========================================= */

function cleanEditorHTML(html) {

  const container =
    document.createElement("div");

  container.innerHTML = html;


  /*
   * Remove unwanted editor attributes.
   */

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


  /*
   * Clean links.
   */

  container
    .querySelectorAll("a")
    .forEach(function(link) {

      const href =
        link.getAttribute("href") || "";

      /*
       * Remove dangerous URLs.
       */

      if (
        /^(javascript|data|vbscript):/i.test(
          href.trim()
        )
      ) {

        link.replaceWith(
          document.createTextNode(
            link.textContent
          )
        );

        return;

      }

      link.setAttribute(
        "target",
        "_blank"
      );

      link.setAttribute(
        "rel",
        "noopener noreferrer"
      );

    });


  /*
   * Clean images.
   */

  container
    .querySelectorAll("img")
    .forEach(function(image) {

      const src =
        image.getAttribute("src") || "";

      if (
        /^(javascript|data|vbscript):/i.test(
          src.trim()
        )
      ) {

        image.remove();

        return;

      }

      image.removeAttribute("style");
      image.removeAttribute("class");

      image.setAttribute(
        "loading",
        "lazy"
      );

      /*
       * Always keep an alt attribute,
       * even when the editor user leaves
       * it empty.
       */

      if (
        !image.hasAttribute("alt")
      ) {

        image.setAttribute(
          "alt",
          ""
        );

      }

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
    message.className =
      "form-message";


    /*
     * Always sync the editor immediately
     * before collecting the post content.
     */

    syncContent();


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

      showError(
        "Please enter a title."
      );

      titleInput.focus();

      return;

    }


    if (!slug) {

      showError(
        "A valid URL could not be generated from the title."
      );

      return;

    }


    if (!category) {

      showError(
        "Please enter a category."
      );

      categoryInput.focus();

      return;

    }


    if (!excerpt) {

      showError(
        "Please enter an excerpt."
      );

      excerptInput.focus();

      return;

    }


    if (!content) {

      showError(
        "Please write the post content."
      );

      editor.focus();

      return;

    }


    if (!accessCode) {

      showError(
        "Please enter the access code."
      );

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

        result =
          await response.json();

      } catch {

        throw new Error(
          "The publishing server returned an invalid response."
        );

      }


      if (
        !response.ok ||
        !result.success
      ) {

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

      contentInput.value = "";

      slugInput.value = "";

      slugPreview.textContent =
        "your-post-title";

      savedRange = null;


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