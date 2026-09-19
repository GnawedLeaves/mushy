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

async function handleSave(mediaUrl: string, sourceUrl: string, sourceTitle?: string, tabId?: number) {
  const mediaType = mediaTypeFromUrl(mediaUrl);
  const payload: SavePayload = { mediaUrl, sourceUrl, sourceTitle };
  const result = await saveMedia(payload);

  const message = result.ok ? `${mediaType} saved to Mushy Six` : `Could not save: ${result.error}`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: result.ok ? "Saved to Mushy Six" : "Could not save",
    message: result.ok ? `${mediaType} saved -- open your gallery to see it.` : result.error,
  });

  if (tabId !== undefined) {
    // Best-effort: fails harmlessly on restricted pages (chrome://, the Web
    // Store, etc.) where injection isn't allowed -- the OS notification
    // above still covers those cases.
    chrome.scripting
      .executeScript({ target: { tabId }, func: showOnPageToast, args: [result.ok, message] })
      .catch(() => {});
  }

  if (result.ok) {
    const { savedCount = 0 } = await chrome.storage.local.get("savedCount");
    await chrome.storage.local.set({ savedCount: savedCount + 1, lastSavedAt: Date.now() });
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
