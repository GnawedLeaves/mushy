import { DEFAULT_API_BASE, type ExtensionSettings, type SavePayload } from "./types";

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(["apiBase", "token"]);
  return {
    apiBase: stored.apiBase || DEFAULT_API_BASE,
    token: stored.token ?? null,
  };
}

export async function setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  await chrome.storage.local.set(settings);
}

export async function saveMedia(payload: SavePayload): Promise<{ ok: true } | { ok: false; error: string }> {
  const { apiBase, token } = await getSettings();
  if (!token) return { ok: false, error: "No token set. Open the extension options page." };

  try {
    const response = await fetch(`${apiBase}/api/extension/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: body.error ?? `Save failed (${response.status}).` };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Mushy. Is the app running?" };
  }
}

export async function testConnection(apiBase: string, token: string): Promise<{ ok: true; username: string | null } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${apiBase}/api/extension/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return { ok: false, error: "Invalid token." };
    }
    const data = await response.json();
    return { ok: true, username: data.username ?? null };
  } catch {
    return { ok: false, error: "Could not reach that API base URL." };
  }
}
