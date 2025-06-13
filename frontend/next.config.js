/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  // output: 'standalone', // Temporarily disable to avoid build trace timeout
  trailingSlash: false,
  experimental: {
    esmExternals: false,
  },
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
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Configure server to use port 3001
  async rewrites() {
    return [
      {
        source: '/_next/webpack-hmr',
        destination: 'http://localhost:3000/_next/webpack-hmr',
      },
    ];
  },
};

module.exports = nextConfig;
