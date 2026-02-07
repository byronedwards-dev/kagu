/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external image domains if needed later
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
