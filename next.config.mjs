import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin file-tracing to this folder. Without it, Next walks up looking for
  // lockfiles and gets confused if there's a stray package-lock.json in a
  // parent directory (which there was at one point in this project).
  outputFileTracingRoot: __dirname,

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Pin to EU region for GDPR compliance when deployed to Vercel
  // (configured via vercel.json regions: ["fra1"] separately).
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
