import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Building2,
  MoreVertical,
  Lock,
  QrCode,
  Edit3,
  Power,
  UserPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  MapPin,
  X,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  Bell,
  Users,
  Settings,
  CreditCard,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
  Monitor,
  Printer,
  ListTree,
  Wallet,
  MessageSquare,
  Link2
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { PLANS } from "@/lib/quesole/seed";
import { Button } from "@/components/ui/button";
import { BillingPlanConfigurator } from "@/components/console/billing-plan-configurator";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/console/shell";
import { StatusPill } from "@/components/console/super-admin";
import {
  useQuesole,
  branchesOf,
  branchStats,
  companyStats,
  planOf,
  calculateBranchReadiness,
} from "@/lib/quesole/store";
import type { QueueMethod, Branch } from "@/lib/quesole/types";
import { CountUp, Reveal } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { BranchDesksServicesManager } from "@/components/console/branch-desks-services";

const METHOD_LABEL: Record<QueueMethod, string> = {
  1: "Single QR ticket",
  2: "Multi-desk routing",
  3: "Display boards",
  4: "Remote appointments",
};

const METHOD_DESC: Record<QueueMethod, string> = {
  1: "Single counter walk-in queue with customer QR self-ticketing.",
  2: "Multi-desk service routing to balance customer load across staff.",
  3: "Multi-desk queue system with real-time TV / display board output.",
  4: "Fully remote online appointment booking with automated slots.",
};

import { CompanyOverviewManager } from "@/components/console/company-overview";

