# Mushy Six

Save tasteful designs, gifs, and clips from the browser -- with the source link kept -- and curate them into moodboards.

## Layout

- `web/` -- Next.js 16 app: auth, gallery, boards, settings, public profiles, and the two API routes the extension talks to.
- `extension/` -- Chrome/Arc Manifest V3 extension: right-click an image/video/gif to save it.

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com/dashboard), then:

1. Open **SQL Editor** → paste the contents of [`web/supabase/migrations/0001_init.sql`](web/supabase/migrations/0001_init.sql) → **Run**.
2. From **Settings → API**, copy the Project URL, anon/publishable key, and `service_role` secret into `web/.env.local` (see `web/.env.local.example`).

### 2. Web app

```bash
cd web
npm install
npm run dev
```

Sign up at `http://localhost:3000/signup`, then go to **Settings → Browser extension** and generate a personal access token.

### 3. Extension

This is a Manifest V3 extension, loaded as an unpacked build -- it isn't published to the Chrome Web Store, so "installing" it means pointing your browser at the built `extension/dist` folder directly. Works the same way in Chrome and Arc (Arc is Chromium-based and uses the same extensions system).

**Build it:**

```bash
cd extension
npm install
npm run build
```

This produces `extension/dist` -- that's the folder you load into the browser. Re-run `npm run build` any time you change the extension's source, then reload it in the browser (see step 5).

**Load it in Chrome:**

1. Open a new tab and go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `mushy/extension/dist` folder (not `extension/` itself -- the built one).
5. "Mushy Six" appears in your extensions list. To pin it to the toolbar for quick access: click the puzzle-piece icon in Chrome's toolbar → click the pin icon next to Mushy Six.

**Load it in Arc:**

Arc uses the same Chromium extensions system, so the steps are identical:

1. Open a new tab and go to `chrome://extensions` (yes, that URL works in Arc too).
2. Turn on **Developer mode**.
3. Click **Load unpacked** → select `mushy/extension/dist`.
4. Arc surfaces extension icons in the top-right of the address bar area -- click the icon to open the popup, or right-click it for options.

**Connect it to your account:**

1. Right-click the Mushy Six icon in your toolbar → **Options** (or go to `chrome://extensions`, find Mushy Six, click **Details** → **Extension options**).
2. Paste the personal access token you generated in the web app (Settings → Browser extension).
3. Click **Save & test connection** -- it should show "Connected as @yourusername".

**Use it:**

Right-click any image, video, or a direct link to a `.gif`/`.mp4`/`.webm`/`.png`/`.jpg`/`.webp` file on any page → **Save to Mushy Six**. A banner on the page and a notification both confirm success or explain the failure (e.g. the site blocks hotlinking, or the file's too large).

**After changing the extension's code:** run `npm run build` again (or `npm run package` to also refresh the downloadable zip), then go to `chrome://extensions` and click the reload icon (↻) on the Mushy Six card -- no need to remove and re-add it.

**Troubleshooting:**
- No context menu item? Make sure you're right-clicking directly on an `<img>`/`<video>` element or a link that ends in a supported extension -- right-clicking empty page background won't show it.
- "No token set" notification → open the options page and connect a token (above).
- "Could not reach Mushy Six" → the web app (`npm run dev` in `web/`) isn't running, or the options page's API base URL doesn't match where it's running (defaults to `https://mushy-six.vercel.app`).

## Extension ↔ API contract

The extension never downloads media itself -- it POSTs the URL + page metadata to `POST /api/extension/save`, which fetches, validates, and re-hosts the file server-side. Both sides must agree on this shape (kept in sync by hand -- there's no shared package):

```ts
interface SavePayload {
  mediaUrl: string;
  sourceUrl: string;
  sourceTitle?: string;
}
```

The route responds as soon as the save itself succeeds -- it doesn't wait on AI tagging. If `GEMINI_API_KEY` is set on the server, a `next/server` `after()` callback tags the save's aesthetic (y2k, minimalist, etc.) in the background and writes it to `saves.tags` a moment later; the extension never sees or waits on this. Tags power Discover's tag search and are never shown in the UI directly.

Defined in `extension/src/lib/types.ts` and `web/src/app/api/extension/save/route.ts`.

## Notes

Full architecture write-up and a running learning log are in the Notion doc "Mushy: Save tastful designs app".
