/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Pin to EU region for GDPR compliance when deployed to Vercel
  // (configured via vercel.json regions: ["fra1"] separately)
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
