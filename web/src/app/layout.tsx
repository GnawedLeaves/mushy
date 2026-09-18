import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono, Roboto_Flex } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// The app's global body/UI font. Swap this for a different next/font/google
// call (or next/font/local for a self-hosted file) whenever you land on a
// look you like -- just keep the `variable: "--font-space-grotesk"` name in
// sync with globals.css's `--font-sans: var(--font-space-grotesk)`, or
// rename both together.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: "variable",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Self-hosted via next/font so TextPressure's wght/wdth/opsz axis animation
// (see components/fx/TextPressure.tsx) has a font available immediately --
// the reactbits original loads this at runtime via a Google Fonts @import,
// which is one more network round-trip that can lose the race and fall
// back to the browser's default serif.
const robotoFlex = Roboto_Flex({
  variable: "--font-roboto-flex",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: "Mushy",
  description: "Save tasteful designs, gifs, and clips -- and curate them into moodboards.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${robotoFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
