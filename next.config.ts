import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['gitlab.com', 'secure.gravatar.com'],
  },
  experimental: {
    reactCompiler: true,
  },
};

export default nextConfig;
