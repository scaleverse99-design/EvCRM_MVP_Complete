export default async function sitemap() {
  const baseUrl = "https://evcrm.in"
  
  return [
    "",
    "/news",
    "/subsidies",
    "/charging",
    "/login",
    "/register"
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "daily",
    priority: 1.0,
  }))
}
