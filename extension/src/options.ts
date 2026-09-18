import { getSettings, setSettings, testConnection } from "./lib/api";
import { DEFAULT_API_BASE } from "./lib/types";

const apiBaseInput = document.getElementById("apiBase") as HTMLInputElement;
const tokenInput = document.getElementById("token") as HTMLInputElement;
const saveButton = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status")!;

async function load() {
  const { apiBase, token } = await getSettings();
  apiBaseInput.value = apiBase || DEFAULT_API_BASE;
  tokenInput.value = token ?? "";
}

saveButton.addEventListener("click", async () => {
  const apiBase = apiBaseInput.value.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
  const token = tokenInput.value.trim();

  if (!token) {
    statusEl.textContent = "Paste a token first.";
    return;
  }

  statusEl.textContent = "Testing connection...";
  const result = await testConnection(apiBase, token);

  if (result.ok) {
    await setSettings({ apiBase, token });
    statusEl.textContent = result.username ? `Connected as @${result.username}.` : "Connected.";
  } else {
    statusEl.textContent = result.error;
  }
});

load();
