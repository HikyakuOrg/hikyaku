import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    // Multi-tenant local dev uses lvh.me / *.lvh.me so the auth cookie can be
    // set on the parent domain. Allow the dev server to serve HMR/dev assets
    // to these hosts.
    allowedDevOrigins: ["lvh.me", "*.lvh.me"],
};

export default nextConfig;
