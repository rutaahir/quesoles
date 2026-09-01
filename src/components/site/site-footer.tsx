import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/site/logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Walk-in queues", to: "/" },
      { label: "Service routing", to: "/" },
      { label: "Display boards", to: "/display/b_amd_central" },
      { label: "Appointments", to: "/book" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Healthcare", to: "/" },
      { label: "Banking", to: "/" },
      { label: "Government", to: "/" },
      { label: "Telecom", to: "/" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Live demo", to: "/app" },
      { label: "Kiosk mode", to: "/kiosk/b_amd_central" },
      { label: "Join a queue", to: "/q/b_amd_central" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Start free", to: "/signup" },
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand opacity-60"
        aria-hidden
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.4fr_repeat(4,1fr)] lg:px-8">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-display text-base font-bold">Quesole</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Queue, appointment and branch orchestration for teams that serve people all day,
            every day.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {col.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to as "/"}
                    className="text-sm text-foreground/80 transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-border px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 Quesole. Demo environment running on simulated data.</p>
        <p>Made for service teams in Ahmedabad, Surat, Mumbai, Rajkot & Delhi.</p>
      </div>
    </footer>
  );
}
