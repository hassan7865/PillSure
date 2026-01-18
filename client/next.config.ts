import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pillsure.s3.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  // Standard webpack bundler works better with npm workspaces than Turbopack
  webpack: (config) => {
    // Resolve modules from both client and root node_modules for monorepo compatibility
    const rootDir = path.resolve(__dirname, '../../');
    const rootNodeModules = path.join(rootDir, 'node_modules');
    
    // Ensure webpack resolves from root node_modules for hoisted dependencies
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    
    // Add root node_modules to resolution path (for hoisted dependencies)
    if (Array.isArray(config.resolve.modules)) {
      if (!config.resolve.modules.includes(rootNodeModules)) {
        config.resolve.modules.push(rootNodeModules);
      }
    }
    
    return config;
  },
};

export default nextConfig;
