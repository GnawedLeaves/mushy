// Mirrors the SavePayload interface in
// web/src/app/api/extension/save/route.ts. Keep these two in sync by hand --
// see web/README.md for the contract.
export interface SavePayload {
  mediaUrl: string;
  sourceUrl: string;
  sourceTitle?: string;
}

export const DEFAULT_API_BASE = "https://mushy-six.vercel.app";

export interface ExtensionSettings {
  apiBase: string;
  token: string | null;
}
