import Link from "next/link";
import { Download } from "lucide-react";
import { AmbientGradient } from "@/components/fx/AmbientGradient";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { id: "install", label: "Install the extension" },
  { id: "token", label: "Generate a token" },
  { id: "connect", label: "Connect the extension" },
  { id: "use", label: "Save something" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

export default function HelpPage() {
  return (
    <main className="relative min-h-screen">
      <AmbientGradient />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold tracking-tight">
              mushy
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Help center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Installing the browser extension, connecting it to your account, and using it.
            </p>
          </div>
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
          <section id="install" className="space-y-3">
            <h2 className="text-lg font-semibold">1. Install the extension</h2>
            <p className="text-sm text-muted-foreground">
              The extension isn&apos;t published on the Chrome Web Store yet, so it installs as an unpacked
              extension -- works the same way in Chrome and Arc (both are Chromium-based and use the same
              extensions system).
            </p>
            <Button
              className="gap-2"
              nativeButton={false}
              render={<a href="/downloads/mushy-extension.zip" download />}
            >
              <Download className="h-4 w-4" />
              Download mushy-extension.zip
            </Button>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Download the zip above and unzip it -- you&apos;ll get a folder containing a file called <code>manifest.json</code>.</li>
              <li>
                Open a new tab and go to <code>chrome://extensions</code> (this works in Arc too).
              </li>
              <li>Turn on <strong>Developer mode</strong> (top-right toggle).</li>
              <li>Click <strong>Load unpacked</strong> and select the unzipped folder.</li>
              <li>
                &quot;Mushy&quot; appears in your extensions list. Pin it to the toolbar: click the puzzle-piece
                icon in your browser toolbar, then click the pin next to Mushy.
              </li>
            </ol>
          </section>

          <section id="token" className="space-y-3">
            <h2 className="text-lg font-semibold">2. Generate a personal access token</h2>
            <p className="text-sm text-muted-foreground">
              The extension needs a token to know which Mushy account to save things to. You generate this
              once and paste it into the extension.
            </p>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>
                Log in at Mushy, then go to{" "}
                <Link href="/settings" className="underline underline-offset-4 hover:text-foreground">
                  Settings
                </Link>
                .
              </li>
              <li>Under <strong>Browser extension</strong>, click <strong>Generate new token</strong>.</li>
              <li>
                Copy it immediately -- it&apos;s shown only once. If you lose it, just generate a new one (and
                revoke the old one if you want).
              </li>
            </ol>
          </section>

          <section id="connect" className="space-y-3">
            <h2 className="text-lg font-semibold">3. Connect the extension</h2>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Right-click the Mushy icon in your toolbar and choose <strong>Options</strong>.</li>
              <li>
                Paste the token from step 2 into <strong>Personal access token</strong>. The{" "}
                <strong>API base URL</strong> field should already say{" "}
                <code>https://mushy-six.vercel.app</code> -- leave it as-is unless you&apos;re running your
                own copy of Mushy locally.
              </li>
              <li>
                Click <strong>Save &amp; test connection</strong>. It should say &quot;Connected as
                @yourusername.&quot;
              </li>
            </ol>
          </section>

          <section id="use" className="space-y-3">
            <h2 className="text-lg font-semibold">4. Save something</h2>
            <p className="text-sm text-muted-foreground">
              Right-click any image, video, or a direct link to a <code>.gif</code>/<code>.mp4</code>/
              <code>.webm</code>/<code>.png</code>/<code>.jpg</code>/<code>.webp</code> file on any page, and
              choose <strong>Save to Mushy</strong>. A notification confirms it worked, or explains why it
              didn&apos;t (e.g. the site blocks hotlinking, or the file&apos;s too large).
            </p>
          </section>

          <section id="troubleshooting" className="space-y-3">
            <h2 className="text-lg font-semibold">Troubleshooting</h2>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>No context menu item?</strong> Right-click directly on an image or video element, or
                a link that ends in a supported file extension -- right-clicking empty page background won&apos;t
                show it.
              </li>
              <li>
                <strong>&quot;Invalid or revoked token&quot;?</strong> Generate a fresh token in Settings and
                reconnect.
              </li>
              <li>
                <strong>&quot;Could not reach that API base URL&quot;?</strong> Double-check the URL has no
                typo and starts with <code>https://</code>. If you&apos;re self-hosting, make sure the app is
                actually running at that address.
              </li>
              <li>
                <strong>&quot;Server misconfigured&quot;?</strong> That&apos;s on the Mushy server, not your
                token -- try again later.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
