import Script from "next/script";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import "./glow.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://sizememo.site"),
  applicationName: "SizeMemo",
  openGraph: { siteName: "SizeMemo", url: "https://sizememo.site", type: "website" },
  title: { default: "SizeMemo — Apparel fit intelligence", template: "%s · SizeMemo" },
  description:
    "Measurement-based size recommendations, return feedback analysis and size consistency monitoring for fashion brands and online retailers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <Script src="/glow.js" strategy="afterInteractive" />
        <script type="application/ld+json" id="founders-ld" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Organization\", \"name\": \"SizeMemo\", \"url\": \"https://sizememo.site\", \"email\": \"hello@sizememo.site\", \"logo\": \"https://sizememo.site/icon-512.png\", \"founder\": [{\"@type\": \"Person\", \"name\": \"Moses Marvin\", \"jobTitle\": \"Founder/CEO\"}, {\"@type\": \"Person\", \"name\": \"Jude Zamani\", \"jobTitle\": \"Co-founder/CTO\"}]}" }} />{children}</body>
    </html>
  );
}
