import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { cacheLife } from "next/cache";

const GITHUB_ORG = "Hikyakuorg";
const GITHUB_URL = `https://github.com/${GITHUB_ORG}`;

/**
 * Total stargazers across the org's public repos. Cached so we don't hammer
 * GitHub's unauthenticated rate limit (60 req/hr/IP). Returns null on failure
 * so the button can degrade gracefully to just "Star us".
 */
async function getStarCount(): Promise<number | null> {
    "use cache";
    cacheLife("hours");

    try {
        const res = await fetch(
            `https://api.github.com/orgs/${GITHUB_ORG}/repos?per_page=100&type=public`,
            { headers: { Accept: "application/vnd.github+json" } },
        );
        if (!res.ok) return null;
        const repos: Array<{ stargazers_count?: number }> = await res.json();
        return repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
    } catch {
        return null;
    }
}

function formatStars(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return n.toLocaleString("en-US");
}

export async function GithubStarButton({ className = "" }: { className?: string }) {
    const stars = await getStarCount();

    return (
        <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Star Hikyaku on GitHub"
            title="Star Us on GitHub"
            className={`group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${className}`}
        >
            <GithubLogoIcon size={18} weight="fill" />
            <span className="hidden sm:inline">Star us</span>
            {stars !== null && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600 transition-colors group-hover:bg-slate-200">
                    {formatStars(stars)}
                </span>
            )}
        </a>
    );
}
