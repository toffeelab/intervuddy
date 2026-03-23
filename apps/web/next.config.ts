import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@intervuddy/database', '@intervuddy/shared'],
};

export default nextConfig;
