import "./globals.css"
import Script from "next/script"
import { Providers } from "./providers"

export const metadata = {
  title: "EV.CRM — India's Premier EV Sales OS & Commerce Hub",
  description: "The definitive operating system for EV dealerships. Real-time lead tracking, inventory sync, and AI scoring on evcrm.in.",
  metadataBase: new URL("https://evcrm.in"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EV.CRM — India's Premier EV Sales OS & Commerce Hub",
    description: "The definitive operating system for EV dealerships. Real-time lead tracking, inventory sync, and AI scoring on evcrm.in.",
    url: "https://evcrm.in",
    siteName: "EV.CRM",
    images: [
      {
        url: "/hero-dashboard.png",
        width: 1200,
        height: 630,
        alt: "EV.CRM Dashboard",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EV.CRM — India's Premier EV Sales OS & Commerce Hub",
    description: "The definitive operating system for EV dealerships. Real-time lead tracking, inventory sync, and AI scoring on evcrm.in.",
    images: ["/hero-dashboard.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  // Google-recognised AdSense site-ownership signal. Rendered server-side into
  // <head> as <meta name="google-adsense-account" content="ca-pub-…"> so the
  // AdSense crawler (which reads static HTML) can verify the site even before
  // the ad script executes.
  other: {
    "google-adsense-account": "ca-pub-8854584222782697",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Google AdSense loader — serves ads client-side. Site OWNERSHIP is
            verified via the google-adsense-account <meta> in <head> (see
            metadata above), which is server-rendered and reliably crawlable;
            the App Router doesn't emit a static <script> tag for any strategy,
            so we don't depend on this tag for verification — use the "Meta tag"
            method in the AdSense console. */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8854584222782697"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
