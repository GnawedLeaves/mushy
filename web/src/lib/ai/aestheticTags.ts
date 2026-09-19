// "latest" alias rather than a pinned version -- Google rotates and retires
// specific model names (gemini-2.0-flash, live at the time this was first
// written, returned 404 "no longer available" within the same day), and
// this call is a nice-to-have, not something worth manually bumping a
// version string for every so often.
const GEMINI_MODEL = "gemini-flash-latest";
const TAGGING_TIMEOUT_MS = 15_000;
const MAX_TAGS = 8;
// Generous on purpose: current flash models spend part of this budget on
// internal "thinking" tokens before the actual answer, so a tight budget
// (100 was the original guess) can burn entirely on thinking and return no
// text at all (finishReason "MAX_TOKENS", empty content) even though the
// call itself succeeded.
const MAX_OUTPUT_TOKENS = 500;

const PROMPT =
  "Look at this image and describe its visual/aesthetic style with 3-8 short tags " +
  "(examples: modern, retro, y2k, minimalist, cottagecore, cyberpunk, brutalist, pastel, " +
  "dark academia, vaporwave, grunge, art deco). Respond with ONLY a comma-separated list " +
  "of lowercase single-or-two-word tags, no numbering, no other text.";

// Best-effort aesthetic tagging via a free-tier Gemini vision call, called
// from the save route's after() callback (see route.ts) so it never delays
// the save response. Tags are never shown in the UI -- they only power
// Discover's tag search (see lib/actions/discover.ts) -- so a missing key or
// a failed call just means an untagged (but otherwise perfectly normal)
// save, not an error anyone needs to handle.
export async function generateAestheticTags(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return [];
  if (!mimeType.startsWith("image/")) return []; // vision call only makes sense for still images/gifs

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(TAGGING_TIMEOUT_MS),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType, data: imageBuffer.toString("base64") } },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
        }),
      }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return [];

    const tags = text
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, ""))
      .filter(Boolean);

    return [...new Set(tags)].slice(0, MAX_TAGS);
  } catch {
    return [];
  }
}
