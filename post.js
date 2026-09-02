/*
 * Real Insight post page
 *
 * Handles social sharing only.
 * Navigation and footer year are handled by app.js.
 */


async function sharePost(type) {

  const url =
    window.location.href;

  const title =
    document.title;


  /*
   * Copy link
   */

  if (type === "copy") {

    try {

      await navigator.clipboard.writeText(url);

      alert("Link copied.");

    } catch (error) {

      console.error(
        "Unable to copy link:",
        error
      );

      alert("Unable to copy link.");

    }

    return;
  }


  /*
   * Social sharing
   */

  const encodedUrl =
    encodeURIComponent(url);

  const encodedTitle =
    encodeURIComponent(title);


  const shareLinks = {

    twitter:
      "https://twitter.com/intent/tweet?url=" +
      encodedUrl +
      "&text=" +
      encodedTitle,

    facebook:
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodedUrl,

    linkedin:
      "https://www.linkedin.com/sharing/share-offsite/?url=" +
      encodedUrl

  };


  if (shareLinks[type]) {

    window.open(
      shareLinks[type],
      "_blank",
      "noopener,noreferrer"
    );

  }

}