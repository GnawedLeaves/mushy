import { saveMedia } from "./lib/api";
import type { SavePayload } from "./lib/types";

const MEDIA_LINK_PATTERNS = ["*://*/*.gif*", "*://*/*.png*", "*://*/*.jpg*", "*://*/*.jpeg*", "*://*/*.webp*", "*://*/*.mp4*", "*://*/*.webm*"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mushy-save-media",
    title: "Save to Mushy Six",
    contexts: ["image", "video"],
  });

  chrome.contextMenus.create({
    id: "mushy-save-link",
    title: "Save to Mushy Six",
    contexts: ["link"],
    targetUrlPatterns: MEDIA_LINK_PATTERNS,
  });

  // A third "Select element to save..." item (contexts: ["all"], screenshot
  // + crop via an interactive hover/scroll/click picker in content.ts) is
  // shelved for now -- the picker interaction wasn't reliable enough to
  // ship. Not deleted: handlePickerResult/cropToDataUrl below and
  // content.ts are left intact so it can be re-registered here once fixed,
  // without needing to be rebuilt from scratch. Re-enabling it also means
  // restoring the content_scripts entry (and the broader host permission it
  // requires) in manifest.json.
});

function mediaTypeFromUrl(url: string): "image" | "gif" | "video" {
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "gif") return "gif";
  if (ext === "mp4" || ext === "webm") return "video";
  return "image";
}

// Runs inside the page itself (serialized and injected via
// chrome.scripting.executeScript -- no closures from background.ts survive
// the trip, only the `args` below), so this shows feedback immediately on
// the page regardless of whether the OS has granted notification
// permissions at all -- chrome.notifications below is a second, belt-and-
// suspenders confirmation, not the only one.
function showOnPageToast(ok: boolean, message: string) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    padding: "10px 16px",
    borderRadius: "8px",
    background: ok ? "#111111" : "#dc2626",
    color: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "13px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    transition: "opacity 0.3s ease",
    opacity: "0",
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Also injected via executeScript (see showOnPageToast above for why it has
// to be a fully self-contained function, and can't close over anything from
// background.ts). Collects an optional caption right where the save
// happened, instead of the user having to go find the save in the gallery
// afterward to caption it.
//
// Deliberately carries the FULL save payload as args, and fires exactly one
// self-contained runtime message when the user finishes (Save, Skip, or the
// auto-skip timer) -- MV3 service workers can be suspended at any time while
// idle, including for the entire ~20s this prompt can sit waiting on the
// user, and anything that tried to correlate this message back to an
// in-memory Promise/Map created before the prompt was shown (an earlier
// version of this code did exactly that) silently loses that state if the
// worker gets recycled in between, which surfaced as "the caption prompt
// shows up but nothing gets saved" and, worse, sometimes no save at all.
// A single already-complete message has nothing to correlate -- the
// top-level onMessage listener below handles it whether the worker that
// injected this prompt is still the one that receives the answer or not.
function injectCaptionPrompt(mediaUrl: string, sourceUrl: string, sourceTitle: string | null, mediaLabel: string) {
  const AUTO_SKIP_MS = 20000;
  const card = document.createElement("div");
  Object.assign(card.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#111111",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "12px 14px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: "13px",
    width: "260px",
    opacity: "0",
    transition: "opacity 0.2s ease",
  });

  const label = document.createElement("div");
  label.textContent = "Saved to Mushy Six -- add a caption?";
  label.style.marginBottom = "8px";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Caption (optional)";
  input.maxLength = 200;
  Object.assign(input.style, {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 8px",
    borderRadius: "6px",
    border: "1px solid #444",
    background: "#1c1c1c",
    color: "#fff",
    fontSize: "13px",
    marginBottom: "8px",
    outline: "none",
  });

  const row = document.createElement("div");
  Object.assign(row.style, { display: "flex", gap: "8px", justifyContent: "flex-end" });

  const skipBtn = document.createElement("button");
  skipBtn.textContent = "Skip";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  for (const btn of [skipBtn, saveBtn]) {
    Object.assign(btn.style, {
      padding: "5px 10px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
    });
  }
  Object.assign(skipBtn.style, { background: "#333333", color: "#ffffff" });
  Object.assign(saveBtn.style, { background: "#ffffff", color: "#111111" });

  row.appendChild(skipBtn);
  row.appendChild(saveBtn);
  card.appendChild(label);
  card.appendChild(input);
  card.appendChild(row);
  document.body.appendChild(card);

  requestAnimationFrame(() => {
    card.style.opacity = "1";
    input.focus();
  });

  let done = false;
  function finish(caption: string) {
    if (done) return;
    done = true;
    chrome.runtime.sendMessage({
      type: "mushy-save-with-caption",
      mediaUrl,
      sourceUrl,
      sourceTitle,
      caption,
      mediaLabel,
    });
    card.style.opacity = "0";
    setTimeout(() => card.remove(), 200);
  }

  saveBtn.addEventListener("click", () => finish(input.value.trim()));
  skipBtn.addEventListener("click", () => finish(""));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(input.value.trim());
    if (e.key === "Escape") finish("");
  });

  // A DOM timer in the page itself -- unaffected by the MV3 service
  // worker's own idle-suspend behavior, unlike a setTimeout living in
  // background.ts would be.
  setTimeout(() => finish(input.value.trim()), AUTO_SKIP_MS);
}

