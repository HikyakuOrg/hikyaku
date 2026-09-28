import type { NextConfig } from "next";

// NEXT_PUBLIC_ROOT_DOMAIN becomes the auth cookie Domain (cookieDomain() in
// lib/subdomain.ts). A value such as "https://hikyaku.org" gives Domain=.https,
// which browsers reject, so users cannot stay signed in. Fail the build instead.
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
if (rootDomain !== undefined && !/^[a-z0-9.-]+(:\d+)?$/i.test(rootDomain)) {
    throw new Error(
        `NEXT_PUBLIC_ROOT_DOMAIN must be a bare host such as "hikyaku.org" or "localhost:3000", got "${rootDomain}".`,
    );
}

const nextConfig: NextConfig = {
    cacheComponents: true,
};

export default nextConfig;
