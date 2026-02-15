// SAPNIN — Act like a fucking human.
// Kills likes, emoji-only replies, and short lazy comments on Facebook.

(function sapnin() {
  "use strict";

  const MIN_CHARS = 20;
  const EMOJI_REGEX = /^[\s\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2700}-\u{27BF}\u{231A}-\u{23F3}\u{2934}-\u{2935}\u{25AA}-\u{25FE}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{00A9}\u{00AE}\u{2122}\u{23CF}\u{23E9}-\u{23EF}\u{23F8}-\u{23FA}\u{25FB}-\u{25FE}\u{2615}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}]+$/u;

  // --- Nuke elements that match lazy-engagement selectors ---
  const KILL_SELECTORS = [
    '[aria-label="Like"]',
    '[aria-label="like"]',
    '[data-testid="like_button"]',
    '[data-testid="UFI2ReactionActionLink"]',
    '[aria-label="Add a GIF"]',
    '[aria-label="Choose a GIF"]',
  ].join(", ");

  function nukeElements() {
    document.querySelectorAll(KILL_SELECTORS).forEach((el) => {
      el.remove();
    });
  }

  // --- Check if text is emoji-only (no real words) ---
  function isEmojiOnly(text) {
    const stripped = text.replace(/\s/g, "");
    if (stripped.length === 0) return true;
    // Remove all emoji and see if anything remains
    const withoutEmoji = stripped.replace(
      /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2700}-\u{27BF}\u{231A}-\u{23F3}\u{2934}-\u{2935}\u{25AA}-\u{25FE}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{00A9}\u{00AE}\u{2122}\u{23CF}\u{23E9}-\u{23EF}\u{23F8}-\u{23FA}\u{25FB}-\u{25FE}\u{2615}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}]/gu,
      ""
    );
    return withoutEmoji.trim().length === 0;
  }

  // --- Extract plain text from a contenteditable comment box ---
  function getCommentText(el) {
    return (el.textContent || el.innerText || "").trim();
  }

  // --- Show a Sapnin warning near the comment box ---
  function showWarning(target, message) {
    // Don't stack warnings
    const existing = target.parentElement?.querySelector(".sapnin-warning");
    if (existing) existing.remove();

    const warning = document.createElement("div");
    warning.className = "sapnin-warning";
    warning.textContent = "SAPNIN: " + message;
    target.parentElement?.appendChild(warning);

    setTimeout(() => warning.remove(), 5000);
  }

  // --- Intercept comment submissions ---
  function interceptSubmit(e) {
    // Facebook submits comments on Enter (no shift)
    if (e.key !== "Enter" || e.shiftKey) return;

    const target = e.target;
    // Only act on contenteditable areas (Facebook comment boxes)
    if (
      !target.isContentEditable &&
      target.getAttribute("role") !== "textbox"
    ) {
      return;
    }

    const text = getCommentText(target);

    if (isEmojiOnly(text)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showWarning(target, "Emoji-only? Say something real. Use your words.");
      return;
    }

    // Count actual characters (not emoji)
    const realLength = text.length;
    if (realLength < MIN_CHARS) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showWarning(
        target,
        `${realLength}/${MIN_CHARS} chars. That's not a thought, that's a grunt.`
      );
      return;
    }
  }

  // --- Intercept form-based submissions as a fallback ---
  function interceptFormSubmit(e) {
    const form = e.target;
    const textboxes = form.querySelectorAll(
      '[contenteditable="true"], [role="textbox"]'
    );
    for (const box of textboxes) {
      const text = getCommentText(box);
      if (isEmojiOnly(text)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showWarning(box, "Emoji-only? Say something real. Use your words.");
        return;
      }
      if (text.length < MIN_CHARS) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showWarning(
          box,
          `${text.length}/${MIN_CHARS} chars. That's not a thought, that's a grunt.`
        );
        return;
      }
    }
  }

  // --- Set up listeners ---
  // Capture phase so we fire before Facebook's handlers
  document.addEventListener("keydown", interceptSubmit, true);
  document.addEventListener("submit", interceptFormSubmit, true);

  // --- MutationObserver: Facebook is an SPA, DOM changes constantly ---
  const observer = new MutationObserver(() => {
    nukeElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial pass
  nukeElements();

  console.log(
    "%cSAPNIN active. Act like a human.",
    "color: #ff4444; font-weight: bold; font-size: 14px;"
  );
})();
