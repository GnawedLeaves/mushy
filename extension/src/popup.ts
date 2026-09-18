import { getSettings } from "./lib/api";

async function main() {
  const { apiBase, token } = await getSettings();
  const { savedCount = 0 } = await chrome.storage.local.get("savedCount");

  const statusEl = document.getElementById("status")!;
  const galleryLink = document.getElementById("open-gallery") as HTMLAnchorElement;
  const optionsLink = document.getElementById("open-options") as HTMLAnchorElement;

  galleryLink.href = apiBase;

  if (!token) {
    statusEl.textContent = "Not connected. Set up your token in settings.";
  } else {
    statusEl.textContent = `${savedCount} saved this session. Right-click any image, gif, or video to save it.`;
  }

  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

main();
