const SECTIONS = [
  { id: "collect", label: "What we collect" },
  { id: "extension", label: "The browser extension" },
  { id: "use", label: "How it's used" },
  { id: "share", label: "Who it's shared with" },
  { id: "retention", label: "Retention & deletion" },
  { id: "contact", label: "Contact" },
];

const CONTACT_EMAIL = "marcely.dev@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Privacy policy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated September 19, 2026.</p>
      </div>

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border bg-card/80 px-3 py-1 shadow-sm backdrop-blur-md hover:bg-muted"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-10 rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mushy Six is a personal moodboard tool: a web app and a browser extension that, together, let
            you save images, gifs, and videos from around the web into your own gallery. This page covers
            both the web app (mushy-six.vercel.app) and the Mushy Six browser extension as one product,
            since the extension only exists to talk to this web app.
          </p>
        </section>

        <section id="collect" className="space-y-3">
          <h2 className="text-lg font-semibold">1. What we collect</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Account information:</strong> the email address and password you sign up with
              (handled entirely by our authentication provider, Supabase Auth — we never see or store your
              password ourselves), plus whatever profile details you choose to add: username, display name,
              bio, and profile picture.
            </li>
            <li>
              <strong>Saves:</strong> the image/video/gif file itself, the URL and title of the page you
              saved it from, any caption you write, and privacy settings (public/private) for each save,
              board, and your profile.
            </li>
            <li>
              <strong>Aesthetic tags:</strong> when a save is an image, we generate a short list of hidden
              style tags for it (e.g. &quot;y2k&quot;, &quot;minimalist&quot;) to power search on the Discover
              page. These are never shown in the app&apos;s interface — only used to filter search results.
            </li>
            <li>
              <strong>Activity on other people&apos;s saves:</strong> likes/dislikes and comments you leave,
              and the reverse — if someone likes or comments on your save, we record that so we can show you
              a notification.
            </li>
          </ul>
        </section>

        <section id="extension" className="space-y-3">
          <h2 className="text-lg font-semibold">2. The browser extension, specifically</h2>
          <p className="text-sm text-muted-foreground">The extension stores, on your own device only:</p>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>The Mushy Six API address it talks to, and your personal access token (a credential you generate in Settings — not your password).</li>
            <li>A local count of how many times you&apos;ve saved something, and when, shown in the extension&apos;s popup.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            When you right-click and choose &quot;Save to Mushy Six&quot; or &quot;Select element to
            save...&quot;, the extension sends the image/video URL (or, for the element picker, a screenshot
            cropped to the element you selected), the source page&apos;s URL and title, and any caption you
            type, to the Mushy Six API using your access token. It does not read, log, or transmit anything
            from pages you visit beyond that one explicit action — there is no passive browsing history
            tracking, click tracking, or keystroke logging.
          </p>
        </section>

        <section id="use" className="space-y-3">
          <h2 className="text-lg font-semibold">3. How it&apos;s used</h2>
          <p className="text-sm text-muted-foreground">
            Everything above is used only to run the features you&apos;d expect: storing and displaying your
            saves and boards, showing your public profile and saves to other users if you&apos;ve made them
            public, powering search and the Discover feed, and notifying you about likes/comments. We do not
            use your data for advertising, and we do not sell it.
          </p>
        </section>

        <section id="share" className="space-y-3">
          <h2 className="text-lg font-semibold">4. Who it&apos;s shared with</h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Supabase</strong> — our database, authentication, and file storage provider. All
              account data, saves, and uploaded files are hosted on Supabase&apos;s infrastructure.
            </li>
            <li>
              <strong>Google Gemini API</strong> — when you save an image, the image is sent to Google&apos;s
              Gemini API to generate the hidden aesthetic tags described above. No account information
              (email, username, etc.) is sent with it — only the image itself.
            </li>
            <li>
              <strong>Vercel</strong> — hosts the Mushy Six web app and its server-side code.
            </li>
            <li>
              <strong>Other Mushy Six users</strong> — anything you mark public (your profile, a board, a
              save) is visible to other users and, for public profiles, to anyone with the link. Anything
              you keep private is visible only to you.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">We do not sell user data, and we do not share it with advertisers.</p>
        </section>

        <section id="retention" className="space-y-3">
          <h2 className="text-lg font-semibold">5. Retention &amp; deletion</h2>
          <p className="text-sm text-muted-foreground">
            We keep your data for as long as your account exists. Deleting a save, board, or comment removes
            it immediately. If you&apos;d like your account and all associated data deleted entirely, email
            us at the address below and we&apos;ll take care of it.
          </p>
        </section>

        <section id="contact" className="space-y-3">
          <h2 className="text-lg font-semibold">6. Contact</h2>
          <p className="text-sm text-muted-foreground">
            Questions about this policy or your data:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4 hover:text-foreground">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
