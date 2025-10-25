import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gitlab.com',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
      },
    ],
  },
  typedRoutes: true,
  experimental: {
    clientSegmentCache: true,
    // esmExternals: true,
    // browserDebugInfoInTerminal: true,
    // devtoolSegmentExplorer: true,
    // globalNotFound: true,
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;
