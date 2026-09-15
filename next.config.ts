import type { NextConfig } from "next";

// NEXT_PUBLIC_ROOT_DOMAIN is inlined at build time and becomes the Supabase auth
// cookie's Domain attribute (cookieDomain() in lib/subdomain.ts). A value with a
// scheme or path, such as "https://hikyaku.org", produces Domain=.https, which
// browsers silently reject: sign-in succeeds but the session is never stored and
// the user stays on the login page. Fail the build rather than ship that.
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
