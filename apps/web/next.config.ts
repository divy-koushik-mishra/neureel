import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow the Cloudflare quick-tunnel host through dev-origin checks. Any
  // *.trycloudflare.com subdomain is accepted so we don't have to edit this
  // each time the tunnel URL rotates. Prod deploys on Vercel don't need this.
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.dev",
    "localhost:3000",
  ],
};

export default nextConfig;
