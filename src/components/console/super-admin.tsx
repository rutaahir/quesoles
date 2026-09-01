import { useState } from "react";
import {
  Check, Search, ShieldAlert, X, Plus, Trash2, Edit2, ArrowUp, ArrowDown,
  HelpCircle, CheckCircle2, AlertTriangle, FileText, Sparkles, Monitor,
  Globe, Printer, Building, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuesole, branchStats, planOf } from "@/lib/quesole/store";
import { StatCard } from "@/components/console/shell";
import { CountUp, Reveal } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export function SuperAdminView({ view }: { view: string }) {
  const { state, actions } = useQuesole();
  const [q, setQ] = useState("");

  const mrr = state.companies.reduce((a, c) => a + c.monthlySpend, 0);
  const totalWaiting = state.branches.reduce((a, b) => a + branchStats(state, b.id).waiting, 0);
  const openUpgrades = state.upgrades.filter((u) => u.status === "open");

  if (view === "companies") {
    const rows = state.companies.filter((c) =>
      `${c.name} ${c.city} ${c.industry}`.toLowerCase().includes(q.toLowerCase()),
    );
    return (
      <div className="grid gap-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search companies, cities, industries"
              className="h-11 rounded-xl pl-9"
            />
          </div>
        </div>
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Plan</th>
                <th className="hidden px-5 py-3 sm:table-cell">Branches</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.industry} · {c.city}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">{planOf(c.plan).name}</td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">{c.branchIds.length}</td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {c.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="brand"
                        onClick={() => {
                          actions.approveCompany(c.id);
                          toast.success(`${c.name} approved`);
                        }}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    ) : c.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          actions.suspendCompany(c.id);
                          toast(`${c.name} suspended`);
                        }}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => actions.approveCompany(c.id)}
                      >
                        Reactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === "upgrades") {
    return (
      <div className="grid gap-3">
        {state.upgrades.map((u) => {
          const company = state.companies.find((c) => c.id === u.companyId);
          return (
            <div
              key={u.id}
              className="panel flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div>
                <div className="font-semibold">{company?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {planOf(u.from).name} → {planOf(u.to).name} · requested {u.requestedAt}
                </div>
              </div>
              {u.status === "open" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => {
                      actions.resolveUpgrade(u.id, "approved");
                      toast.success("Upgrade approved");
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => actions.resolveUpgrade(u.id, "declined")}
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                </div>
              ) : (
                <StatusPill status={u.status === "approved" ? "active" : "suspended"} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (view === "audit") {
    return (
      <div className="panel divide-y divide-border/60">
        {state.audit.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-sm">
                <span className="font-medium">{a.actor}</span> — {a.action}
              </div>
              <div className="text-xs text-muted-foreground">
                {a.target} · {new Date(a.at).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "packages" || view === "plan_builder") {
    return <PlanBuilderManager />;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Companies" value={<CountUp value={state.companies.length} />} hint="Across all plans" />
        <StatCard
          label="Monthly revenue"
          value={<CountUp value={mrr} prefix="₹" />}
          hint="Simulated MRR"
        />
        <StatCard label="Live waiting" value={<CountUp value={totalWaiting} />} hint="Platform-wide" />
        <StatCard
          label="Open requests"
          value={<CountUp value={openUpgrades.length} />}
          hint="Plan upgrades pending"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Branch load
            </h3>
            <div className="mt-4 grid gap-3">
              {state.branches.map((b) => {
                const s = branchStats(state, b.id);
                const pct = Math.min(100, s.waiting * 9);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{b.name}</span>
                      <span className="tabular-nums text-muted-foreground">{s.waiting} waiting</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          pct > 70 ? "bg-coral" : pct > 40 ? "bg-amber" : "bg-brand",
                        )}
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Recent alerts
            </h3>
            <div className="mt-4 grid gap-2.5">
              {state.alerts.slice(0, 6).map((a) => (
                <div key={a.id} className="rounded-xl bg-accent/40 px-3.5 py-2.5">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: "active" | "pending" | "suspended" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
        status === "active"
          ? "bg-emerald/12 text-emerald"
          : status === "pending"
            ? "bg-amber/15 text-amber"
            : "bg-coral/12 text-coral",
      )}
    >
      {status}
    </span>
  );
}

export function PlanBuilderManager() {
  const { state, actions } = useQuesole();
  const [activeTab, setActiveTab] = useState<"solutions" | "components" | "delivery" | "durations">("components");

  // Editing modals states
  const [editingSolution, setEditingSolution] = useState<any | null>(null);
  const [editingComponent, setEditingComponent] = useState<any | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<any | null>(null);
  const [editingDuration, setEditingDuration] = useState<any | null>(null);

  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);

  // Price confirmation dialog
  const [pendingPriceSave, setPendingPriceSave] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);

  // Form states
  const [solutionForm, setSolutionForm] = useState({
    key: "",
    label: "",
    description: "",
    icon_key: "sparkles",
    is_active: true,
    display_order: 0
  });

  const [componentForm, setComponentForm] = useState({
    key: "",
    label: "",
    description: "",
    unit_label: "unit",
    default_included_qty: 0,
    price_per_unit: 0,
    is_toggle: false,
    min_qty: 0,
    max_qty: "",
    category: "ADDON",
    branch_mode_scope: "BOTH",
    pricing_type: "PER_UNIT",
    max_qty_per_branch: "",
    is_addon_only: false,
    display_order: 0,
    icon_key: "",
    is_active: true,
    is_mandatory: false
  });

  const [deliveryForm, setDeliveryForm] = useState({
    key: "",
    label: "",
    price_per_branch: 0,
    is_active: true,
    requires_hardware: false,
    display_order: 0,
    queue_method_code: ""
  });

  const [durationForm, setDurationForm] = useState({
    months: 1,
    discount_percent: 0,
    is_active: true,
    display_order: 0
  });

  // Solutions actions
  const openNewSolution = () => {
    setSolutionForm({ key: "", label: "", description: "", icon_key: "sparkles", is_active: true, display_order: 0 });
    setEditingSolution(null);
    setIsSolutionModalOpen(true);
  };

  const openEditSolution = (st: any) => {
    setEditingSolution(st);
    setSolutionForm({
      key: st.key,
      label: st.label,
      description: st.description || "",
      icon_key: st.icon_key || "sparkles",
      is_active: st.is_active,
      display_order: st.display_order
    });
    setIsSolutionModalOpen(true);
  };

  const handleSaveSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSolution) {
        await actions.updateQueueSolutionType(editingSolution.id, solutionForm);
        toast.success(`Updated Solution Type: ${solutionForm.label}`);
      } else {
        await actions.createQueueSolutionType(solutionForm);
        toast.success(`Created Solution Type: ${solutionForm.label}`);
      }
      setIsSolutionModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save solution type");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSolution = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete solution type "${name}"?`)) {
      try {
        await actions.deleteQueueSolutionType(id);
        toast.success(`Deleted solution type: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete solution type");
      }
    }
  };

  // Plan components actions
  const openNewComponent = () => {
    setComponentForm({
      key: "",
      label: "",
      description: "",
      unit_label: "unit",
      default_included_qty: 0,
      price_per_unit: 0,
      is_toggle: false,
      min_qty: 0,
      max_qty: "",
      category: "ADDON",
      branch_mode_scope: "BOTH",
      pricing_type: "PER_UNIT",
      max_qty_per_branch: "",
      is_addon_only: false,
      display_order: 0,
      icon_key: "",
      is_active: true,
      is_mandatory: false
    });
    setEditingComponent(null);
    setIsComponentModalOpen(true);
  };

  const openEditComponent = (comp: any) => {
    setEditingComponent(comp);
    setComponentForm({
      key: comp.key,
      label: comp.label,
      description: comp.description || "",
      unit_label: comp.unit_label || "unit",
      default_included_qty: comp.default_included_qty,
      price_per_unit: comp.price_per_unit,
      is_toggle: comp.is_toggle,
      min_qty: comp.min_qty,
      max_qty: comp.max_qty !== null ? String(comp.max_qty) : "",
      category: comp.category || "ADDON",
      branch_mode_scope: comp.branch_mode_scope || "BOTH",
      pricing_type: comp.pricing_type || "PER_UNIT",
      max_qty_per_branch: comp.max_qty_per_branch !== null && comp.max_qty_per_branch !== undefined ? String(comp.max_qty_per_branch) : "",
      is_addon_only: comp.is_addon_only || false,
      display_order: comp.display_order || 0,
      icon_key: comp.icon_key || "",
      is_active: comp.is_active,
      is_mandatory: comp.is_mandatory || false
    });
    setIsComponentModalOpen(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...componentForm,
      max_qty: componentForm.max_qty ? Number(componentForm.max_qty) : null,
      max_qty_per_branch: componentForm.max_qty_per_branch ? Number(componentForm.max_qty_per_branch) : null,
      default_included_qty: Number(componentForm.default_included_qty),
      price_per_unit: Number(componentForm.price_per_unit),
      min_qty: Number(componentForm.min_qty),
      display_order: Number(componentForm.display_order)
    };

    // If editing and price per unit changed, prompt warning modal
    if (editingComponent && Number(editingComponent.price_per_unit) !== payload.price_per_unit) {
      setPendingPriceSave(payload);
      return;
    }

    executeSaveComponent(payload);
  };

  const executeSaveComponent = async (payload: any) => {
    setSaving(true);
    try {
      if (editingComponent) {
        await actions.updatePlanComponent(editingComponent.id, payload);
        toast.success(`Updated ${payload.label}. Price: ₹${editingComponent.price_per_unit} → ₹${payload.price_per_unit}`);
      } else {
        await actions.createPlanComponent(payload);
        toast.success(`Created component: ${payload.label}`);
      }
      setIsComponentModalOpen(false);
      setPendingPriceSave(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan component");
    } finally {
      setSaving(false);
    }
  };

  // Delivery methods actions
  const openNewDelivery = () => {
    setDeliveryForm({ key: "", label: "", price_per_branch: 0, is_active: true, requires_hardware: false, display_order: 0, queue_method_code: "" });
    setEditingDelivery(null);
    setIsDeliveryModalOpen(true);
  };

  const openEditDelivery = (tm: any) => {
    setEditingDelivery(tm);
    setDeliveryForm({
      key: tm.key,
      label: tm.label,
      price_per_branch: tm.price_per_branch || 0,
      is_active: tm.is_active,
      requires_hardware: tm.requires_hardware,
      display_order: tm.display_order,
      queue_method_code: tm.queue_method_code || ""
    });
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...deliveryForm,
        price_per_branch: Number(deliveryForm.price_per_branch)
      };
      if (editingDelivery) {
        await actions.updateTokenDeliveryMethod(editingDelivery.id, payload);
        toast.success(`Updated Delivery Method: ${payload.label}`);
      } else {
        await actions.createTokenDeliveryMethod(payload);
        toast.success(`Created Delivery Method: ${payload.label}`);
      }
      setIsDeliveryModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save delivery method");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDelivery = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete delivery method "${name}"?`)) {
      try {
        await actions.deleteTokenDeliveryMethod(id);
        toast.success(`Deleted delivery method: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete delivery method");
      }
    }
  };

  // Duration tiers actions
  const openNewDuration = () => {
    setDurationForm({ months: 1, discount_percent: 0, is_active: true, display_order: 0 });
    setEditingDuration(null);
    setIsDurationModalOpen(true);
  };

  const openEditDuration = (dt: any) => {
    setEditingDuration(dt);
    setDurationForm({
      months: dt.months,
      discount_percent: dt.discount_percent,
      is_active: dt.is_active,
      display_order: dt.display_order
    });
    setIsDurationModalOpen(true);
  };

  const handleSaveDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDuration) {
        await actions.updateDurationTier(editingDuration.id, durationForm);
        toast.success(`Updated Duration Tier: ${durationForm.months} Months`);
      } else {
        await actions.createDurationTier(durationForm);
        toast.success(`Created Duration Tier: ${durationForm.months} Months`);
      }
      setIsDurationModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save duration tier");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDuration = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete duration tier "${name}"?`)) {
      try {
        await actions.deleteDurationTier(id);
        toast.success(`Deleted duration tier: ${name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to delete duration tier");
      }
    }
  };

  // Reordering helpers
  const handleMoveSolutionOrder = async (st: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? st.display_order - 1 : st.display_order + 1;
    try {
      await actions.updateQueueSolutionType(st.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveComponentOrder = async (comp: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? comp.display_order - 1 : comp.display_order + 1;
    try {
      await actions.updatePlanComponent(comp.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveDeliveryOrder = async (tm: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? tm.display_order - 1 : tm.display_order + 1;
    try {
      await actions.updateTokenDeliveryMethod(tm.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  const handleMoveDurationOrder = async (dt: any, dir: "up" | "down") => {
    const newOrder = dir === "up" ? dt.display_order - 1 : dt.display_order + 1;
    try {
      await actions.updateDurationTier(dt.id, { display_order: Math.max(0, newOrder) });
      toast.success("Order updated");
    } catch (err: any) {
      toast.error("Failed to update order");
    }
  };

  return (
    <div className="grid gap-6">
      {/* Superadmin pricing header banner */}
      <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 text-sm text-brand-foreground flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-brand uppercase tracking-wider text-xs">
            <ShieldAlert className="h-4 w-4" /> Itemized Subscription Pricing Engine
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Price changes only apply to new purchases and subsequent registrations. Existing clients keep their locked-in purchase pricing, preventing unexpected rate changes.
          </p>
        </div>
        <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-bold text-brand z-10 shrink-0">
          V2 Engine Active
        </span>
      </div>

      {/* Tabs list navigation */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("components")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "components" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Branch Components
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.planComponents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("solutions")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "solutions" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Solution Types
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.solutionTypes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("delivery")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "delivery" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Token Delivery
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.tokenDeliveryMethods.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("durations")}
          className={cn(
            "px-5 py-3.5 text-sm font-semibold border-b-2 transition-all duration-200 relative",
            activeTab === "durations" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Subscription Durations
          <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold">
            {state.durationTiers.length}
          </span>
        </button>
      </div>

      {/* Render Active Tab Content */}

      {/* ── BRANCH COMPONENTS TAB ────────────────────────────────────────────── */}
      {activeTab === "components" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Branch Components</h3>
                <p className="text-xs text-muted-foreground">Manage countable resource limits, toggles, and mode scopes.</p>
              </div>
              <Button variant="brand" onClick={openNewComponent}>
                <Plus className="h-4 w-4 mr-1" /> Add Component
              </Button>
            </div>

            {/* Categories list groups */}
            {["SERVICE", "OPERATOR_DESK", "KIOSK", "ADDON", "BRANCH_SETUP"].map((cat) => {
              const comps = state.planComponents
                .filter((c) => c.category === cat)
                .sort((a, b) => a.display_order - b.display_order);

              if (comps.length === 0) return null;

              return (
                <div key={cat} className="panel p-5 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                    {cat === "SERVICE" ? "Services & Queues" : cat === "OPERATOR_DESK" ? "Operator Desks" : cat === "KIOSK" ? "Kiosks & Hardware" : cat === "BRANCH_SETUP" ? "Setup & Branch Fees" : "Add-ons"}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                          <th className="py-2">Component</th>
                          <th className="py-2">Scope Scope</th>
                          <th className="py-2">Default Included</th>
                          <th className="py-2">Max / Branch</th>
                          <th className="py-2">Price</th>
                          <th className="py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {comps.map((c) => (
                          <tr key={c.id} className="hover:bg-accent/10 transition-colors">
                            <td className="py-3 pr-2">
                              <div className="flex items-center gap-1.5">
                                <div className="font-semibold text-foreground">{c.label}</div>
                                {c.is_mandatory && (
                                  <span className="rounded bg-coral/10 border border-coral/20 px-1.5 py-0.5 text-[8px] font-bold text-coral shrink-0 uppercase tracking-wider">
                                    Required
                                  </span>
                                )}
                              </div>
                              <code className="text-[10px] text-brand">{c.key}</code>
                            </td>
                            <td className="py-3">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                                c.branch_mode_scope === "SERVICE_BASED"
                                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                                  : c.branch_mode_scope === "NON_SERVICE_BASED"
                                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                    : "bg-emerald/15 text-emerald"
                              )}>
                                {c.branch_mode_scope === "BOTH" ? "Both Modes" : c.branch_mode_scope.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 pl-2 font-medium">{c.default_included_qty} {c.unit_label}</td>
                            <td className="py-3 font-medium">
                              {c.max_qty_per_branch !== null ? c.max_qty_per_branch : "Unlimited"}
                            </td>
                            <td className="py-3 font-bold text-emerald">
                              ₹{c.price_per_unit.toLocaleString("en-IN")}{c.pricing_type === "FLAT" ? " flat" : ` / ${c.unit_label}`}
                            </td>
                            <td className="py-3 text-right">
                              <div className="inline-flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleMoveComponentOrder(c, "up")}>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleMoveComponentOrder(c, "down")}>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditComponent(c)}>
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Audit Logs */}
          <div className="space-y-6">
            <div className="panel p-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b border-border pb-3 flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Price Change Log Audit
              </h3>
              <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {state.priceLogs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No price audit records found yet.</div>
                ) : (
                  state.priceLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-border bg-accent/10 p-3 text-xs space-y-1.5 relative">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{log.component_label || log.component_key}</span>
                        <span className="text-brand">{log.component_key}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground line-through">₹{log.old_price}</span>
                        <span className="text-emerald font-bold">→ ₹{log.new_price}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between pt-1 border-t border-border/50">
                        <span>By {log.changed_by_email || "System"}</span>
                        <span>{new Date(log.changed_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SOLUTIONS TYPES TAB ────────────────────────────────────────────── */}
      {activeTab === "solutions" && (
        <div className="panel p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Queue Solution Types</h3>
              <p className="text-xs text-muted-foreground">Configure the core business modes offered in step 1 of client signup.</p>
            </div>
            <Button variant="brand" onClick={openNewSolution}>
              <Plus className="h-4 w-4 mr-1" /> Add Solution Type
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Solution Key</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {state.solutionTypes.sort((a,b) => a.display_order - b.display_order).map((st) => (
                  <tr key={st.id} className="hover:bg-accent/10 transition-colors">
                    <td className="py-3 font-semibold text-brand">{st.key}</td>
                    <td className="py-3 font-medium">{st.label}</td>
                    <td className="py-3 text-muted-foreground text-xs">{st.description}</td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        st.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                      )}>
                        {st.is_active ? "Active" : "Retired"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleMoveSolutionOrder(st, "up")}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveSolutionOrder(st, "down")}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditSolution(st)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteSolution(st.id, st.label)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TOKEN DELIVERY METHODS TAB ───────────────────────────────────────── */}
      {activeTab === "delivery" && (
        <div className="panel p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Token Delivery Methods</h3>
              <p className="text-xs text-muted-foreground">Manage ticket notification pathways, branch-level setup costs, and hardware rules.</p>
            </div>
            <Button variant="brand" onClick={openNewDelivery}>
              <Plus className="h-4 w-4 mr-1" /> Add Method
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2">Method Key</th>
                  <th className="py-2">Label</th>
                  <th className="py-2">Price per Branch</th>
                  <th className="py-2">Hardware Required</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {state.tokenDeliveryMethods.sort((a,b) => a.display_order - b.display_order).map((tm) => (
                  <tr key={tm.id} className="hover:bg-accent/10 transition-colors">
                    <td className="py-3 font-semibold text-brand">{tm.key}</td>
                    <td className="py-3 font-medium">{tm.label}</td>
                    <td className="py-3 font-bold text-emerald">
                      {tm.price_per_branch && tm.price_per_branch > 0 ? `₹${tm.price_per_branch}/mo` : "Free"}
                    </td>
                    <td className="py-3">
                      {tm.requires_hardware ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber/10 border border-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber">
                          <Printer className="h-3 w-3" /> Hardware Needed
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tm.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                      )}>
                        {tm.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleMoveDeliveryOrder(tm, "up")}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleMoveDeliveryOrder(tm, "down")}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDelivery(tm)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteDelivery(tm.id, tm.label)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION DURATIONS TAB ───────────────────────────────────────── */}
      {activeTab === "durations" && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 panel p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Subscription Duration discount Tiers</h3>
                <p className="text-xs text-muted-foreground">Add billing durations and configure percentage discounts to incentivize long contracts.</p>
              </div>
              <Button variant="brand" onClick={openNewDuration}>
                <Plus className="h-4 w-4 mr-1" /> Add Duration
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-2">Months Contract</th>
                    <th className="py-2">Discount Percent</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {state.durationTiers.sort((a,b) => a.display_order - b.display_order).map((dt) => (
                    <tr key={dt.id} className="hover:bg-accent/10 transition-colors">
                      <td className="py-3 font-semibold">{dt.months} Months</td>
                      <td className="py-3 font-bold text-emerald">
                        {dt.discount_percent > 0 ? `${dt.discount_percent}% Off` : "None (List Price)"}
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          dt.is_active ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                        )}>
                          {dt.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleMoveDurationOrder(dt, "up")}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleMoveDurationOrder(dt, "down")}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDuration(dt)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-coral" onClick={() => handleDeleteDuration(dt.id, `${dt.months} Months`)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Discount Selector Preview Card */}
          <div className="space-y-6">
            <div className="panel p-5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-3">
                Live Customer Selector Preview
              </h3>
              <div className="mt-4 space-y-3">
                {state.durationTiers.filter(dt => dt.is_active).map((dt) => (
                  <div key={dt.id} className={cn(
                    "rounded-xl border border-border p-4 transition-all duration-300 relative overflow-hidden flex items-center justify-between",
                    dt.months === 12 ? "bg-brand/10 border-brand/50 shadow-md" : "bg-accent/20"
                  )}>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold text-sm">{dt.months} Months Plan</div>
                        <div className="text-xs text-muted-foreground">Billed contractually every {dt.months} months</div>
                      </div>
                    </div>
                    {dt.discount_percent > 0 ? (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                        Save {dt.discount_percent}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold">Standard</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS FOR SOLUTIONS CRUD ──────────────────────────────────────── */}
      {isSolutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingSolution ? `Edit ${editingSolution.label}` : "Add Solution Type"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsSolutionModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveSolution} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unique Key</label>
                <Input
                  required
                  disabled={Boolean(editingSolution)}
                  value={solutionForm.key}
                  onChange={(e) => setSolutionForm({ ...solutionForm, key: e.target.value })}
                  placeholder="e.g. ONSITE_ONLINE"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <Input
                  required
                  value={solutionForm.label}
                  onChange={(e) => setSolutionForm({ ...solutionForm, label: e.target.value })}
                  placeholder="e.g. Walk-in & Appointments"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input
                  value={solutionForm.description}
                  onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
                  placeholder="Help text shown under card on registration page"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Icon Identifier</label>
                  <Input
                    value={solutionForm.icon_key}
                    onChange={(e) => setSolutionForm({ ...solutionForm, icon_key: e.target.value })}
                    placeholder="sparkles / monitor / globe"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={solutionForm.display_order}
                    onChange={(e) => setSolutionForm({ ...solutionForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs">
                <input
                  type="checkbox"
                  checked={solutionForm.is_active}
                  onChange={(e) => setSolutionForm({ ...solutionForm, is_active: e.target.checked })}
                  className="rounded border-border text-brand"
                />
                <span>Active (Available at registration signup wizard)</span>
              </label>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setIsSolutionModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Solution"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS FOR COMPONENTS CRUD ─────────────────────────────────────── */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingComponent ? `Edit ${editingComponent.label}` : "Add Plan Component"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsComponentModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveComponent} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Component Key</label>
                  <Input
                    required
                    disabled={Boolean(editingComponent)}
                    value={componentForm.key}
                    onChange={(e) => setComponentForm({ ...componentForm, key: e.target.value })}
                    placeholder="e.g. services"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                  <Input
                    required
                    value={componentForm.label}
                    onChange={(e) => setComponentForm({ ...componentForm, label: e.target.value })}
                    placeholder="e.g. Service Queues"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Input
                  value={componentForm.description}
                  onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
                  placeholder="Help text shown under input"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select
                    value={componentForm.category}
                    onChange={(e) => setComponentForm({ ...componentForm, category: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="SERVICE">Services</option>
                    <option value="OPERATOR_DESK">Operator Desks</option>
                    <option value="KIOSK">Kiosks & Displays</option>
                    <option value="ADDON">Add-ons</option>
                    <option value="BRANCH_SETUP">Setup / Branch Setup</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Branch Mode Scope</label>
                  <select
                    value={componentForm.branch_mode_scope}
                    onChange={(e) => setComponentForm({ ...componentForm, branch_mode_scope: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="BOTH">Both Modes</option>
                    <option value="SERVICE_BASED">Service-Based Only</option>
                    <option value="NON_SERVICE_BASED">Non-Service-Based Only</option>
                    <option value="N_A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Pricing Type</label>
                  <select
                    value={componentForm.pricing_type}
                    onChange={(e) => setComponentForm({ ...componentForm, pricing_type: e.target.value })}
                    className="mt-1 block h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                  >
                    <option value="PER_UNIT">Per Unit</option>
                    <option value="FLAT">Flat Fee</option>
                    <option value="TOGGLE_PAID">Toggle Paid</option>
                    <option value="TOGGLE_FREE">Toggle Free</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Unit Label</label>
                  <Input
                    value={componentForm.unit_label}
                    onChange={(e) => setComponentForm({ ...componentForm, unit_label: e.target.value })}
                    placeholder="branch / screen"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Default Included</label>
                  <Input
                    type="number"
                    min={0}
                    value={componentForm.default_included_qty}
                    onChange={(e) => setComponentForm({ ...componentForm, default_included_qty: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price per unit (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    value={componentForm.price_per_unit}
                    onChange={(e) => setComponentForm({ ...componentForm, price_per_unit: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Max per Branch</label>
                  <Input
                    type="number"
                    value={componentForm.max_qty_per_branch}
                    onChange={(e) => setComponentForm({ ...componentForm, max_qty_per_branch: e.target.value })}
                    placeholder="e.g. 50"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={componentForm.display_order}
                    onChange={(e) => setComponentForm({ ...componentForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Icon Key</label>
                  <Input
                    value={componentForm.icon_key}
                    onChange={(e) => setComponentForm({ ...componentForm, icon_key: e.target.value })}
                    placeholder="monitor / building"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 rounded-xl border border-border bg-accent/20 p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_toggle}
                    onChange={(e) => setComponentForm({ ...componentForm, is_toggle: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Binary Toggle</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_addon_only}
                    onChange={(e) => setComponentForm({ ...componentForm, is_addon_only: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Add-on Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_mandatory}
                    onChange={(e) => setComponentForm({ ...componentForm, is_mandatory: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Is Mandatory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={componentForm.is_active}
                    onChange={(e) => setComponentForm({ ...componentForm, is_active: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsComponentModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Component"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SAFETY CONFIRMATION MODAL FOR PRICES ───────────────────────────────── */}
      {pendingPriceSave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-coral/30 bg-background p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 text-coral">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">Warning: Modifying Global Pricing</h3>
            </div>
            <div className="mt-3 text-sm space-y-3 text-muted-foreground">
              <p>
                You are updating the unit price for <strong>{editingComponent?.label}</strong>:
              </p>
              <div className="rounded-xl bg-accent/40 px-4 py-2 text-center font-mono font-bold text-foreground">
                ₹{editingComponent?.price_per_unit} → ₹{pendingPriceSave.price_per_unit}
              </div>
              <p className="text-xs border-l-2 border-brand/50 pl-3 italic">
                "Existing company contracts retain their locked pricing history. This adjustment will only affect new registrations and subsequently purchased add-on packages."
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/60">
              <Button variant="outline" onClick={() => setPendingPriceSave(null)}>Cancel</Button>
              <Button variant="brand" onClick={() => executeSaveComponent(pendingPriceSave)} disabled={saving}>
                {saving ? "Updating Price..." : "Acknowledge & Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS FOR DELIVERY METHOD CRUD ───────────────────────────────────── */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingDelivery ? `Edit ${editingDelivery.label}` : "Add Token Delivery Method"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsDeliveryModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveDelivery} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unique Key</label>
                <Input
                  required
                  disabled={Boolean(editingDelivery)}
                  value={deliveryForm.key}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, key: e.target.value })}
                  placeholder="e.g. WHATSAPP"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <Input
                  required
                  value={deliveryForm.label}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, label: e.target.value })}
                  placeholder="e.g. WhatsApp Digital Ticket"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price per Branch (₹)</label>
                  <Input
                    type="number"
                    value={deliveryForm.price_per_branch}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, price_per_branch: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={deliveryForm.display_order}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Queue Method Code (Mapping Digit)</label>
                <Input
                  value={deliveryForm.queue_method_code}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, queue_method_code: e.target.value })}
                  placeholder="Matches QueueMethod.method (e.g. 1, 2, 3, 4)"
                  className="mt-1 h-9 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-6 rounded-xl border border-border bg-accent/20 p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryForm.requires_hardware}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, requires_hardware: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Requires Hardware Printer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryForm.is_active}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, is_active: e.target.checked })}
                    className="rounded border-border text-brand"
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeliveryModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Method"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS FOR DURATION TIER CRUD ─────────────────────────────────────── */}
      {isDurationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold">
                {editingDuration ? `Edit Duration Tier` : "Add Duration Tier"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsDurationModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveDuration} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Contract Months</label>
                  <Input
                    type="number"
                    required
                    disabled={Boolean(editingDuration)}
                    value={durationForm.months}
                    onChange={(e) => setDurationForm({ ...durationForm, months: Number(e.target.value) })}
                    placeholder="e.g. 12"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Discount (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={durationForm.discount_percent}
                    onChange={(e) => setDurationForm({ ...durationForm, discount_percent: Number(e.target.value) })}
                    placeholder="e.g. 20"
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Display Order</label>
                  <Input
                    type="number"
                    value={durationForm.display_order}
                    onChange={(e) => setDurationForm({ ...durationForm, display_order: Number(e.target.value) })}
                    className="mt-1 h-9 rounded-lg"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs">
                <input
                  type="checkbox"
                  checked={durationForm.is_active}
                  onChange={(e) => setDurationForm({ ...durationForm, is_active: e.target.checked })}
                  className="rounded border-border text-brand"
                />
                <span>Active (Show discount option to client)</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDurationModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="brand" disabled={saving}>
                  {saving ? "Saving..." : "Save Tier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
