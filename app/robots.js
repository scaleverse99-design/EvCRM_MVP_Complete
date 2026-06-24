export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/dealer", "/register", "/login"],
      }
    ],
    sitemap: "https://evcrm.in/sitemap.xml",
  }
}