function notifySaveResult(result: { ok: true } | { ok: false; error: string }, mediaLabel: string, tabId?: number) {
  const message = result.ok ? `${mediaLabel} saved to Mushy Six` : `Could not save: ${result.error}`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: result.ok ? "Saved to Mushy Six" : "Could not save",
    message: result.ok ? `${mediaLabel} saved -- open your gallery to see it.` : result.error,
  });

  if (tabId !== undefined) {
    // Best-effort: fails harmlessly on restricted pages (chrome://, the Web
    // Store, etc.) where injection isn't allowed -- the OS notification
    // above still covers those cases.
    chrome.scripting
      .executeScript({ target: { tabId }, func: showOnPageToast, args: [result.ok, message] })
      .catch(() => {});
  }
}

async function performSave(
  mediaUrl: string,
  sourceUrl: string,
  sourceTitle: string | undefined,
  caption: string | undefined,
  mediaLabel: string,
  tabId: number | undefined
) {
  const payload: SavePayload = { mediaUrl, sourceUrl, sourceTitle, ...(caption ? { caption } : {}) };
  const result = await saveMedia(payload);

  notifySaveResult(result, mediaLabel, tabId);
  if (result.ok) {
    const { savedCount = 0 } = await chrome.storage.local.get("savedCount");
    await chrome.storage.local.set({ savedCount: savedCount + 1, lastSavedAt: Date.now() });
  }
}

async function handleSave(mediaUrl: string, sourceUrl: string, sourceTitle: string | undefined, tabId: number | undefined) {
  const mediaLabel = mediaTypeFromUrl(mediaUrl);
  if (tabId === undefined) {
    await performSave(mediaUrl, sourceUrl, sourceTitle, undefined, mediaLabel, undefined);
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectCaptionPrompt,
      args: [mediaUrl, sourceUrl, sourceTitle ?? null, mediaLabel],
    });
  } catch {
    // Injection blocked (chrome://, the Web Store, etc.) -- save without
    // ever getting a chance to prompt for a caption.
    await performSave(mediaUrl, sourceUrl, sourceTitle, undefined, mediaLabel, tabId);
  }
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}

async function cropToDataUrl(fullPageDataUrl: string, rect: TargetRect): Promise<string> {
  const blob = await (await fetch(fullPageDataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const dpr = rect.devicePixelRatio;
  const sx = Math.max(0, rect.x * dpr);
  const sy = Math.max(0, rect.y * dpr);
  const sw = Math.min(bitmap.width - sx, rect.width * dpr);
  const sh = Math.min(bitmap.height - sy, rect.height * dpr);

  const canvas = new OffscreenCanvas(Math.max(1, Math.round(sw)), Math.max(1, Math.round(sh)));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D context to crop the screenshot.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const outBlob = await canvas.convertToBlob({ type: "image/png" });
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(outBlob);
  });
}

// Fires once content.ts's picker confirms a rect (see content.ts for the
// hover-to-highlight, scroll-to-resize, click-to-confirm interaction) --
// screenshots the viewport and crops to that rect, since there's no "src"
// to fetch for a <canvas> chart or a styled card the way there is for a
// plain image.
async function handlePickerResult(tabId: number, rect: TargetRect, sourceUrl: string, sourceTitle: string | undefined) {
  let fullPageDataUrl: string;
  try {
    fullPageDataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Could not save",
      message: "This page doesn't allow screenshots (common on chrome:// pages or the Web Store).",
    });
    return;
  }

  let croppedDataUrl: string;
  try {
    croppedDataUrl = await cropToDataUrl(fullPageDataUrl, rect);
  } catch {
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Could not save",
      message: "Could not process that screenshot.",
    });
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectCaptionPrompt,
      args: [croppedDataUrl, sourceUrl, sourceTitle ?? null, "design"],
    });
  } catch {
    await performSave(croppedDataUrl, sourceUrl, sourceTitle, undefined, "design", tabId);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const sourceUrl = info.pageUrl ?? tab?.url ?? "";
  if (info.menuItemId === "mushy-save-media" && info.srcUrl) {
    handleSave(info.srcUrl, sourceUrl, tab?.title, tab?.id);
  } else if (info.menuItemId === "mushy-save-link" && info.linkUrl) {
    handleSave(info.linkUrl, sourceUrl, tab?.title, tab?.id);
  }
});

// Both handlers below are top-level, always-registered listeners with no
// dependency on in-memory state from earlier in the flow -- everything they
// need arrives in the message itself (or via `sender.tab`), so they work
// correctly even if the service worker that started this save was recycled
// and this is a freshly-woken one answering the message. See
// injectCaptionPrompt's comment for why that distinction matters.
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "mushy-save-with-caption") {
    performSave(message.mediaUrl, message.sourceUrl, message.sourceTitle ?? undefined, message.caption || undefined, message.mediaLabel, sender.tab?.id);
  } else if (message?.type === "mushy-picker-result" && sender.tab?.id !== undefined) {
    handlePickerResult(sender.tab.id, message.rect, sender.tab.url ?? "", sender.tab.title);
  }
});
