import { saveMedia } from "./lib/api";
import type { SavePayload } from "./lib/types";

const MEDIA_LINK_PATTERNS = ["*://*/*.gif*", "*://*/*.png*", "*://*/*.jpg*", "*://*/*.jpeg*", "*://*/*.webp*", "*://*/*.mp4*", "*://*/*.webm*"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mushy-save-media",
    title: "Save to Mushy",
    contexts: ["image", "video"],
  });

  chrome.contextMenus.create({
    id: "mushy-save-link",
    title: "Save to Mushy",
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

async function handleSave(mediaUrl: string, sourceUrl: string, sourceTitle?: string) {
  const payload: SavePayload = { mediaUrl, sourceUrl, sourceTitle };
  const result = await saveMedia(payload);

  const mediaType = mediaTypeFromUrl(mediaUrl);
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: result.ok ? "Saved to Mushy" : "Could not save",
    message: result.ok ? `${mediaType} saved -- open your gallery to see it.` : result.error,
  });

  if (result.ok) {
    const { savedCount = 0 } = await chrome.storage.local.get("savedCount");
    await chrome.storage.local.set({ savedCount: savedCount + 1, lastSavedAt: Date.now() });
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const sourceUrl = info.pageUrl ?? tab?.url ?? "";
  if (info.menuItemId === "mushy-save-media" && info.srcUrl) {
    handleSave(info.srcUrl, sourceUrl, tab?.title);
  } else if (info.menuItemId === "mushy-save-link" && info.linkUrl) {
    handleSave(info.linkUrl, sourceUrl, tab?.title);
  }
});
