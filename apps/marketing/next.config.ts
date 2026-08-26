import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Die geteilten Pakete werden als TypeScript-Quelle ausgeliefert (kein
   * Build-Schritt, siehe AGENTS.md). Next muss sie deshalb selbst
   * transpilieren.
   */
  transpilePackages: ['@bautakt/ui'],
};

export default nextConfig;
