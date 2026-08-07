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

// maximumScale was 1, which blocks pinch-zoom. Lighthouse fails it under
// both Accessibility and Agentic Browsing ("[user-scalable=no] is used …
// or [maximum-scale] is less than 5"), and more importantly it stops anyone
// with low vision from zooming in on a price or a spec — on a marketplace
// aimed at Indian consumers on phones, that is a real exclusion, not a
// score. 5 is the threshold Lighthouse checks for.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
        {/* Meta Pixel — client-side conversion tracking for Facebook/Instagram
            ads (retargeting, lookalike audiences). Server-side Conversions API
            (more reliable post-iOS tracking restrictions) is a separate piece,
            added once the access token is generated in Events Manager. Gated
            on the env var so local dev without it set doesn't fire real events
            against the production Pixel. */}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        {/* <main> gives every page a main landmark. Lighthouse flags its
            absence under both Accessibility and Agentic Browsing — the
            latter matters here because an AI agent parsing the page uses
            landmarks to tell content from navigation and footer. Without
            one, the whole document is undifferentiated.

            Unstyled on purpose: it wraps what the pages already render, so
            it adds a semantic node without touching any existing layout. */}
        <main>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  )
}
