import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: false, // keep optimization on
    localPatterns: [{ pathname: '/**' }],
  },
};

export default nextConfig;
