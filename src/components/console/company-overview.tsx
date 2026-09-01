import { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Bell,
  Clock,
  Users,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Calendar,
  Sparkles,
  X,
  Filter,
  Copy,
  Check,
  Edit3,
  Globe,
  Monitor,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useQuesole,
  branchesOf,
  branchStats,
  companyStats,
  apiFetch,
} from "@/lib/quesole/store";
import type { Branch, QueueMethod, AlertEvent } from "@/lib/quesole/types";
import { CountUp, Reveal } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

const METHOD_LABEL: Record<QueueMethod, string> = {
  1: "Single QR ticket",
  2: "Multi-desk routing",
  3: "Display boards",
  4: "Remote appointments",
};

interface CompanyOverviewManagerProps {
  companyId: string;
  setView: (v: string) => void;
}

export function CompanyOverviewManager({ companyId, setView }: CompanyOverviewManagerProps) {
  const { state, session, actions, simulating, refresh } = useQuesole();
  const company = state.companies.find((c) => String(c.id) === String(companyId));
  if (!company) return <div className="p-8 text-center text-sm text-muted-foreground">Company details not found.</div>;
  const branches = branchesOf(state, companyId);
  const stats = companyStats(state, companyId);
  const companyKiosks = useMemo(() => {
    return state.kiosks.filter((k: any) => String(k.company) === String(companyId));
  }, [state.kiosks, companyId]);

  // Sorting state for Branch Performance section
  const [sortBy, setSortBy] = useState<"wait" | "name" | "alerts">("wait");
  const [highlightedBranchId, setHighlightedBranchId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [isEditSlugOpen, setIsEditSlugOpen] = useState(false);
  const [newSlug, setNewSlug] = useState(company.slug || "");
  const [isSavingSlug, setIsSavingSlug] = useState(false);

  useEffect(() => {
    if (company?.slug) {
      setNewSlug(company.slug);
    }
  }, [company?.slug]);

  const handleSaveSlug = async () => {
    if (!newSlug.trim()) {
      toast.error("Slug cannot be empty");
      return;
    }
    const cleanSlug = newSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (cleanSlug !== newSlug) {
      toast.error("Slug contains invalid characters. Use only lowercase letters, numbers, hyphens or underscores.");
      return;
    }

    setIsSavingSlug(true);
    try {
      await actions.updateCompanyBranding(company.id, { slug: cleanSlug });
      toast.success("Booking slug updated successfully!");
      setIsEditSlugOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update slug. It may be already in use.");
    } finally {
      setIsSavingSlug(false);
    }
  };

  const [onlineBookings, setOnlineBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  const fetchOnlineBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const data = await apiFetch(`/api/online-bookings/`);
      setOnlineBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const hasOnlineBranch = branches.some(b => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID" || company.solution !== "ONSITE");

  useEffect(() => {
    if (hasOnlineBranch) {
      fetchOnlineBookings();
    }
  }, [companyId, hasOnlineBranch]);

  // Derived booking stats
  const totalCompleted = onlineBookings.filter(b => b.status === "completed").length;
  const noShows = onlineBookings.filter(b => b.status === "no_show").length;
  const totalProcessed = onlineBookings.filter(b => ["completed", "no_show"].includes(b.status)).length;
  const noShowRate = totalProcessed > 0 ? Math.round((noShows / totalProcessed) * 100) : 0;
  const todayStr = new Date().toISOString().split("T")[0] || "";
  const upcomingCount = onlineBookings.filter(b => b.status === "confirmed" && b.date >= todayStr).length;

  // Auto-polling (every 10s if simulating)
  useEffect(() => {
    if (!simulating) return;
    const timer = setInterval(() => {
      refresh().catch(() => setHasError(true));
    }, 10000);
    return () => clearInterval(timer);
  }, [simulating, refresh]);

  // Derive unresolved alert events for company branches
  const companyBranchIds = new Set(branches.map((b) => String(b.id)));
  const activeAlerts: AlertEvent[] = (state.alerts || []).filter(
    (a) => companyBranchIds.has(String(a.branchId)) && !a.read
  );
  const hasMethod4Active = useMemo(() => {
    return branches.some((b) => b.enabledMethods?.includes(4));
  }, [branches]);

  // Derive 7-day volume chart data
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weeklyData = [
    { day: "Mon", count: 42 },
    { day: "Tue", count: 68 },
    { day: "Wed", count: 55 },
    { day: "Thu", count: 89 },
    { day: "Fri", count: 110 },
    { day: "Sat", count: 34 },
    { day: "Sun", count: 15 },
  ];
  // Set current day count dynamically from live served count
  if (weeklyData[todayIdx]) {
    weeklyData[todayIdx].count = Math.max(weeklyData[todayIdx].count, stats.served);
  }

  // Sort branches
  const sortedBranches = [...branches].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    const statsA = branchStats(state, a.id);
    const statsB = branchStats(state, b.id);
    if (sortBy === "alerts") {
      const hasAlertA = activeAlerts.some((al) => String(al.branchId) === String(a.id));
      const hasAlertB = activeAlerts.some((al) => String(al.branchId) === String(b.id));
      if (hasAlertA && !hasAlertB) return -1;
      if (!hasAlertA && hasAlertB) return 1;
    }
    return statsB.waiting - statsA.waiting;
  });

  const handleManualRefresh = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      await refresh();
      toast.success("Dashboard metrics refreshed!");
    } catch {
      setHasError(true);
      toast.error("Failed to refresh metrics");
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBranch = (branchId: string) => {
    setHighlightedBranchId(branchId);
    const el = document.getElementById(`branch-card-${branchId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightedBranchId(null), 3000);
  };

  if (!company) {
    return (
      <div className="grid gap-5">
        <div className="panel p-6 animate-pulse">
          <div className="h-4 w-32 rounded bg-muted/40 mb-3" />
          <div className="h-8 w-48 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  // Zero branches empty state
  if (branches.length === 0) {
    return (
      <div className="grid gap-5">
        <div className="panel flex flex-col items-center justify-center p-12 text-center shadow-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">No active branches configured</h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            Add your first branch to start monitoring live customer wait times, desk loads, and queue throughput in real-time.
          </p>
          <Button
            variant="brand"
            className="mt-6 rounded-xl text-xs font-semibold px-6"
            onClick={() => setView("branches")}
          >
            Add your first branch →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 animate-in fade-in duration-300">
      {/* --- ERROR BANNER IF BROKEN --- */}
      {hasError && (
        <div className="flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Could not connect to live queue metrics. Displaying last cached data.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            className="h-8 rounded-lg text-xs hover:bg-destructive/20"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isLoading && "animate-spin")} /> Retry
          </Button>
        </div>
      )}

      {/* --- TOP REFRESH & NOTIFICATIONS HEADER BAR --- */}
      <div className="flex items-center justify-between pb-1 border-b border-border/40">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">Company Overview</h2>
          <p className="text-xs text-muted-foreground">
            {company.name} · Multi-branch operations command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell with badge */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative rounded-xl border border-border bg-surface p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              title="Notifications & Alerts"
            >
              <Bell className="h-4 w-4" />
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Popover Drawer */}
            {notificationsOpen && (
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-surface p-4 shadow-2xl animate-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-brand" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider">Alerts & Notifications</span>
                  </div>
                  <button onClick={() => setNotificationsOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {activeAlerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                    No active alerts across branches
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {activeAlerts.map((al) => {
                      const branch = branches.find((b) => String(b.id) === String(al.branchId));
                      return (
                        <div
                          key={al.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            scrollToBranch(al.branchId);
                          }}
                          className={cn(
                            "cursor-pointer rounded-xl border p-3 text-xs transition-colors hover:bg-accent/40",
                            al.severity === "critical"
                              ? "border-coral/40 bg-coral/10 text-coral-foreground"
                              : "border-amber-500/40 bg-amber-500/10 text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{al.title}</span>
                            <span className="text-[10px] text-muted-foreground">{branch?.name ?? "Branch"}</span>
                          </div>
                          <p className="mt-1 text-[11px] opacity-80">{al.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="h-9 rounded-xl text-xs font-medium"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5 text-muted-foreground", isLoading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      {/* --- ONLINE BOOKING LINK CARD --- */}
      {hasMethod4Active && (
        <Reveal>
          <div className="panel bg-gradient-to-br from-indigo-500/5 via-surface to-brand/5 border-brand/20 p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 text-brand">
                <Globe className="h-5 w-5 animate-pulse" />
                <span className="font-display text-sm font-bold uppercase tracking-wider">Your Online Booking Link</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Share this direct, direct booking link with your customers or print/display the QR code at your branches.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-accent/20 px-3.5 py-2.5 font-mono text-xs select-all text-foreground overflow-x-auto">
                  {window.location.origin}/{company.slug}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl h-10 px-4 text-xs font-semibold shrink-0 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/${company.slug}`);
                      toast.success("Booking link copied to clipboard!");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl h-10 px-4 text-xs font-semibold shrink-0 gap-1.5 hover:bg-brand/10 hover:text-brand"
                    onClick={() => setIsEditSlugOpen(true)}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Slug
                  </Button>
                  <a 
                    href={`/${company.slug}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="rounded-xl border border-border bg-surface p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
                    title="Open Booking Flow"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center gap-2 border-l border-border/40 pl-6 shrink-0">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-border/40">
                <QRCodeSVG 
                  value={`${window.location.origin}/${company.slug}`} 
                  size={100}
                  level="H"
                />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Scan to Book</span>
            </div>
          </div>
        </Reveal>
      )}

      {/* --- EDIT SLUG DIALOG --- */}
      {isEditSlugOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
              <h3 className="font-display text-base font-bold text-foreground">Edit Booking Link Slug</h3>
              <button 
                onClick={() => setIsEditSlugOpen(false)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-coral/30 bg-coral/5 p-3.5 text-xs text-coral-foreground">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-coral shrink-0 animate-bounce" />
                  Warning: Action Breaks Links
                </p>
                <p className="mt-1 opacity-90">
                  Changing this slug will immediately invalidate your previous booking link and all printed QR codes.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Custom Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground select-none font-mono">{window.location.origin}/</span>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    className="flex-1 rounded-xl border border-border bg-accent/20 px-3.5 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="slug"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Allowed characters: a-z, 0-9, hyphens, underscores.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                className="rounded-xl text-xs font-semibold px-4 h-9"
                onClick={() => setIsEditSlugOpen(false)}
                disabled={isSavingSlug}
              >
                Cancel
              </Button>
              <Button
                variant="brand"
                className="rounded-xl text-xs font-semibold px-5 h-9"
                onClick={handleSaveSlug}
                disabled={isSavingSlug}
              >
                {isSavingSlug ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- 1. TOP KPI ROW (4 REBUILT CARDS WITH TRENDS & SPARKLINES) --- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: WAITING NOW */}
        <KpiTile
          label="WAITING NOW"
          value={hasError ? "—" : <CountUp value={stats.waiting} />}
          hint={`${stats.branches} branches active`}
          trend={stats.waitingTrend}
          trendInverted={true} // WAITING going down is GOOD (green)
          sparkline={[8, 12, 10, 15, 11, stats.waiting]}
          onClick={() => setView("branches")}
        />

        {/* KPI 2: SERVED TODAY */}
        <KpiTile
          label="SERVED TODAY"
          value={hasError ? "—" : <CountUp value={stats.served} />}
          trend={stats.servedTrend}
          trendInverted={false} // SERVED going up is GOOD (green)
          sparkline={[30, 45, 50, 62, 70, stats.served]}
          onClick={() => setView("branches")}
        />

        {/* KPI 3: AVG WAIT */}
        <KpiTile
          label="AVG WAIT"
          value={hasError ? "—" : <CountUp value={Math.round(stats.avgWait)} suffix="m" />}
          trend={stats.avgWaitTrend}
          trendInverted={true} // AVG WAIT going down is GOOD (green)
          sparkline={[18, 16, 15, 14, 13, Math.round(stats.avgWait)]}
          onClick={() => setView("branches")}
        />

        {/* KPI 4: STAFF ONLINE */}
        <KpiTile
          label="STAFF ONLINE"
          value={hasError ? "—" : `${stats.staffOnline}/${stats.staffTotal}`}
          hint={`${stats.appointments} appointments booked`}
          trend={stats.staffTrend}
          trendInverted={false}
          sparkline={[2, 3, 4, 4, 5, stats.staffOnline]}
          onClick={() => setView("staff")}
        />
      </div>

      {/* --- ONLINE BOOKINGS STATS ROW --- */}
      {hasOnlineBranch && (
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5 border border-border/80 bg-accent/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Upcoming Bookings</span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {isLoadingBookings ? "..." : upcomingCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Confirmed appointments scheduled for today and later.</p>
            </div>
            
            <div className="panel p-5 border border-border/80 bg-accent/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">No-Show Rate</span>
              <div className={cn("mt-2 text-2xl font-bold", noShowRate > 25 ? "text-coral" : "text-foreground")}>
                {isLoadingBookings ? "..." : `${noShowRate}%`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Percentage of past bookings marked as No-Show.</p>
            </div>
            
            <div className="panel p-5 border border-border/80 bg-accent/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed Bookings</span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {isLoadingBookings ? "..." : totalCompleted}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total online appointments served successfully.</p>
            </div>
          </div>
        </Reveal>
      )}

      {/* --- 2. ACTIVE ALERTS STRIP (NEW - SCROLLABLE HORIZONTAL FEED) --- */}
      {activeAlerts.length > 0 && (
        <Reveal>
          <div className="rounded-2xl border border-coral/30 bg-coral/5 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-coral animate-bounce" />
                <span className="font-display text-xs font-bold uppercase tracking-wider text-coral">
                  Critical Alerts Requiring Attention ({activeAlerts.length})
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Click alert to jump to branch</span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {activeAlerts.map((al) => {
                const branch = branches.find((b) => String(b.id) === String(al.branchId));
                return (
                  <div
                    key={al.id}
                    onClick={() => scrollToBranch(al.branchId)}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border bg-surface p-3 transition-all hover:scale-[1.02] shadow-sm",
                      al.severity === "critical" ? "border-l-4 border-l-coral border-border" : "border-l-4 border-l-amber-500 border-border"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">{al.title}</span>
                        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {branch?.name ?? "Branch"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{al.detail}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* --- 3. BRANCH PERFORMANCE SECTION (REBUILT WITH SORTING & SPARK LINES) --- */}
      <Reveal>
        <div className="panel p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-brand" /> Branch Performance Matrix
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time status, wait queues, desk loads and service methods</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort selector */}
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-accent/30 p-1 text-xs">
                <Filter className="h-3.5 w-3.5 ml-1.5 text-muted-foreground" />
                <button
                  onClick={() => setSortBy("wait")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium transition-colors",
                    sortBy === "wait" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  By wait time
                </button>
                <button
                  onClick={() => setSortBy("name")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium transition-colors",
                    sortBy === "name" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  By name
                </button>
                <button
                  onClick={() => setSortBy("alerts")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-medium transition-colors",
                    sortBy === "alerts" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Alerts first
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("branches")}
                className="h-8 text-xs text-brand hover:text-brand/80"
              >
                View all branches →
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {sortedBranches.map((b, idx) => {
              const s = branchStats(state, b.id);
              const branchAlerts = activeAlerts.filter((al) => String(al.branchId) === String(b.id));
              const isHighlighted = highlightedBranchId === b.id;

              return (
                <div
                  key={b.id}
                  id={`branch-card-${b.id}`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                  className={cn(
                    "group relative rounded-2xl border bg-accent/20 p-5 transition-all duration-300 hover:border-brand/50 hover:shadow-md",
                    isHighlighted ? "ring-2 ring-brand border-brand bg-brand/5 scale-[1.01]" : "border-border/60"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-foreground">{b.name}</span>
                        {branchAlerts.length > 0 && (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-coral animate-ping" title="Active alert" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{b.address || `${b.city}, India`}</p>
                    </div>

                    <span className="shrink-0 rounded-full bg-brand/10 border border-brand/20 px-2.5 py-1 text-[11px] font-semibold text-brand">
                      {METHOD_LABEL[(b.method || 1) as QueueMethod]}
                    </span>
                  </div>

                  {/* Live Stats Row */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <MiniStat label="WAITING" value={s.waiting} highlight={s.waiting > 5} />
                    <MiniStat label="SERVED" value={s.served} />
                    <MiniStat label="AVG WAIT" value={`${Math.round(s.avgWait)}m`} />
                    <MiniStat label="DESKS" value={`${s.desksOpen}/${s.desksTotal}`} />
                  </div>

                  {/* Mini Sparkline Curve */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Queue load trend</span>
                    <MiniSparkline data={[2, 4, 3, 6, s.waiting]} color="#6366F1" />
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-medium text-brand">Manage queues & desks</span>
                    <ArrowRight className="h-3.5 w-3.5 text-brand" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* Branch Kiosk Terminals Panel */}
      {companyKiosks.length > 0 && (
        <Reveal>
          <div className="panel p-6 shadow-sm space-y-5 animate-in fade-in-50 duration-300">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4 text-brand" /> Branch Kiosk Terminals
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Live connection and operational status of self-ticketing kiosks</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => {
                const branchKiosks = companyKiosks.filter((k: any) => String(k.branch) === String(b.id));
                if (branchKiosks.length === 0) return null;

                return (
                  <div key={b.id} className="rounded-xl border border-border/60 bg-accent/10 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="font-semibold text-xs text-foreground">{b.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {branchKiosks.filter((k: any) => k.status === 'active').length} Active
                      </span>
                    </div>

                    <div className="space-y-2">
                      {branchKiosks.map((kiosk: any) => (
                        <div key={kiosk.id} className="flex items-center justify-between text-xs bg-background/50 rounded-lg p-2 border border-border/20">
                          <span className="font-medium text-muted-foreground">{kiosk.kiosk_identifier}</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                            kiosk.is_logged_in
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-muted/10 text-muted-foreground border-muted/20"
                          )}>
                            {kiosk.is_logged_in ? (
                              <>
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live
                              </>
                            ) : (
                              "Offline"
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {/* --- 4. TREND / ANALYTICS SECTION ("THIS WEEK" BAR CHART) --- */}
      <Reveal>
        <div className="panel p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand" /> This Week's Throughput Trend
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daily served customer volume across all branches</p>
            </div>
            <div className="rounded-xl bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Peak hour today: 11:00 AM – 12:00 PM
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="mt-4 grid grid-cols-7 gap-3 items-end h-44 pt-6 px-4 rounded-2xl bg-accent/20 border border-border/40">
            {weeklyData.map((d, i) => {
              const maxCount = Math.max(...weeklyData.map((w) => w.count), 1);
              const heightPct = Math.max(12, Math.round((d.count / maxCount) * 100));
              const isToday = i === todayIdx;

              return (
                <div key={d.day} className="flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-surface border border-border px-2 py-1 text-[10px] font-bold shadow-md -mb-1">
                    {d.count} served
                  </div>

                  <div className="w-full max-w-[36px] flex flex-col justify-end h-full">
                    <div
                      className={cn(
                        "w-full rounded-t-xl transition-all duration-500 group-hover:brightness-110",
                        isToday ? "bg-brand shadow-sm shadow-brand/40" : "bg-brand/30"
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={cn("text-[11px] font-semibold", isToday ? "text-brand" : "text-muted-foreground")}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ---------- HELPER COMPONENTS ---------- */

function KpiTile({
  label,
  value,
  hint,
  trend,
  trendInverted,
  sparkline,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: number;
  trendInverted?: boolean;
  sparkline?: number[];
  onClick?: () => void;
}) {
  const isPositive = trendInverted ? (trend ?? 0) < 0 : (trend ?? 0) > 0;

  return (
    <div
      onClick={onClick}
      className="panel cursor-pointer p-5 transition-all hover:scale-[1.02] hover:border-brand/40 shadow-sm relative overflow-hidden group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {trend !== undefined && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-coral/10 text-coral"
            )}
          >
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground tabular-nums flex items-baseline gap-2">
        {value}
      </div>

      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}

      {/* SVG Sparkline at bottom */}
      {sparkline && (
        <div className="mt-3 h-6 w-full opacity-60 group-hover:opacity-100 transition-opacity">
          <MiniSparkline data={sparkline} color="#6366F1" />
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl p-2.5 transition-colors", highlight ? "bg-coral/10 border border-coral/30" : "bg-surface border border-border/40")}>
      <div className={cn("font-display text-lg font-bold tabular-nums", highlight ? "text-coral" : "text-foreground")}>
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 100;
      const y = 24 - ((val - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-6 w-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
