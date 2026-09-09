import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Utilise l’API TypeScript stable pour les vérifications du build.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
