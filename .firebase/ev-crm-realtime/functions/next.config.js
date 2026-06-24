// next.config.js
var nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
  },
  // output: 'export',
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "leaflet"]
  }
};
module.exports = nextConfig;
