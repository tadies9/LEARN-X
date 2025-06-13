/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  // output: 'standalone', // Temporarily disable to avoid build trace timeout
  eslint: {
    // Only run ESLint on these directories during production builds
    dirs: ['pages', 'utils', 'src'],
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Temporarily disable problematic babel-loader for realtime-js
    // We'll handle this differently if needed
    return config;
  },
};

module.exports = nextConfig;