export function CompanyAdminView({ view, companyId, setView, branchId }: { view: string; companyId: string; setView?: (view: string) => void; branchId?: string }) {
  const { state, actions } = useQuesole();
  const company = state.companies.find((c) => String(c.id) === String(companyId));
  const branches = branchesOf(state, companyId);
  const stats = companyStats(state, companyId);
  const [newBranch, setNewBranch] = useState({ name: "", city: "" });
  
  const [filterBranchId, setFilterBranchId] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [addUser, setAddUser] = useState<{
    firstName: string; lastName: string;
    email: string; emailAvailable: boolean | null;
    role: "branch_admin" | "operator";
    branchId: string; deskId: string;
    password: string; passwordConfirm: string;
    submitting: boolean;
  }>({
    firstName: "", lastName: "", email: "", emailAvailable: null,
    role: "branch_admin", branchId: branchId || "", deskId: "",
    password: "", passwordConfirm: "", submitting: false,
  });

  const [brandingForm, setBrandingForm] = useState(() => ({
    name: company?.name || "",
    industry: company?.industry || "Healthcare",
    address: company?.address || "",
    city: company?.city || "",
    logoUrl: company?.logoUrl || "",
    tagline: company?.tagline || "",
    supportPhone: company?.supportPhone || company?.contact || "",
    supportEmail: company?.supportEmail || company?.email || "",
    primaryColor: company?.brandColors?.primary || "#6366F1",
    contactEmail: company?.email || "",
    contactPhone: company?.contact || "",
  }));

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Show loading skeleton while company data is still being fetched
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

  if (view === "branch_desks") {
    const targetBranchId = selectedBranchId || branchesOf(state, companyId)[0]?.id || "";
    return (
      <BranchDesksServicesManager
        branchId={targetBranchId}
        onBack={() => setView?.("branches")}
        renderPlanUsageView={(companyId, company) => (
          <CompanyItemizedPlanUsageView companyId={companyId} company={company} />
        )}
      />
    );
  }

  if (view === "branches") {
    return (
      <BranchesManager
        companyId={companyId}
        {...(setView ? { setView } : {})}
        onManageDesks={(branchId) => {
          setSelectedBranchId(branchId);
          setView?.("branch_desks");
        }}
      />
    );
  }

  if (view === "staff") {
    const staff = state.staff.filter((s) => {
      if (s.companyId !== companyId) return false;
      if (branchId && String(s.branchId) !== String(branchId)) return false;
      if (!branchId && filterBranchId && String(s.branchId) !== String(filterBranchId)) return false;
      if (filterRole && s.role !== filterRole) return false;
      return true;
    });

    const selectedBranchDesks = (addUser.branchId || branchId)
      ? state.desks.filter((d) => String(d.branchId) === String(addUser.branchId || branchId))
      : [];

    const checkEmail = async (email: string) => {
      if (!email.includes("@") || email.length < 5) {
        setAddUser((s) => ({ ...s, emailAvailable: null }));
        return;
      }
      try {
        const res = await fetch(
          `http://${window.location.hostname}:8000/api/users/check-email/?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("quesole.access_token")}` } }
        );
        const data = await res.json();
        setAddUser((s) => ({ ...s, emailAvailable: data.available }));
      } catch {
        setAddUser((s) => ({ ...s, emailAvailable: null }));
      }
    };

    return (
      <div className="grid gap-5">
        {/* Header with Filters & Toggle Form Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/20 p-3 rounded-2xl border border-border/40">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Filters:</span>
            {!branchId && (
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Roles</option>
              <option value="branch_admin">Branch Admin</option>
              <option value="operator">Desk Operator</option>
            </select>
          </div>
          <Button
            variant={isFormOpen ? "outline" : "brand"}
            size="sm"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="rounded-xl font-semibold flex items-center gap-1.5 self-end sm:self-auto"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isFormOpen ? "Cancel" : "Add Team Member"}
          </Button>
        </div>

        {/* Add User Form */}
        {isFormOpen && (
          <div className="panel p-6 border border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="mb-4 font-display text-base font-semibold">Add Team Member</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name</label>
                <Input value={addUser.firstName} onChange={(e) => setAddUser((s) => ({ ...s, firstName: e.target.value }))}
                  placeholder="Priya" className="h-10 rounded-xl" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name</label>
                <Input value={addUser.lastName} onChange={(e) => setAddUser((s) => ({ ...s, lastName: e.target.value }))}
                  placeholder="Shah" className="h-10 rounded-xl" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <Input type="email" value={addUser.email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAddUser((s) => ({ ...s, email: v, emailAvailable: null }));
                    const t = setTimeout(() => checkEmail(v), 400);
                    return () => clearTimeout(t);
                  }}
                  placeholder="priya@clinic.com" className="h-10 rounded-xl" />
                {addUser.emailAvailable === true && (
                  <span className="text-xs text-emerald-500">✓ Email available</span>
                )}
                {addUser.emailAvailable === false && (
                  <span className="text-xs text-destructive">✗ Email already registered</span>
                )}
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
                <select value={addUser.role}
                  onChange={(e) => setAddUser((s) => ({ ...s, role: e.target.value as any, deskId: "" }))}
                  className="h-10 rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="branch_admin">Branch Admin</option>
                  <option value="operator">Desk Operator</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Branch</label>
                <select value={addUser.branchId}
                  disabled={!!branchId}
                  onChange={(e) => setAddUser((s) => ({ ...s, branchId: e.target.value, deskId: "" }))}
                  className="h-10 rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-75 disabled:cursor-not-allowed">
                  {branchId ? (
                    <option value={branchId}>
                      {state.branches.find((b) => String(b.id) === String(branchId))?.name ?? "Current Branch"}
                    </option>
                  ) : (
                    <>
                      <option value="">Select Branch</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              {addUser.role === "operator" && (addUser.branchId || branchId) && (
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign Desk (optional)</label>
                  {selectedBranchDesks.length > 0 ? (
                    <select value={addUser.deskId}
                      onChange={(e) => setAddUser((s) => ({ ...s, deskId: e.target.value }))}
                      className="h-10 rounded-xl border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <option value="">No desk (assign later)</option>
                      {selectedBranchDesks.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2">
                      No desks configured yet for this branch — you can assign a desk later from the branch's operator settings.
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <Input type="password" value={addUser.password}
                  onChange={(e) => setAddUser((s) => ({ ...s, password: e.target.value }))}
                  placeholder="Min 10 chars, letter + number" className="h-10 rounded-xl" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                <Input type="password" value={addUser.passwordConfirm}
                  onChange={(e) => setAddUser((s) => ({ ...s, passwordConfirm: e.target.value }))}
                  placeholder="Repeat password" className="h-10 rounded-xl" />
                {addUser.passwordConfirm && addUser.password !== addUser.passwordConfirm && (
                  <span className="text-xs text-destructive">Passwords do not match</span>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                variant="brand"
                disabled={
                  addUser.submitting ||
                  !addUser.firstName || !addUser.email.includes("@") ||
                  !(addUser.branchId || branchId) || !addUser.password || !addUser.passwordConfirm ||
                  addUser.password !== addUser.passwordConfirm ||
                  addUser.emailAvailable === false
                }
                onClick={async () => {
                  setAddUser((s) => ({ ...s, submitting: true }));
                  try {
                    await actions.createStaff({
                      companyId,
                      branchId: addUser.branchId || branchId || "",
                      name: `${addUser.firstName} ${addUser.lastName}`.trim(),
                      email: addUser.email,
                      role: addUser.role,
                      password: addUser.password,
                      passwordConfirm: addUser.passwordConfirm,
                    });
                    const roleName = addUser.role === "branch_admin" ? "Branch Admin" : "Desk Operator";
                    const branchName = branches.find((b) => b.id === (addUser.branchId || branchId))?.name ?? (addUser.branchId || branchId);
                    toast.success(`${addUser.firstName} can now log in as ${roleName} at ${branchName} using the email and password you set.`);
                    setAddUser({
                      firstName: "", lastName: "", email: "", emailAvailable: null,
                      role: "branch_admin", branchId: branchId || "", deskId: "",
                      password: "", passwordConfirm: "", submitting: false,
                    });
                    setIsFormOpen(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to create user.");
                    setAddUser((s) => ({ ...s, submitting: false }));
                  }
                }}
              >
                <Plus className="h-4 w-4" /> Create User
              </Button>
            </div>
          </div>
        )}

        {/* Team Table */}
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const isActive = s.status !== "offline";
                return (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5 capitalize">{s.role.replace("_", " ")}</td>
                    <td className="px-5 py-3.5">
                      {state.branches.find((b) => b.id === s.branchId)?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill status={isActive ? "active" : "suspended"} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await actions.removeStaff(s.id);
                              toast.success(`${s.name} deactivated`);
                            } catch (err: any) {
                              toast.error(err.message || "Failed to deactivate");
                            }
                          }}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                        >
                          {isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground text-sm">
                    No team members yet — create your first member above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }


  if (view === "alerts") {
    const rules = state.alertRules.filter((r) => r.companyId === companyId);
    return (
      <div className="grid gap-3">
        {rules.map((r) => (
          <div key={r.id} className="panel flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.metric.replace(/_/g, " ")} over {r.threshold} · via {r.channel.replace("_", " ")}
              </div>
            </div>
            <Switch checked={r.enabled} onCheckedChange={() => actions.toggleRule(r.id)} />
          </div>
        ))}
      </div>
    );
  }

  if (view === "billing") {
    return <CompanyItemizedPlanUsageView companyId={companyId} company={company} />;
  }

  if (view === "branding") {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Form Controls */}
        <div className="panel p-6 lg:col-span-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Company Branding & Support Details</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize your public identity across QR join pages, tickets, and notifications.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                toast.loading("Saving branding changes...");
                await actions.updateCompanyBranding(companyId, {
                  name: brandingForm.name,
                  tagline: brandingForm.tagline,
                  supportPhone: brandingForm.supportPhone,
                  supportEmail: brandingForm.supportEmail,
                  logoUrl: brandingForm.logoUrl,
                  primaryColor: brandingForm.primaryColor
                });
                toast.dismiss();
                toast.success("Branding details updated successfully!");
              } catch (err: any) {
                toast.dismiss();
                toast.error(err.message || "Failed to save branding details.");
              }
            }}
            className="space-y-4"
          >
            {/* Logo Upload / URL */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company Logo URL / Upload
              </label>
              <div className="flex items-center gap-3">
                {brandingForm.logoUrl ? (
                  <div className="h-12 w-12 rounded-xl border border-border bg-background p-1 overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={brandingForm.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl border border-dashed border-border bg-muted/40 shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
                    LOGO
                  </div>
                )}
                <div className="flex-1 relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error("Image must be smaller than 2MB");
                          e.target.value = "";
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setBrandingForm((f) => ({ ...f, logoUrl: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="h-10 rounded-xl text-xs cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 pt-2"
                  />
                  {brandingForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBrandingForm((f) => ({ ...f, logoUrl: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-destructive hover:underline font-bold bg-background px-1"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">PNG, JPG or SVG image URL (recommended height: 80px).</p>
            </div>

            {/* Company Name */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company Name *
              </label>
              <Input
                value={brandingForm.name}
                onChange={(e) => setBrandingForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Apollo Care Healthcare"
                className="h-10 rounded-xl"
                required
              />
            </div>

            {/* Tagline */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tagline / Slogan (Optional)
              </label>
              <Input
                value={brandingForm.tagline}
                onChange={(e) => setBrandingForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="Quality Healthcare Without the Wait"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            {/* Support Contacts */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Support Phone
                </label>
                <Input
                  value={brandingForm.supportPhone}
                  onChange={(e) => setBrandingForm(f => ({ ...f, supportPhone: e.target.value }))}
                  placeholder="+91 1800 123 4567"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Support Email
                </label>
                <Input
                  type="email"
                  value={brandingForm.supportEmail}
                  onChange={(e) => setBrandingForm(f => ({ ...f, supportEmail: e.target.value }))}
                  placeholder="support@apollocare.in"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Brand Primary Color */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                  className="h-10 w-16 rounded-xl border border-input bg-surface cursor-pointer p-1"
                />
                <Input
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm(f => ({ ...f, primaryColor: e.target.value }))}
                  placeholder="#6366F1"
                  className="h-10 rounded-xl max-w-[120px] text-xs font-mono uppercase"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="brand" className="mt-2 h-10 w-full sm:w-auto rounded-xl px-6">
              Save Branding Details
            </Button>
          </form>
        </div>

        {/* Right Column: Live Side-by-Side Preview Panel */}
        <div className="panel p-6 lg:col-span-6 space-y-6 bg-accent/20">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Live Branding Previews</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time visualization of your identity as customers will see it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Preview A: Public QR Header */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Preview A: Public QR Page Header
              </span>
              <div className="rounded-2xl border border-border bg-background p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  {brandingForm.logoUrl ? (
                    <img src={brandingForm.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                  ) : (
                    <div className="h-6 w-6 rounded-md bg-brand/20 text-brand flex items-center justify-center font-bold text-[10px]">
                      {brandingForm.name.slice(0, 2).toUpperCase() || "QC"}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs leading-tight">{brandingForm.name || "Company Name"}</div>
                    {brandingForm.tagline && (
                      <div className="text-[10px] text-muted-foreground leading-tight">{brandingForm.tagline}</div>
                    )}
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 text-white text-center shadow-sm"
                  style={{ backgroundColor: brandingForm.primaryColor || "#6366F1" }}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">WALK-IN QUEUE</div>
                  <div className="font-bold text-sm mt-0.5">Central Branch</div>
                  <div className="text-[10px] opacity-90">Ring Road, Surat</div>
                </div>

                {(brandingForm.supportPhone || brandingForm.supportEmail) && (
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2">
                    <span>Support: {brandingForm.supportPhone || brandingForm.supportEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview B: Thermal Token Ticket */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Preview B: Printed Thermal Ticket
              </span>
              <div className="rounded-2xl border border-dashed border-border bg-card p-4 shadow-sm text-center space-y-2 font-mono text-xs">
                <div className="font-bold text-sm uppercase">{brandingForm.name || "COMPANY NAME"}</div>
                {brandingForm.tagline && <div className="text-[10px] text-muted-foreground italic">{brandingForm.tagline}</div>}
                <div className="border-b border-border/60 my-1" />
                <div className="text-[10px] text-muted-foreground uppercase">TOKEN NUMBER</div>
                <div className="text-3xl font-black tracking-tight" style={{ color: brandingForm.primaryColor || "#000" }}>
                  A042
                </div>
                <div className="text-[10px] text-muted-foreground">Service: General Consultation</div>
                <div className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString()} · 10:45 AM</div>
                {brandingForm.supportPhone && (
                  <div className="text-[9px] text-muted-foreground border-t border-border/40 pt-1 mt-2">
                    Support: {brandingForm.supportPhone}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <CompanyOverviewManager companyId={companyId} setView={setView ?? (() => {})} />;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background/70 px-2 py-2">
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function Usage({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, cap)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {cap}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", pct > 85 ? "bg-coral" : "bg-brand")}
          style={{ width: `${Math.max(5, pct)}%` }}
        />
      </div>
    </div>
  );
}

function BranchesManager({ companyId, setView, onManageDesks }: { companyId: string; setView?: (v: string) => void; onManageDesks?: (branchId: string) => void }) {
  const { state, session, simulating, refresh, actions } = useQuesole();
  const company = state.companies.find((c) => String(c.id) === String(companyId));
  const branches = branchesOf(state, companyId);
  const plan = planOf(company?.plan ?? "starter");
  const companyAllocations = state.companyAllocations.filter((a) => String(a.companyId) === String(companyId));
  const branchAlloc = companyAllocations.find(a => a.component_key === "branches");
  const purchasedBranchLimit = branchAlloc ? branchAlloc.purchased_qty : (plan?.branches || 1);
  const limitReached = branches.length >= purchasedBranchLimit;

  // Auto-polling (every 10 seconds, respects simulating state)
  useEffect(() => {
    if (!simulating) return;
    const timer = setInterval(() => {
      refresh().catch(console.error);
    }, 10000);
    return () => clearInterval(timer);
  }, [simulating, refresh]);

  // Flash stats on update
  const prevTicketsRef = useRef<number>(state.tickets.length);
  const [flashingBranches, setFlashingBranches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state.tickets.length !== prevTicketsRef.current) {
      prevTicketsRef.current = state.tickets.length;
      const flashMap: Record<string, boolean> = {};
      branches.forEach((b) => { flashMap[b.id] = true; });
      setFlashingBranches(flashMap);
      const timeout = setTimeout(() => setFlashingBranches({}), 1500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [state.tickets, branches]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    city: "",
    address: "",
    openHours: "09:00 – 18:00",
    initialMethod: 1 as QueueMethod,
    geoLat: undefined as number | undefined,
    geoLng: undefined as number | undefined,
    geofenceRadiusMeters: 200,
    geofenceEnabled: true,
    showAdvanced: false,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    city: "",
    address: "",
    openHours: "",
    geoLat: undefined as number | undefined,
    geoLng: undefined as number | undefined,
    geofenceRadiusMeters: 200,
    geofenceEnabled: true,
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deleteBranchTarget, setDeleteBranchTarget] = useState<{ branch: Branch; ticketCount: number } | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [qrBranch, setQrBranch] = useState<Branch | null>(null);
  const [copiedQr, setCopiedQr] = useState(false);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const [lockedMethodModal, setLockedMethodModal] = useState<{ method: QueueMethod; name: string } | null>(null);

  const [inviteBranchId, setInviteBranchId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ firstName: "", lastName: "", email: "", password: "", passwordConfirm: "" });
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const [kebabOpenId, setKebabOpenId] = useState<string | null>(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setKebabOpenId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  if (!company) return null;

  return (
    <div className="grid gap-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Branches</h1>
            <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
              {branches.length} / {purchasedBranchLimit} Active
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {branches.length} branches · Company: <strong className="text-foreground">{company.name}</strong> ({purchasedBranchLimit} Purchased)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {limitReached ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold"
              onClick={() => setView?.("billing")}
            >
              <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
              Buy +1 Branch Add-On (Self-Serve)
            </Button>
          ) : (
            <Button
              variant="brand"
              className="h-10 rounded-xl text-xs font-semibold"
              onClick={() => {
                setAddForm((prev) => ({
                  ...prev,
                  name: "",
                  city: company?.city || "",
                  address: "",
                  openHours: "09:00 – 18:00",
                  initialMethod: (plan?.methods?.[0] || 1) as QueueMethod,
                  showAdvanced: false,
                }));
                setAddError(null);
                setAddModalOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Branch
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Branch Cards or Empty State */}
      {branches.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-lg font-bold">No branches created yet</h3>
          <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
            Add your first branch to start digitizing customer queues, assigning desks, and managing appointments.
          </p>
          <Button
            variant="brand"
            className="mt-6 rounded-xl text-xs font-semibold"
            onClick={() => {
              setAddForm((prev) => ({
                ...prev,
                name: "",
                city: company?.city || "",
                address: "",
                openHours: "09:00 – 18:00",
                initialMethod: (plan?.methods?.[0] || 1) as QueueMethod,
                showAdvanced: false,
              }));
              setAddError(null);
              setAddModalOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add your first branch
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {branches.map((b) => {
            const s = branchStats(state, b.id);
            const ticketsForBranch = state.tickets.filter((t) => t.branchId === b.id);
            const activeAlerts = state.alerts.filter((a) => a.branchId === b.id && !a.read);
            const branchServicesCount = state.services.filter((ser) => String(ser.branchId) === String(b.id)).length;
            const branchStaffCount = state.staff.filter((st) => String(st.branchId) === String(b.id)).length;
            const assignedAdmin = state.staff.find((st) => String(st.branchId) === String(b.id) && st.role === "branch_admin");
            const isInactive = b.status === "inactive";
            const isFlashing = flashingBranches[b.id];

            const serviceAlloc = companyAllocations.find((a) => a.component_key === "services");
            const purchasedServices = serviceAlloc ? serviceAlloc.purchased_qty : 1;

            return (
              <div
                key={b.id}
                onClick={() => onManageDesks ? onManageDesks(b.id) : setView?.("branch_desks")}
                className={cn(
                  "panel p-6 flex flex-col justify-between border transition-all duration-300 relative cursor-pointer group",
                  isInactive ? "opacity-60 bg-muted/20 border-border/50" : "border-border/60 hover:border-brand/60 hover:shadow-lg",
                  isFlashing && "ring-2 ring-primary/60 bg-primary/5"
                )}
              >
                <div>
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {/* Status Indicator Dot */}
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            isInactive ? "bg-muted-foreground/40" : "bg-emerald-500 animate-pulse"
                          )}
                          title={isInactive ? "Branch Inactive" : "Branch Active"}
                        />
                        <h3 className="truncate font-display text-lg font-bold text-foreground group-hover:text-brand transition-colors">
                          {b.name}
                        </h3>
                        {activeAlerts.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive animate-pulse">
                            <ShieldAlert className="mr-1 h-3 w-3" /> {activeAlerts.length} Alert
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {b.address ? `${b.address}, ${b.city}` : `${b.city}, India`}
                      </p>

                      {/* Branch Setup Readiness Bar */}
                      {(() => {
                        const readiness = calculateBranchReadiness(b, state);
                        return (
                          <div className="mt-3 space-y-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-brand" /> Readiness
                              </span>
                              <span
                                className={cn(
                                  "font-bold tabular-nums",
                                  readiness.score === 100 ? "text-emerald-500" : readiness.score >= 60 ? "text-brand" : "text-amber-500"
                                )}
                              >
                                {readiness.score}% {readiness.score === 100 && "✓ Ready"}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  readiness.score === 100 ? "bg-emerald-500" : readiness.score >= 60 ? "bg-brand" : "bg-amber-500"
                                )}
                                style={{ width: `${Math.max(5, readiness.score)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Method Badge */}
                      <span
                        className="rounded-full bg-accent/80 border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-foreground cursor-help"
                        title={METHOD_DESC[b.method]}
                      >
                        Method {b.method}
                      </span>

                      {/* Kebab Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setKebabOpenId(kebabOpenId === b.id ? null : b.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 bg-surface text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Branch Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {kebabOpenId === b.id && (
                          <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                            <button
                              onClick={() => {
                                setKebabOpenId(null);
                                setEditBranch(b);
                                setEditForm({
                                  name: b.name,
                                  city: b.city,
                                  address: b.address,
                                  openHours: b.openHours || "09:00 – 18:00",
                                  geoLat: b.geoLat,
                                  geoLng: b.geoLng,
                                  geofenceRadiusMeters: b.geofenceRadiusMeters ?? 200,
                                  geofenceEnabled: b.geofenceEnabled ?? true,
                                });
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-accent text-foreground transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit Branch Details
                            </button>
                            <button
                              onClick={async () => {
                                setKebabOpenId(null);
                                const newStatus = isInactive ? "active" : "inactive";
                                try {
                                  await actions.updateBranchStatus(b.id, newStatus);
                                  toast.success(`Branch ${b.name} set to ${newStatus}`);
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to update status");
                                }
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-accent text-foreground transition-colors"
                            >
                              <Power className="h-3.5 w-3.5" /> {isInactive ? "Reactivate Branch" : "Deactivate Branch"}
                            </button>
                            <button
                              onClick={() => {
                                setKebabOpenId(null);
                                setQrBranch(b);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-accent text-foreground transition-colors"
                            >
                              <QrCode className="h-3.5 w-3.5" /> View QR Code
                            </button>
                            <div className="my-1 border-t border-border/50" />
                            <button
                              onClick={() => {
                                setKebabOpenId(null);
                                setDeleteBranchTarget({ branch: b, ticketCount: ticketsForBranch.length });
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete Branch
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Stats Row */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div className={cn("rounded-xl bg-accent/40 p-2.5 transition-colors", isFlashing && "bg-brand/10")}>
                      <div className="font-display text-lg font-bold tabular-nums text-foreground">
                        <CountUp value={s.waiting} />
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                        Waiting
                      </div>
                    </div>
                    <div className={cn("rounded-xl bg-accent/40 p-2.5 transition-colors", isFlashing && "bg-brand/10")}>
                      <div className="font-display text-lg font-bold tabular-nums text-foreground">
                        <CountUp value={s.served} />
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                        Served
                      </div>
                    </div>

                    <div className="rounded-xl bg-accent/40 p-2.5 border border-transparent hover:bg-brand/10 hover:border-brand/30 transition-all">
                      <div className="font-display text-lg font-bold tabular-nums text-foreground">
                        {branchServicesCount}
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-brand mt-0.5">
                        Services
                      </div>
                    </div>

                    <div className="rounded-xl bg-accent/40 p-2.5 border border-transparent hover:bg-brand/10 hover:border-brand/30 transition-all">
                      <div className="font-display text-lg font-bold tabular-nums text-foreground">
                        {s.desksOpen}/{s.desksTotal}
                      </div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-brand mt-0.5">
                        Desks
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Phase-1 & Phase-2 Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      {purchasedServices > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onManageDesks ? onManageDesks(b.id) : setView?.("branch_desks")}
                              className="h-8 w-8 p-0 rounded-lg border-brand/40 text-brand hover:bg-brand/10 flex items-center justify-center"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Service Category</TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onManageDesks ? onManageDesks(b.id) : setView?.("branch_desks")}
                            className="h-8 w-8 p-0 rounded-lg border-brand/40 text-brand hover:bg-brand/10 flex items-center justify-center"
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add Operator Desk</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onManageDesks ? onManageDesks(b.id) : setView?.("branch_desks")}
                            className="h-8 w-8 p-0 rounded-lg border-border text-foreground hover:bg-accent flex items-center justify-center relative"
                          >
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                            {branchStaffCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-foreground shadow-sm">
                                {branchStaffCount}
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Manage Branch Staff ({branchStaffCount})</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      size="sm"
                      variant="brand"
                      onClick={() => onManageDesks ? onManageDesks(b.id) : setView?.("branch_desks")}
                      className="ml-auto h-8 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      Open Branch Console <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>


                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. ADD BRANCH MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="font-display text-lg font-bold">Add New Branch</h3>
              <button onClick={() => setAddModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                // Client-side duplicate check
                const isDup = branches.some((b) => b.name.trim().toLowerCase() === addForm.name.trim().toLowerCase());
                if (isDup) {
                  setAddError(`A branch named "${addForm.name.trim()}" already exists in your company.`);
                  return;
                }
                setAddError(null);
                setIsSubmittingAdd(true);

                try {
                  await actions.addBranch({
                    companyId,
                    name: addForm.name.trim(),
                    city: addForm.city.trim(),
                    address: addForm.address.trim() || `${addForm.city}, India`,
                    method: addForm.initialMethod,
                    openHours: addForm.openHours || "09:00 – 18:00",
                    geoLat: addForm.geoLat,
                    geoLng: addForm.geoLng,
                    geofenceRadiusMeters: addForm.geofenceRadiusMeters,
                    geofenceEnabled: addForm.geofenceEnabled,
                  });
                  toast.success(`Branch "${addForm.name}" created successfully!`);
                  setAddModalOpen(false);
                } catch (err: any) {
                  setAddError(err.message || "Failed to create branch");
                } finally {
                  setIsSubmittingAdd(false);
                }
              }}
              className="mt-4 grid gap-4"
            >
              {addError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Branch Name *
                </label>
                <Input
                  value={addForm.name}
                  onChange={(e) => {
                    setAddForm((f) => ({ ...f, name: e.target.value }));
                    if (addError) setAddError(null);
                  }}
                  placeholder="e.g. Surat Central Branch"
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  City *
                </label>
                <Input
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Surat"
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Address
                </label>
                <Input
                  value={addForm.address}
                  onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. Ring Road, Opposite City Center, Surat"
                  className="h-10 rounded-xl"
                />
              </div>

              {/* Location & Geofencing Section */}
              <div className="rounded-xl border border-border/80 bg-accent/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand" /> Branch Location & Geofence
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("Geolocation is not supported by your browser.");
                        return;
                      }
                      toast.loading("Detecting current location...");
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          toast.dismiss();
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          setAddForm((f) => ({ ...f, geoLat: lat, geoLng: lng }));
                          toast.success(`Coordinates set to ${lat}, ${lng}`);
                        },
                        (err) => {
                          toast.dismiss();
                          if (err.message && err.message.toLowerCase().includes("secure origin")) {
                            toast.error("Geolocation requires HTTPS. Please enter coordinates manually.");
                          } else {
                            toast.error(err.message || "Failed to retrieve location.");
                          }
                        },
                        { enableHighAccuracy: true }
                      );
                    }}
                    className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    🎯 Use my current location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={addForm.geoLat ?? ""}
                      onChange={(e) => setAddForm((f) => ({ ...f, geoLat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="21.1702"
                      className="h-9 rounded-lg text-xs"
                      required={addForm.initialMethod !== 4}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={addForm.geoLng ?? ""}
                      onChange={(e) => setAddForm((f) => ({ ...f, geoLng: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="72.8311"
                      className="h-9 rounded-lg text-xs"
                      required={addForm.initialMethod !== 4}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <div>
                    <span className="font-semibold">Geofence Radius:</span>
                    <p className="text-[10px] text-muted-foreground">Customers scanning QR code must be within this distance.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={50}
                      max={5000}
                      value={addForm.geofenceRadiusMeters}
                      onChange={(e) => setAddForm((f) => ({ ...f, geofenceRadiusMeters: parseInt(e.target.value) || 200 }))}
                      className="h-8 w-20 rounded-lg text-xs text-center font-bold"
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">meters</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold">Enable Geofence Gate</span>
                    <p className="text-[10px] text-muted-foreground">Enforces physical presence check for QR queue joins.</p>
                  </div>
                  <Switch
                    checked={addForm.geofenceEnabled}
                    onCheckedChange={(v) => setAddForm((f) => ({ ...f, geofenceEnabled: v }))}
                  />
                </div>
              </div>


              <div className="border-t border-border/40 pt-3">
                <button
                  type="button"
                  onClick={() => setAddForm((f) => ({ ...f, showAdvanced: !f.showAdvanced }))}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {addForm.showAdvanced ? "Hide Operating Hours" : "Set Operating Hours"}
                  {addForm.showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {addForm.showAdvanced && (
                  <div className="mt-3 grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Operating Hours (e.g. 09:00 – 18:00)
                    </label>
                    <Input
                      value={addForm.openHours}
                      onChange={(e) => setAddForm((f) => ({ ...f, openHours: e.target.value }))}
                      placeholder="09:00 – 18:00"
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={isSubmittingAdd || !addForm.name.trim() || !addForm.city.trim()}
                >
                  {isSubmittingAdd ? "Creating..." : "Create Branch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. UPGRADE REQUEST MODAL */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-display text-lg font-bold text-foreground">Branch Limit Reached</h3>
              </div>
              <button onClick={() => setUpgradeModalOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground space-y-2">
              <p>
                Your company is currently on the <strong className="text-foreground">{plan.name} Plan</strong>, which allows up to <strong className="text-foreground">{plan.branches} active branches</strong>.
              </p>
              <p>
                Would you like to request an upgrade to expand your branch capacity? Super Admins will review your request.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="brand"
                disabled={isSubmittingUpgrade}
                onClick={async () => {
                  setIsSubmittingUpgrade(true);
                  try {
                    await actions.requestUpgrade(companyId, "branch", {
                      currentBranches: branches.length,
                      maxAllowed: plan.branches,
                      plan: company.plan
                    });
                    toast.success("Upgrade request sent to Platform Super Admin!");
                    setUpgradeModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to submit upgrade request");
                  } finally {
                    setIsSubmittingUpgrade(false);
                  }
                }}
              >
                {isSubmittingUpgrade ? "Sending Request..." : "Request Upgrade"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT BRANCH MODAL */}
      {editBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="font-display text-lg font-bold">Edit Branch: {editBranch.name}</h3>
              <button onClick={() => setEditBranch(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingEdit(true);
                try {
                  await actions.updateBranchDetails(editBranch.id, {
                    name: editForm.name.trim(),
                    city: editForm.city.trim(),
                    address: editForm.address.trim(),
                    openHours: editForm.openHours.trim(),
                    ...(editForm.geoLat !== undefined ? { geoLat: editForm.geoLat } : {}),
                    ...(editForm.geoLng !== undefined ? { geoLng: editForm.geoLng } : {}),
                    geofenceRadiusMeters: editForm.geofenceRadiusMeters,
                    geofenceEnabled: editForm.geofenceEnabled,
                  });
                  toast.success(`Branch "${editForm.name}" updated successfully!`);
                  setEditBranch(null);
                } catch (err: any) {
                  toast.error(err.message || "Failed to update branch");
                } finally {
                  setIsSubmittingEdit(false);
                }
              }}
              className="mt-4 grid gap-4"
            >
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</label>
                <Input
                  value={editForm.city}
                  onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</label>
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>

              {/* Location & Geofencing Section */}
              <div className="rounded-xl border border-border/80 bg-accent/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand" /> Branch Location & Geofence
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        toast.error("Geolocation is not supported by your browser.");
                        return;
                      }
                      toast.loading("Detecting current location...");
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          toast.dismiss();
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          setEditForm((f) => ({ ...f, geoLat: lat, geoLng: lng }));
                          toast.success(`Coordinates set to ${lat}, ${lng}`);
                        },
                        (err) => {
                          toast.dismiss();
                          if (err.message && err.message.toLowerCase().includes("secure origin")) {
                            toast.error("Geolocation requires HTTPS. Please enter coordinates manually.");
                          } else {
                            toast.error(err.message || "Failed to retrieve location.");
                          }
                        },
                        { enableHighAccuracy: true }
                      );
                    }}
                    className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1"
                  >
                    🎯 Use my current location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.geoLat ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, geoLat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="21.1702"
                      className="h-9 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={editForm.geoLng ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, geoLng: e.target.value ? parseFloat(e.target.value) : undefined }))}
                      placeholder="72.8311"
                      className="h-9 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                  <div>
                    <span className="font-semibold">Geofence Radius:</span>
                    <p className="text-[10px] text-muted-foreground">Allowed distance in meters for QR check-ins.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={50}
                      max={5000}
                      value={editForm.geofenceRadiusMeters}
                      onChange={(e) => setEditForm((f) => ({ ...f, geofenceRadiusMeters: parseInt(e.target.value) || 200 }))}
                      className="h-8 w-20 rounded-lg text-xs text-center font-bold"
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">meters</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold">Enable Geofence Gate</span>
                    <p className="text-[10px] text-muted-foreground">Enforces physical presence check for QR queue joins.</p>
                  </div>
                  <Switch
                    checked={editForm.geofenceEnabled}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, geofenceEnabled: v }))}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating Hours</label>
                <Input
                  value={editForm.openHours}
                  onChange={(e) => setEditForm((f) => ({ ...f, openHours: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditBranch(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. VIEW QR CODE MODAL */}
      {qrBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display text-base font-bold">Branch QR Code</h3>
              <button onClick={() => setQrBranch(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center justify-center bg-white p-4 rounded-2xl border shadow-inner">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/q/${qrBranch.id}`}
                size={180}
              />
              <p className="mt-3 text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                {qrBranch.name}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-xs"
                onClick={() => {
                  const url = `${window.location.origin}/q/${qrBranch.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedQr(true);
                  toast.success("QR Link copied to clipboard!");
                  setTimeout(() => setCopiedQr(false), 2000);
                }}
              >
                {copiedQr ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                {copiedQr ? "Copied!" : "Copy Customer Queue URL"}
              </Button>
              <Button
                variant="brand"
                className="w-full h-10 rounded-xl text-xs"
                onClick={() => window.open(`/q/${qrBranch.id}`, "_blank")}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" /> Open Public Queue Page
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE BRANCH CONFIRMATION MODAL */}
      {deleteBranchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4 text-destructive">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="font-display text-lg font-bold text-foreground">Delete Branch</h3>
            </div>

            {deleteBranchTarget.ticketCount > 0 ? (
              <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-destructive">
                  <strong>Deletion Blocked:</strong> Branch <strong className="underline">{deleteBranchTarget.branch.name}</strong> cannot be deleted because it has <strong>{deleteBranchTarget.ticketCount} historical tickets</strong> associated with it.
                </div>
                <p>
                  To preserve audit records and analytics history, please <strong>Deactivate</strong> this branch instead using the kebab menu.
                </p>
                <div className="mt-6 flex justify-end">
                  <Button variant="outline" onClick={() => setDeleteBranchTarget(null)}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs text-muted-foreground">
                <p>
                  Are you sure you want to permanently delete <strong className="text-foreground">{deleteBranchTarget.branch.name}</strong>?
                </p>
                <p className="text-destructive font-semibold">
                  This action cannot be undone and will remove all desk configurations associated with this branch.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeleteBranchTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isSubmittingDelete}
                    onClick={async () => {
                      setIsSubmittingDelete(true);
                      try {
                        await actions.deleteBranch(deleteBranchTarget.branch.id);
                        toast.success(`Branch ${deleteBranchTarget.branch.name} deleted`);
                        setDeleteBranchTarget(null);
                      } catch (err: any) {
                        toast.error(err.message || "Failed to delete branch");
                      } finally {
                        setIsSubmittingDelete(false);
                      }
                    }}
                  >
                    {isSubmittingDelete ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. LOCKED METHOD POPOVER / MODAL */}
      {lockedMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
              <Lock className="h-6 w-6" />
            </div>

            <h3 className="font-display text-lg font-bold">{lockedMethodModal.name} Locked</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              This queuing method is not included in your company's <strong className="text-foreground">{plan.name} Tier</strong> subscription.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upgrade your package to unlock {lockedMethodModal.name} and advanced operational features.
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => setLockedMethodModal(null)}>
                Close
              </Button>
              <Button
                variant="brand"
                onClick={() => {
                  setLockedMethodModal(null);
                  if (setView) setView("billing");
                }}
              >
                <CreditCard className="mr-1.5 h-4 w-4" /> Go to Billing & Upgrades
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. INVITE ADMIN MODAL */}
      {inviteBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="panel w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <h3 className="font-display text-lg font-bold">Invite Branch Admin</h3>
              <button onClick={() => setInviteBranchId(null)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingInvite(true);
                try {
                  await actions.createStaff({
                    companyId,
                    branchId: inviteBranchId,
                    name: `${inviteForm.firstName} ${inviteForm.lastName}`.trim(),
                    email: inviteForm.email.trim(),
                    role: "branch_admin",
                    password: inviteForm.password,
                    passwordConfirm: inviteForm.passwordConfirm,
                  });
                  toast.success(`Branch Admin invited for ${branches.find((b) => b.id === inviteBranchId)?.name}`);
                  setInviteBranchId(null);
                } catch (err: any) {
                  toast.error(err.message || "Failed to invite Branch Admin");
                } finally {
                  setIsSubmittingInvite(false);
                }
              }}
              className="mt-4 grid gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name</label>
                  <Input
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name</label>
                  <Input
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                  <Input
                    type="password"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                  <Input
                    type="password"
                    value={inviteForm.passwordConfirm}
                    onChange={(e) => setInviteForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                    className="h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3 border-t border-border/60 pt-4">
                <Button type="button" variant="outline" onClick={() => setInviteBranchId(null)}>
                  Cancel
                </Button>
                  <Button type="submit" variant="brand" disabled={isSubmittingInvite}>
                  {isSubmittingInvite ? "Creating Admin..." : "Create Branch Admin"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function CompanyItemizedPlanUsageView({ companyId, company }: { companyId: string; company: any }) {
  const { state, actions } = useQuesole();
  const [branchesSummary, setBranchesSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Inline edit state
  const [inlineEditCardKey, setInlineEditCardKey] = useState<string | null>(null);
  const [inlineAddQty, setInlineAddQty] = useState(1);
  const [inlineSimulateFailure, setInlineSimulateFailure] = useState(false);
  const [isSubmittingInline, setIsSubmittingInline] = useState(false);
  
  // Collapsible list of branches in summary panel
  const [summaryBranchesOpen, setSummaryBranchesOpen] = useState(true);

  const companyAllocations = state.companyAllocations.filter((a) => String(a.companyId) === String(companyId));
  const companyPurchases = state.planPurchases.filter((p) => String(p.companyId) === String(companyId));

  const hasLegacyAllocations = companyAllocations.some(
    (a) => a.branch_id === null && a.component_key !== "branches"
  );

  const fetchBranchesSummary = async () => {
    try {
      const res = await fetch(
        `http://${window.location.hostname}:8000/api/billing/company/branches-summary/`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("quesole.access_token")}` } }
      );
      if (!res.ok) {
        throw new Error("Failed to load branches plan details");
      }
      const data = await res.json();
      setBranchesSummary(data);
      
      // Auto-select tab if not set
      if (!activeTab) {
        if (hasLegacyAllocations) {
          setActiveTab("legacy");
        } else if (data.length > 0) {
          setActiveTab(String(data[0].id));
        }
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch branch billing summary.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchesSummary();
  }, [companyId, state.companyAllocations]);

  const handleTabChange = (tabId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setInlineEditCardKey(null);
      setIsTransitioning(false);
    }, 150);
  };

  const handleInlineConfirm = async (key: string, rate: number) => {
    setIsSubmittingInline(true);
    try {
      let componentKey = key;
      if (key === "queue_kiosk") componentKey = "PRINTED_TOKEN";
      else if (key === "queue_sms") componentKey = "SMS";
      else if (key === "queue_whatsapp") componentKey = "WHATSAPP";

      await actions.buyAddOn({
        componentKey,
        quantity: inlineAddQty,
        simulateFailure: inlineSimulateFailure,
        branch_id: activeTab === "legacy" ? null : Number(activeTab)
      });
      toast.success(
        inlineAddQty === 0
          ? "Feature successfully disabled."
          : `Successfully updated addon configurations!`
      );
      setInlineEditCardKey(null);
      await fetchBranchesSummary();
    } catch (err: any) {
      toast.error(err.message || "Purchase failed. Please try again.");
    } finally {
      setIsSubmittingInline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-brand" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading billing details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-coral mx-auto" />
        <h3 className="font-bold text-lg">Failed to Load Billing</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="brand" onClick={() => { setLoading(true); setError(null); fetchBranchesSummary(); }}>
          Retry Loading
        </Button>
      </div>
    );
  }

  if (isUpgrading) {
    // Upgrades flow trigger configurator modal
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold">Upgrade Subscription Plan</h2>
            <p className="text-xs text-muted-foreground">Modify branches, operator seats, services, or kiosks.</p>
          </div>
          <Button variant="outline" onClick={() => setIsUpgrading(false)}>
            Back to Usage Overview
          </Button>
        </div>
        <BillingPlanConfigurator
          mode="upgrade"
          initialData={{
            solution: company?.solution || "ONSITE_ONLINE",
            branchesCount: branchesSummary.length,
            durationMonths: company?.subscription?.duration_months || 1,
            branches: branchesSummary.map((b) => {
              const opAlloc = b.allocations.operator_screens;
              const svcAlloc = b.allocations.services;
              const kioskAlloc = b.allocations.paper_roll_screens;
              const qrAlloc = b.allocations.printed_qr;
              
              const isSvcBased = b.mode === "SERVICE_BASED";

              return {
                name: b.name,
                mode: b.mode,
                serviceQty: isSvcBased ? (svcAlloc?.limit || 0) : 0,
                operatorQty: opAlloc?.limit || 0,
                kioskQty: kioskAlloc?.limit || 0,
                tokenDeliverySelections: b.token_delivery || ["SCREEN_ONLY"],
                addons: {
                  operator_screens: 0,
                  paper_roll_screens: 0,
                  services: 0,
                  printed_qr: qrAlloc?.limit || 0
                }
              };
            })
          }}
          onSubmit={async (upgradeData: any) => {
            try {
              const res = await actions.checkoutUpgrade({
                branches: upgradeData.branches,
                durationMonths: upgradeData.durationMonths,
                quoteId: upgradeData.quoteId,
                simulateFailure: upgradeData.simulateFailure
              });

              if (res.status === "approval_required") {
                toast.success(res.message);
              } else {
                toast.success("Subscription upgraded and payment completed successfully!");
              }
              setIsUpgrading(false);
              setLoading(true);
              fetchBranchesSummary();
            } catch (err: any) {
              toast.error(err.message || "Failed to submit upgrade");
            }
          }}
          onCancel={() => setIsUpgrading(false)}
        />
      </div>
    );
  }

  // Active branch context
  const activeBranch = branchesSummary.find((b) => String(b.id) === activeTab);
  
  // Calculate total monthly contract cost
  let totalContractCost = 0;
  
  // Branch-specific totals
  const branchesCostList = branchesSummary.map((b) => {
    let cost = 0;
    Object.keys(b.allocations).forEach((k) => {
      const alloc = b.allocations[k];
      if (alloc && alloc.rate > 0 && alloc.limit > 0) {
        if (alloc.pricing_type === "FLAT") {
          cost += alloc.rate;
        } else {
          cost += alloc.rate * alloc.limit;
        }
      }
    });
    return { name: b.name, cost };
  });

  totalContractCost = branchesCostList.reduce((acc, item) => acc + item.cost, 0);

  // Add company-wide allocations (like branches component count)
  const branchesAllocObj = companyAllocations.find((a) => a.component_key === "branches");
  if (branchesAllocObj) {
    totalContractCost += branchesAllocObj.purchased_qty * branchesAllocObj.unit_price_at_purchase;
  }

  // Apply duration discounts
  const subMonths = company?.subscription?.duration_months || 1;
  const activeDurationTier = state.durationTiers.find((d) => d.months === subMonths);
  const discountPercent = activeDurationTier ? activeDurationTier.discount_percent : 0;
  const discountedMonthlyTotal = totalContractCost * (1 - discountPercent / 100);

  // Format date
  const formatRenewalDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* 2/3 Width - Content Panel */}
      <div className="flex-1 w-full space-y-6">
        
        {/* Header Panel */}
        <div className="panel p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Subscription Model
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Itemized À-La-Carte Plan
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Custom allocations tailored for {company?.name}. Manage components and purchase instant add-ons.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(true)}>
              View Billing History ({companyPurchases.length})
            </Button>
            <Button variant="brand" onClick={() => setIsUpgrading(true)}>
              Upgrade Subscription Plan
            </Button>
          </div>
        </div>

        {/* Branch Tabs selection */}
        <div className="flex border-b border-border overflow-x-auto scrollbar-none pb-0.5 gap-2">
          {hasLegacyAllocations && (
            <button
              onClick={() => handleTabChange("legacy")}
              className={cn(
                "px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                activeTab === "legacy"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Company-Wide (Legacy Pooled)
            </button>
          )}
          {branchesSummary.map((br) => (
            <button
              key={br.id}
              onClick={() => handleTabChange(String(br.id))}
              className={cn(
                "px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                activeTab === String(br.id)
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {br.name}
            </button>
          ))}
        </div>

        {/* Tab content wrapper with smooth cross-fade */}
        <div className={cn("transition-opacity duration-150", isTransitioning ? "opacity-0" : "opacity-100")}>
          
          {/* Legacy Information Banner */}
          {activeTab === "legacy" && (
            <div className="panel bg-brand/5 border border-brand/20 p-4 rounded-xl flex gap-3 items-start mb-6">
              <AlertCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-brand">Legacy Pooled Account</h4>
                <p className="text-xs text-muted-foreground">
                  Your account is on a legacy plan. Allocations are company-wide and shared across all branches. Upgrade to the new branch-level pricing to distribute limits per branch.
                </p>
              </div>
            </div>
          )}

          {/* Sectioned Cards Layout */}
          {(() => {
            const baseComponents = state.planComponents
              .filter((c) => c.key !== "branches" && c.key !== "whatsapp_integration");

            const smsMethod = state.tokenDeliveryMethods.find(m => m.key === "SMS");
            const whatsappMethod = state.tokenDeliveryMethods.find(m => m.key === "WHATSAPP");
            const smsPrice = smsMethod ? Number(smsMethod.price_per_branch) : 490;
            const whatsappPrice = whatsappMethod ? Number(whatsappMethod.price_per_branch) : 790;

            // Improved descriptions for clarity
            const descriptionOverrides: Record<string, string> = {
              paper_roll_screens: "Physical walk-in kiosk hardware terminals purchased for on-site customer registration.",
              printed_qr: "Countable physical display posters/standees purchased for QR self-ticketing at the branch.",
              operator_screens: "Operator desk seats for staff to manage queue calls and serve customers.",
              services: "Configurable service lines that customers can join when checking in at this branch.",
              queue_qr: "Free digital queue method — customers scan any QR code (standee, screen, or shared link) to check in.",
              queue_kiosk: "Printed token queue method — issues thermal paper tickets from a physical kiosk terminal.",
              queue_sms: "Sends digital queue tokens directly to the customer's phone via SMS text message.",
              queue_whatsapp: "Sends digital queue tokens directly to the customer via WhatsApp chat message.",
              online_module: "Enables online appointment booking and remote queue joining for this branch.",
            };

            const virtualComponents = [
              {
                id: "virtual-qr", key: "queue_qr", label: "QR Scanning Token (Free)",
                description: descriptionOverrides["queue_qr"],
                unit_label: "QR", default_included_qty: 1, price_per_unit: 0,
                is_toggle: true, pricing_type: "TOGGLE_FREE", icon_key: "qr-code", max_qty_per_branch: 1,
              },
              {
                id: "virtual-kiosk", key: "queue_kiosk", label: "Kiosk (Printed Token)",
                description: descriptionOverrides["queue_kiosk"],
                unit_label: "Kiosk", default_included_qty: 0, price_per_unit: 0,
                is_toggle: true, pricing_type: "TOGGLE_FREE", icon_key: "printer", max_qty_per_branch: 1,
              },
              {
                id: "virtual-sms", key: "queue_sms", label: "KOT — SMS Delivery",
                description: descriptionOverrides["queue_sms"],
                unit_label: "SMS", default_included_qty: 0, price_per_unit: smsPrice,
                is_toggle: true, pricing_type: "TOGGLE_PAID", icon_key: "message-square", max_qty_per_branch: 1,
              },
              {
                id: "virtual-whatsapp", key: "queue_whatsapp", label: "KOT — WhatsApp Delivery",
                description: descriptionOverrides["queue_whatsapp"],
                unit_label: "WhatsApp", default_included_qty: 0, price_per_unit: whatsappPrice,
                is_toggle: true, pricing_type: "TOGGLE_PAID", icon_key: "message-circle", max_qty_per_branch: 1,
              }
            ];

            const allCards = activeTab === "legacy" ? baseComponents : [...baseComponents, ...virtualComponents];

            // Section definitions
            const capacityKeys = ["operator_screens", "services", "paper_roll_screens", "printed_qr"];
            const queueKeys = ["queue_qr", "queue_kiosk", "queue_sms", "queue_whatsapp"];
            const addonKeys = ["online_module", "sms_pack", "custom_domain", "advanced_analytics", "api_integration"];

            const capacityCards = allCards.filter(c => capacityKeys.includes(c.key));
            const queueCards = allCards.filter(c => queueKeys.includes(c.key));
            const addonCards = allCards.filter(c => !capacityKeys.includes(c.key) && !queueKeys.includes(c.key));

            // Card data resolver
            const resolveCard = (c: any) => {
              const key = c.key;
              let used = 0, limit = 0, rate = c.price_per_unit, pricingType = c.pricing_type;
              const isVirtualQueueOption = queueKeys.includes(key);
              const desc = descriptionOverrides[key] || c.description;

              if (isVirtualQueueOption) {
                if (activeBranch) {
                  const td = activeBranch.token_delivery || [];
                  if (key === "queue_qr") limit = 1;
                  else if (key === "queue_kiosk") limit = td.includes("PRINTED_TOKEN") ? 1 : 0;
                  else if (key === "queue_sms") limit = td.includes("SMS") ? 1 : 0;
                  else if (key === "queue_whatsapp") limit = td.includes("WHATSAPP") ? 1 : 0;
                } else { limit = c.default_included_qty; }
                used = 0;
              } else if (activeTab === "legacy") {
                const alloc = companyAllocations.find((a) => a.component_key === key && a.branch_id === null);
                limit = alloc ? alloc.purchased_qty : c.default_included_qty;
                rate = alloc ? alloc.unit_price_at_purchase : c.price_per_unit;
                if (key === "operator_screens") used = state.desks.filter((d) => state.branches.some((b) => String(b.companyId) === String(companyId)) && d.isActive).length;
                else if (key === "services") used = state.services.length;
                else if (key === "paper_roll_screens") used = state.desks.filter((d) => state.branches.some((b) => String(b.companyId) === String(companyId)) && (d as any).layout === "kiosk").length;
              } else if (activeBranch) {
                const alloc = activeBranch.allocations[key];
                if (alloc) { used = alloc.used; limit = alloc.limit; rate = alloc.rate; pricingType = alloc.pricing_type; }
                if (key === "services" && activeBranch.mode === "NON_SERVICE_BASED") return null;
              }

              const isToggle = c.is_toggle || pricingType === "FLAT" || pricingType === "TOGGLE_FREE" || pricingType === "TOGGLE_PAID";
              const isLimitReached = !isToggle && used >= limit && limit > 0;
              const pct = isToggle ? (limit > 0 ? 100 : 0) : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
              const Icon = (({ operator_screens: Monitor, services: ListTree, paper_roll_screens: Printer, printed_qr: QrCode, online_module: Sparkles, queue_qr: QrCode, queue_kiosk: Printer, queue_sms: MessageSquare, queue_whatsapp: Sparkles } as Record<string, any>)[key]) || Wallet;
              const maxAllowed = c.max_qty_per_branch || 1;
              const kioskScreensLimit = activeBranch?.allocations?.paper_roll_screens?.limit || 0;
              const isEditingInline = inlineEditCardKey === key;

              return (
                <div
                  key={c.id}
                  className="panel relative overflow-hidden bg-gradient-to-br from-background to-accent/10 border border-border/60 p-6 flex flex-col justify-between min-h-[300px] group hover:-translate-y-1 hover:shadow-xl hover:border-brand/30 transition-all duration-300 rounded-2xl"
                >
                  <div className={cn(
                    "absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r transition-all duration-500",
                    isToggle ? (limit > 0 ? "from-emerald to-emerald/30" : "from-muted to-muted/20")
                    : pct >= 100 ? "from-coral to-coral/30" : pct >= 80 ? "from-amber to-amber/30" : "from-brand to-brand/30"
                  )} />

                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand shadow-inner group-hover:scale-105 group-hover:bg-brand group-hover:text-white transition-all duration-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-[16px] leading-tight text-foreground pr-4">{c.label}</h3>
                        {isLimitReached && (
                          <span className="mt-1.5 inline-block rounded-md bg-coral/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-coral border border-coral/20">
                            Limit Reached
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>

                    {/* Dependency badge for Kiosk (Printed Token) */}
                    {key === "queue_kiosk" && (
                      <div className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold border transition-all",
                        kioskScreensLimit > 0
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-coral/5 border-coral/20 text-coral"
                      )}>
                        <Link2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Requires: Base Kiosk Screens — {kioskScreensLimit > 0 ? "Allocated ✓" : "Missing ✗"}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      {isToggle ? (
                        <div className="space-y-2 bg-background/50 rounded-lg p-3 border border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</span>
                            <span className={cn(
                              "rounded-full px-3 py-1 text-xs font-bold shadow-sm border",
                              limit > 0 ? "bg-emerald/10 text-emerald border-emerald/20" : "bg-muted border-border/50 text-muted-foreground"
                            )}>
                              {limit > 0 ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground text-right pt-1 border-t border-border/30 mt-2">
                            Allocation: {limit} of {maxAllowed} max allowed
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 bg-background/50 rounded-lg p-3 border border-border/40">
                          <div className="flex items-end justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage</span>
                            <div className="text-right leading-none">
                              <span className="font-display text-xl font-bold">{used}</span>
                              <span className="text-muted-foreground text-xs font-semibold"> / {limit} used</span>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40 shadow-inner">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700 relative",
                                pct >= 100 ? "bg-coral shadow-[0_0_8px_rgba(251,113,133,0.5)]" : pct >= 80 ? "bg-amber shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "bg-brand shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                              )}
                              style={{ width: `${Math.max(3, pct)}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground text-right pt-1">
                            Allocation: {limit} of {maxAllowed} max allowed
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditingInline ? (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
                      {!isToggle && (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-2 py-1.5">
                          <button
                            disabled={inlineAddQty <= 1}
                            onClick={() => setInlineAddQty((q) => Math.max(1, q - 1))}
                            className="h-7 w-7 flex items-center justify-center rounded border border-border bg-background font-bold text-sm disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="font-bold text-sm tabular-nums">{inlineAddQty} units</span>
                          <button
                            onClick={() => setInlineAddQty((q) => q + 1)}
                            className="h-7 w-7 flex items-center justify-center rounded border border-border bg-background font-bold text-sm"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {import.meta.env.DEV && (
                        <div className="flex items-center justify-between rounded bg-coral/5 border border-coral/20 px-2 py-1.5 text-[11px]">
                          <span className="text-coral">Simulate Failure</span>
                          <input
                            type="checkbox"
                            checked={inlineSimulateFailure}
                            onChange={(e) => setInlineSimulateFailure(e.target.checked)}
                            className="rounded border-coral text-coral focus:ring-coral h-3.5 w-3.5"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs font-semibold bg-accent/30 p-2 rounded">
                        <span className="text-muted-foreground">
                          {inlineAddQty === 0 ? "Action:" : "Monthly Addition:"}
                        </span>
                        <span className={cn("font-bold", inlineAddQty === 0 ? "text-coral" : "text-emerald")}>
                          {inlineAddQty === 0 ? "Disable and remove integration" : `₹${((isToggle ? rate : rate * inlineAddQty) || 0).toLocaleString("en-IN")}/mo`}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 py-1 font-bold text-xs" onClick={() => setInlineEditCardKey(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="brand" className="flex-1 py-1 font-bold text-xs" disabled={isSubmittingInline} onClick={() => handleInlineConfirm(key, rate)}>
                          {isSubmittingInline ? "Processing..." : "Authorize"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 flex flex-col gap-3 border-t border-border/40">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Rate</span>
                        <span className="text-sm font-bold text-foreground">
                          {rate > 0 ? (
                            <>
                              ₹{rate.toLocaleString("en-IN")}<span className="text-[11px] text-muted-foreground font-semibold"> / mo</span>
                            </>
                          ) : "Included Free"}
                        </span>
                      </div>
                      {key === "queue_qr" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full font-bold shadow-sm border-border bg-background opacity-75 cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-4 w-4 text-emerald" /> Included Free
                        </Button>
                      ) : isToggle ? (
                        limit > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setInlineAddQty(0);
                              setInlineSimulateFailure(false);
                              setInlineEditCardKey(key);
                            }}
                            className="w-full font-bold shadow-sm border-coral/30 text-coral bg-coral/5 hover:bg-coral hover:text-white flex items-center justify-center gap-1.5 transition-all duration-300"
                          >
                            <Power className="h-4 w-4" /> Disable
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="brand"
                            onClick={() => {
                              setInlineAddQty(1);
                              setInlineSimulateFailure(false);
                              setInlineEditCardKey(key);
                            }}
                            className="w-full font-bold shadow-sm transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 flex items-center justify-center gap-1.5"
                          >
                            <Plus className="h-4 w-4" /> Enable
                          </Button>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant={isLimitReached ? "brand" : "outline"}
                          onClick={() => {
                            setInlineAddQty(1);
                            setInlineSimulateFailure(false);
                            setInlineEditCardKey(key);
                          }}
                          className={cn(
                            "w-full font-bold shadow-sm transition-all duration-300",
                            isLimitReached ? "" : "border-border/80 group-hover:border-brand/40 group-hover:bg-brand/5 group-hover:text-brand"
                          )}
                        >
                          <Plus className="h-4 w-4 mr-1.5" /> Add More {c.unit_label}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            // Section renderer
            const renderSection = (title: string, subtitle: string, cards: any[], bgClass: string) => {
              const rendered = cards.map(resolveCard).filter(Boolean);
              if (rendered.length === 0) return null;
              return (
                <div className={cn("rounded-2xl border border-border/40 p-5 space-y-5", bgClass)}>
                  <div className="pb-1 border-b border-border/30">
                    <h3 className="font-display text-sm font-black uppercase tracking-widest text-foreground/80">{title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {rendered}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-8">
                {renderSection(
                  "Capacity & Hardware",
                  "Countable physical devices and seating allocations for this branch.",
                  capacityCards,
                  "bg-gradient-to-br from-background to-blue-500/[0.03]"
                )}
                {activeTab !== "legacy" && renderSection(
                  "Queue & Token Delivery",
                  "Digital and physical ticketing delivery channels — how customers receive their queue token.",
                  queueCards,
                  "bg-gradient-to-br from-background to-emerald-500/[0.03]"
                )}
                {renderSection(
                  "Add-on Features",
                  "Branch-level software modules, integrations, and premium capabilities.",
                  addonCards,
                  "bg-gradient-to-br from-background to-violet-500/[0.03]"
                )}
              </div>
            );
          })() }
        </div>
      </div>

      {/* 1/3 Width Sticky Right Panel */}
      <div className="w-full lg:w-80 shrink-0 sticky top-20 space-y-6">
        <div className="panel p-6 bg-gradient-to-br from-background to-accent/10 border border-border/60 rounded-2xl space-y-6 shadow-md">
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Subscription Overview</h3>
            <p className="text-xs text-muted-foreground">Running company billing breakdown</p>
          </div>

          <div className="space-y-3 text-xs border-b border-border/40 pb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solution Type</span>
              <span className="font-bold uppercase tracking-wider text-brand">{company?.solution ? company.solution.replace("_", " & ") : "ONSITE"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Branches</span>
              <span className="font-bold">{branchesSummary.length} active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration Tier</span>
              <span className="font-bold">{subMonths} Month{subMonths > 1 ? "s" : ""}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-emerald">
                <span>Tier Discount</span>
                <span className="font-bold">-{discountPercent}% applied</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renewal Date</span>
              <span className="font-bold text-foreground">
                {formatRenewalDate(company?.subscription?.renewal_date)}
              </span>
            </div>
          </div>

          {/* Collapsible list of branches details */}
          <div className="space-y-2 border-b border-border/40 pb-4">
            <button
              onClick={() => setSummaryBranchesOpen(!summaryBranchesOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <span>Per-Branch Breakdown</span>
              {summaryBranchesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {summaryBranchesOpen && (
              <div className="space-y-1.5 pt-1 overflow-y-auto max-h-48 scrollbar-thin">
                {branchesCostList.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs px-1">
                    <span className="text-muted-foreground truncate max-w-[150px]">{item.name}</span>
                    <span className="font-medium text-foreground">₹{item.cost.toLocaleString("en-IN")}/mo</span>
                  </div>
                ))}
                {branchesCostList.length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground py-2">No active branches found.</p>
                )}
              </div>
            )}
          </div>

          {/* Final Monthly Sum */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Monthly Cost</span>
              <div className="text-right">
                <span className="font-display text-2xl font-bold text-brand">
                  ₹{Math.round(discountedMonthlyTotal).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold"> / mo</span>
              </div>
            </div>
            {discountPercent > 0 && (
              <p className="text-[10px] text-right text-muted-foreground italic leading-none">
                Original total ₹{totalContractCost.toLocaleString("en-IN")}/mo
              </p>
            )}
          </div>

          <Button variant="brand" className="w-full font-bold shadow-sm" onClick={() => setIsUpgrading(true)}>
            Modify Allocations Wizard
          </Button>
        </div>
      </div>

      {/* Billing Transaction History Modal popup */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Company Billing Transaction History</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold text-lg">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 scrollbar-thin">
              {companyPurchases.map((p) => (
                <div key={p.id} className="rounded-xl border border-border/80 bg-accent/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="capitalize">{p.type.replace("_", " ")}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      p.payment_status === "paid" ? "bg-emerald/15 text-emerald" : "bg-coral/15 text-coral"
                    )}>
                      {p.payment_status}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex justify-between">
                    <span>Ref: {p.payment_reference || "N/A"}</span>
                    <span>Total: ₹{p.total_amount.toLocaleString("en-IN")}</span>
                  </div>
                  {p.line_items && p.line_items.length > 0 && (
                    <div className="border-t border-border/40 pt-2 space-y-1">
                      {p.line_items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{item.component_label || item.component_key} × {item.quantity}</span>
                          <span>₹{(item.subtotal || 0).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {companyPurchases.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No billing history recorded yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
