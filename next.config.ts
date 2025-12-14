import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    // Fix incorrect workspace-root inference when multiple lockfiles exist above this folder.
    root: projectRoot,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
