export default async function sitemap() {
  const baseUrl = "https://evcrm.in"
  
  return [
    "",
    "/showroom",
    "/charging",
    "/service-centers",
    "/login",
    "/register"
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "daily",
    priority: 1.0,
  }))
}
