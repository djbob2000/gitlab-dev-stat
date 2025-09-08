import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['gitlab.com', 'secure.gravatar.com'],
  },
  typedRoutes: true,
  experimental: {
    reactCompiler: true,
    clientSegmentCache: true,
    // esmExternals: true,
    // browserDebugInfoInTerminal: true,
    // devtoolSegmentExplorer: true,
    // globalNotFound: true,
    // turbopackPersistentCaching: true,
    // cacheComponents: true, // This option is not recognized in Next.js 15
  },
};

export default nextConfig;
