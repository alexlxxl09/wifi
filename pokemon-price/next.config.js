/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "**.pokemontcg.io" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["playwright"],
  },
};

module.exports = nextConfig;
