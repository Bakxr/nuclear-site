// Posting page for one X draft, linked from the owner's morning email.
// Email can't touch the clipboard, but a page can: copy the chart image and
// paste it into X, or on a phone hand image + text to the X app through the
// share sheet. The draft travels in the signed URL (see cardLinks.js).
// Served by api/social/card.js (?view=post, via the /api/social/post rewrite):
// the Hobby plan caps a deployment at 12 functions.

import { cardUrl } from "./cardLinks.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderSharePage(draft) {
  const image = draft.card ? cardUrl("", draft.card) : null;
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(draft.text)}`;
  // JSON inside <script>: escape "<" so text can't close the tag.
  const data = JSON.stringify({ text: draft.text, reply: draft.reply, image, kind: draft.kind }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" type="image/png" href="/pwa-192.png" />
<title>Post: ${esc(draft.kind)} | Nuclear Pulse</title>
<style>
  :root { color-scheme: dark; --bg: #100d09; --surface: #1a1712; --text: #f5f0e8; --body: #d9cfbe; --muted: #b3a489; --line: rgba(245,240,232,0.12); --gold: #d4a54a; --up: #4ade80; --down: #f87171; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 640px; margin: 0 auto; padding: 20px 16px 48px; }
  .eyebrow { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--gold); font-weight: 700; margin: 0 0 14px; }
  h2 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 28px 0 10px; }
  img { display: block; width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--line); }
  .text { white-space: pre-wrap; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px; margin: 0; font: inherit; }
  .reply { font-family: ui-monospace, "Courier New", monospace; font-size: 14px; border-style: dashed; border-color: rgba(212,165,74,.35); word-break: break-all; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
  button, a.btn { appearance: none; border: 1px solid rgba(212,165,74,.5); background: transparent; color: var(--gold); border-radius: 8px; padding: 12px 16px; font: 700 14px/1 system-ui, sans-serif; text-decoration: none; cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; }
  .primary { background: var(--gold); color: #14120e; border-color: var(--gold); }
  .status { min-height: 1.5em; font-size: 14px; color: var(--up); margin: 10px 0 0; }
  .status.err { color: var(--down); }
  .hint { font-size: 14px; color: var(--muted); margin: 8px 0 0; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<main>
  <p class="eyebrow">${esc(draft.kind)}</p>

  <div id="share-block" hidden>
    <button class="primary" id="share" type="button">Share image + text to X</button>
    <p class="hint">Opens your share sheet. Pick X, and the image and text arrive together.</p>
  </div>

  ${image ? `<h2>1. Image</h2>
  <img src="${esc(image)}" width="1200" height="675" alt="${esc(draft.kind)} chart" />
  <div class="row"><button id="copy-image" type="button">Copy image</button><a class="btn" href="${esc(image)}" download="nuclear-pulse.png">Download</a></div>` : ""}

  <h2>${image ? "2" : "1"}. Post</h2>
  <p class="text" id="post-text"></p>
  <div class="row"><a class="btn primary" id="open-x" href="${esc(intent)}" target="_blank" rel="noopener">Open X with this text</a><button id="copy-text" type="button">Copy text</button></div>
  ${image ? `<p class="hint">After X opens, press Ctrl+V (Cmd+V on a Mac) in the post box to paste the copied image.</p>` : ""}

  ${draft.reply ? `<h2>${image ? "3" : "2"}. Reply to your post with the link</h2>
  <p class="text reply" id="reply-text"></p>
  <div class="row"><button id="copy-reply" type="button">Copy reply</button></div>` : ""}

  <p class="status" id="status" role="status" aria-live="polite"></p>
</main>
<script>
(function () {
  var draft = ${data};
  var status = document.getElementById("status");
  function say(msg, bad) { status.textContent = msg; status.className = bad ? "status err" : "status"; }
  document.getElementById("post-text").textContent = draft.text;
  var replyEl = document.getElementById("reply-text");
  if (replyEl) replyEl.textContent = draft.reply;

  function copyText(text, label) {
    navigator.clipboard.writeText(text).then(function () { say(label + " copied."); }, function () { say("Couldn't copy. Select the text and copy it by hand.", true); });
  }
  document.getElementById("copy-text").addEventListener("click", function () { copyText(draft.text, "Post text"); });
  var copyReply = document.getElementById("copy-reply");
  if (copyReply) copyReply.addEventListener("click", function () { copyText(draft.reply, "Reply"); });

  function imageBlob() {
    return fetch(draft.image).then(function (res) { if (!res.ok) throw new Error("image " + res.status); return res.blob(); })
      .then(function (blob) { return blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" }); });
  }

  var copyImage = document.getElementById("copy-image");
  if (copyImage) {
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      copyImage.hidden = true;
    } else {
      copyImage.addEventListener("click", function () {
        // Pass the promise straight to ClipboardItem: Safari needs the write
        // to start inside the click.
        navigator.clipboard.write([new ClipboardItem({ "image/png": imageBlob() })])
          .then(function () { say("Image copied. Paste it into X with Ctrl+V."); })
          .catch(function () { say("This browser won't copy images. Use Download instead.", true); });
      });
    }
  }

  // Phones: share sheet with the image attached.
  if (draft.image && navigator.canShare) {
    imageBlob().then(function (blob) {
      var file = new File([blob], "nuclear-pulse.png", { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) return;
      document.getElementById("share-block").hidden = false;
      document.getElementById("share").addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(draft.text).catch(function () {});
        navigator.share({ files: [file], text: draft.text })
          .then(function () { say("Shared. If the text didn't come through, it's on your clipboard: paste it."); })
          .catch(function (err) { if (err && err.name !== "AbortError") say("Sharing failed. Use the buttons below.", true); });
      });
    }).catch(function () {});
  }
})();
</script>
</body>
</html>`;
}

export function sendSharePage(res, draft) {
  if (!draft || typeof draft.text !== "string") return res.status(403).send("Invalid or expired link.");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  return res.status(200).send(renderSharePage(draft));
}
