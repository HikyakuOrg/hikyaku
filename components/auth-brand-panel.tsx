import { MapPinIcon, PackageIcon, TruckIcon } from '@phosphor-icons/react/dist/ssr'

// Marketing rail shown beside every /auth form from `lg` up. Copy tracks the
// landing hero on the marketing deploy so the two reads as one product.
const HIGHLIGHTS = [
  {
    icon: PackageIcon,
    title: 'Every package accounted for',
    body: 'Status timelines, shipping labels and proof of delivery in one place.',
  },
  {
    icon: MapPinIcon,
    title: 'Routes that plan themselves',
    body: 'Optimisation that adapts to traffic and delivery windows as the day moves.',
  },
  {
    icon: TruckIcon,
    title: 'One home for your fleet',
    body: 'Drivers, shifts, vehicles and fuel cards, all connected.',
  },
]

export function AuthBrandPanel() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground relative hidden overflow-hidden px-12 py-16 lg:flex lg:flex-col lg:justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        aria-hidden
        className="bg-primary/40 pointer-events-none absolute -top-32 -end-32 size-96 rounded-full blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -end-8 text-[15rem] leading-none font-extrabold text-white/[0.04] select-none"
      >
        飛脚
      </span>

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-10">
        <div className="flex flex-col gap-4">
          <span className="text-sidebar-foreground/50 text-xs font-medium tracking-[0.25em] uppercase">
            飛脚 · Hikyaku
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-extrabold tracking-tight text-balance">
            The open operating system for delivery teams
          </h2>
          <p className="text-sidebar-foreground/70 text-base leading-relaxed">
            Your dispatcher dashboard, driver app, client portal and delivery tracker. Open
            source and self-hostable, all in one.
          </p>
        </div>

        <ul className="flex flex-col gap-6">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon size={20} weight="duotone" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sidebar-foreground/60 text-sm leading-relaxed">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
