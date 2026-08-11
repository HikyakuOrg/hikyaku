import Link from 'next/link'
import { AuthBrandPanel } from '@/components/auth-brand-panel'

/**
 * Split shell shared by every /auth screen: form column on the left, brand
 * panel on the right that collapses away below `lg`. Pages under here render
 * only their form; the wordmark, centring and footer live in this layout.
 * (The `callback`/`confirm` route handlers have no UI, so they're unaffected.)
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="bg-card flex flex-col gap-8 px-6 py-8 md:px-10 md:py-10">
        <header>
          <Link
            href="/"
            className="focus-visible:ring-primary/60 inline-flex flex-col rounded leading-none focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="text-muted-foreground text-[10px] font-medium tracking-[0.25em]">
              飛脚
            </span>
            <span className="text-foreground text-xl font-extrabold tracking-tight">Hikyaku</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <footer className="text-muted-foreground text-center text-xs lg:text-start">
          Open source · Self-hostable · Free to start
        </footer>
      </div>

      <AuthBrandPanel />
    </div>
  )
}
