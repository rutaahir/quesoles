import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Radio,
  X,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { useQuesole } from "@/lib/quesole/store";
import type { Role } from "@/lib/quesole/types";
import { motion, AnimatePresence } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Platform Super Admin",
  company_admin: "Company Admin",
  branch_admin: "Branch Admin",
  operator: "Desk Operator",
  customer: "Customer",
};

export interface NavItem {
  id: string;
  label: string;
  icon: typeof Bell;
}

export function ConsoleShell({
  nav,
  active,
  onNavigate,
  children,
}: {
  nav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  const { session, signOut, state, actions, simulating, setSimulating } = useQuesole();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const unread = state.alerts.filter((a) => !a.read).length;

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile Menu Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-40 rounded-xl border border-border/80 bg-background p-2 shadow-md hover:bg-accent transition-all lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r border-border bg-background transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col justify-between h-screen",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex h-16 items-center gap-2.5 border-b border-border px-5 shrink-0">
            <Logo size={32} />
            <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 py-4 flex-1 overflow-y-auto pb-4">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground select-none">
              {session ? ROLE_LABEL[session.role] : "Console"}
            </div>
            <nav className="grid gap-1">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active === item.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {active === item.id ? (
                    <motion.span
                      layoutId="console-nav"
                      className="absolute inset-0 rounded-xl bg-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <item.icon className="relative h-4 w-4 shrink-0" />
                  <span className="relative truncate">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer Details (Bell, User profile details, live sim, sign out) */}
        <div className="border-t border-border bg-background p-4 space-y-4 shrink-0">
          {/* Live Simulation Button */}
          <button
            onClick={() => setSimulating(!simulating)}
            className="flex w-full items-center justify-between rounded-xl bg-accent/50 hover:bg-accent px-3 py-2 text-xs font-semibold transition-all border border-border/40"
          >
            <span className="flex items-center gap-2">
              <Radio className={cn("h-3.5 w-3.5", simulating ? "text-emerald animate-pulse" : "text-muted-foreground")} />
              Live simulation
            </span>
            <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded", simulating ? "bg-emerald/10 text-emerald" : "bg-muted text-muted-foreground")}>
              {simulating ? "ON" : "PAUSED"}
            </span>
          </button>

          {/* System Alerts & Notifications */}
          <div className="relative">
            <button
              onClick={() => setBell((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-border/80 px-3 py-2 text-xs font-semibold bg-background hover:bg-accent transition-all",
                bell && "bg-accent"
              )}
              aria-label="Alerts"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                System Alerts
              </span>
              {unread > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-primary-foreground">
                  {unread}
                </span>
              ) : (
                <span className="text-muted-foreground text-[10px] font-normal">None</span>
              )}
            </button>
            <AnimatePresence>
              {bell ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="panel absolute left-0 bottom-12 z-50 w-[224px] overflow-hidden p-0 border border-border bg-background shadow-2xl rounded-2xl"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-accent/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Alerts</span>
                    <button
                      className="text-[10px] text-brand hover:underline font-bold"
                      onClick={() => actions.readAllAlerts()}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
                    {state.alerts.slice(0, 5).map((a) => (
                       <button
                         key={a.id}
                         onClick={() => actions.readAlert(a.id)}
                         className={cn(
                           "block w-full px-3 py-2.5 text-left hover:bg-accent/40 text-xs transition-colors",
                           !a.read && "bg-accent/20",
                         )}
                       >
                         <div className="flex items-center gap-1.5">
                           <span
                             className={cn(
                               "h-1.5 w-1.5 shrink-0 rounded-full",
                               a.severity === "critical"
                                 ? "bg-coral"
                                 : a.severity === "warning"
                                   ? "bg-amber"
                                   : "bg-emerald",
                             )}
                           />
                           <span className="truncate font-semibold text-foreground">{a.title}</span>
                         </div>
                         <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                           {a.detail}
                         </p>
                       </button>
                    ))}
                    {state.alerts.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No alerts to report.
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* User Profile details block */}
          {session && (
            <div className="flex items-center gap-2.5 p-2 bg-accent/30 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 text-brand font-bold text-xs shrink-0 select-none">
                {session.name ? session.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-foreground leading-none">{session.name}</div>
                <div className="truncate text-[10px] text-muted-foreground mt-1 leading-none">{session.email}</div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button asChild variant="ghost" size="sm" className="w-full justify-start text-xs rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all">
            <Link to="/" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" /> Sign out
            </Link>
          </Button>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <div className="min-w-0 flex-1 flex flex-col">
        {/* Main Content Area: Now full screen width */}
        <main className="w-full px-6 py-6 sm:px-8 sm:py-8 max-w-none flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

// Role switcher removed for database-backed role model.


export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
