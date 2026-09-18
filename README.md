# Mushy

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

```bash
cd extension
npm install
npm run build
```

Load it: `chrome://extensions` (or Arc's equivalent) → enable Developer mode → **Load unpacked** → select `extension/dist`.

Open the extension's options page (right-click its toolbar icon → Options), paste the token from step 2, and click **Save & test connection**.

Right-click any image, gif, or direct video link on the web → **Save to Mushy**.

## Extension ↔ API contract

The extension never downloads media itself -- it POSTs the URL + page metadata to `POST /api/extension/save`, which fetches, validates, and re-hosts the file server-side. Both sides must agree on this shape (kept in sync by hand -- there's no shared package):

```ts
interface SavePayload {
  mediaUrl: string;
  sourceUrl: string;
  sourceTitle?: string;
}
```

Defined in `extension/src/lib/types.ts` and `web/src/app/api/extension/save/route.ts`.

## Notes

Full architecture write-up and a running learning log are in the Notion doc "Mushy: Save tastful designs app".
