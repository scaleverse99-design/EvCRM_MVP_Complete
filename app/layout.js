import "./globals.css"
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
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
