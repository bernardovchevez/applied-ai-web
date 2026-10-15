/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
};

module.exports = nextConfig;
