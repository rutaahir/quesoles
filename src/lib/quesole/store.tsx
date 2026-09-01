import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PLANS,
  alertRules as seedRules,
  auditLog as seedAudit,
  branches as seedBranches,
  companies as seedCompanies,
  desks as seedDesks,
  nextId,
  pickCustomer,
  seedAlerts,
  seedAppointments,
  seedTickets,
  services as seedServices,
  staff as seedStaff,
  upgradeRequests as seedUpgrades,
} from "./seed";
import type {
  AlertEvent,
  AlertRule,
  Appointment,
  AuditEntry,
  Branch,
  Company,
  CompanyPlanAllocation,
  Desk,
  DeskServiceMapping,
  PlanComponent,
  PlanPurchase,
  PlanTier,
  QueueMethod,
  Role,
  Service,
  Session,
  Staff,
  Ticket,
  UpgradeRequest,
  UserServiceMapping,
  QueueSolutionType,
  TokenDeliveryMethod,
  SubscriptionDurationTier,
  PriceChangeLog,
  Kiosk,
} from "./types";

const API_BASE = typeof window !== "undefined" 
  ? `http://${window.location.hostname}:8000` 
  : "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const accessToken = localStorage.getItem("quesole.access_token");
  if (accessToken && !path.startsWith("/api/public/")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  
  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401 && path !== "/api/auth/login/") {
    const refreshToken = localStorage.getItem("quesole.refresh_token");
    if (refreshToken) {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        localStorage.setItem("quesole.access_token", refreshData.access);
        headers.set("Authorization", `Bearer ${refreshData.access}`);
        response = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      } else {
        localStorage.removeItem("quesole.session");
        localStorage.removeItem("quesole.access_token");
        localStorage.removeItem("quesole.refresh_token");
        window.location.href = "/login";
        throw new Error("Session expired. Please sign in again.");
      }
    }
  }
  
  if (!response.ok) {
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const errorData = isJson ? await response.json().catch(() => ({})) : {};
    let msg = errorData.detail || errorData.error;
    if (!msg && typeof errorData === "object" && Object.keys(errorData).length > 0) {
      msg = Object.entries(errorData)
        .map(([k, v]) => {
          if (Array.isArray(v)) {
            return v.map(item => typeof item === "string" ? item : String(item)).join(", ");
          }
          return typeof v === "string" ? v : String(v);
        })
        .join("; ");
    }
    if (!msg && !isJson) {
      msg = `Server Error (${response.status})`;
    }
    throw new Error(msg || `HTTP error status: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export interface QuesoleState {
  companies: Company[];
  branches: Branch[];
  desks: Desk[];
  services: Service[];
  staff: Staff[];
  tickets: Ticket[];
  appointments: Appointment[];
  alertRules: AlertRule[];
  alerts: AlertEvent[];
  audit: AuditEntry[];
  upgrades: UpgradeRequest[];
  planComponents: PlanComponent[];
  companyAllocations: CompanyPlanAllocation[];
  planPurchases: PlanPurchase[];
  deskServices: DeskServiceMapping[];
  userServices: UserServiceMapping[];
  solutionTypes: QueueSolutionType[];
  tokenDeliveryMethods: TokenDeliveryMethod[];
  durationTiers: SubscriptionDurationTier[];
  priceLogs: PriceChangeLog[];
  kiosks: Kiosk[];
}

interface Ctx {
  state: QuesoleState;
  session: Session | null;
  simulating: boolean;
  tick: number;
  signIn: (email: string, password: string) => Promise<Session>;
  signOut: () => Promise<void>;
  setSession: (patch: Partial<Session>) => void;
  setSimulating: (on: boolean) => void;
  refresh: () => Promise<void>;
  actions: {
    joinQueue: (input: { branchId: string; serviceId: string; customerName: string; contact: string; customerEmail?: string; channel?: "qr" | "kiosk" | "remote" | "onscreen" | "sms" | "whatsapp"; note?: string }) => Promise<string>;
    callNext: (deskId: string) => Promise<any>;
    setTicketStatus: (ticketId: string, status: Ticket["status"]) => Promise<void>;
    transferTicket: (ticketId: string, deskId: string) => Promise<void>;
    createDesk: (input: { branchId: string; name: string }) => Promise<string>;
    updateDesk: (deskId: string, input: { name?: string; label?: string; isActive?: boolean; serviceIds?: string[]; assignedStaffId?: string | null; isOnlineBookingDesk?: boolean }) => Promise<void>;
    toggleDeskStatus: (deskId: string, isActive: boolean) => Promise<void>;
    deleteDesk: (deskId: string) => Promise<void>;
    createService: (input: { branchId: string; name: string; prefix?: string; estServiceMinutes?: number }) => Promise<string>;
    toggleServiceStatus: (serviceId: string, isActive: boolean) => Promise<void>;
    updateDeskServices: (deskId: string, serviceIds: string[]) => Promise<void>;
    updateUserServices: (userId: string, serviceIds: string[]) => Promise<void>;
    createBranchStaff: (input: {
      branchId: string;
      email: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role: "branch_admin" | "desk_staff";
      serviceIds?: string[];
    }) => Promise<any>;
    updateBranchStaff: (userId: string, input: {
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: "branch_admin" | "desk_staff";
      deskId?: string | null;
      serviceIds?: string[];
    }) => Promise<any>;
    approveCompany: (companyId: string) => Promise<void>;
    suspendCompany: (companyId: string) => Promise<void>;
    resolveUpgrade: (id: string, status: "approved" | "declined") => Promise<void>;
    setDeskStatus: (deskId: string, status: Desk["status"]) => Promise<void>;
    setBranchMethod: (branchId: string, method: QueueMethod) => Promise<void>;
    registerCompany: (input: { name: string; industry: string; city: string; plan: Company["plan"]; contact: string; email: string; branchName: string; password?: string; phone?: string }) => Promise<{ companyId: string; branchId: string }>;
    addBranch: (input: Omit<Branch, "id" | "deskIds" | "serviceIds">) => Promise<string>;
    updateBranchDetails: (branchId: string, input: { 
      name: string; 
      city: string; 
      address?: string; 
      openHours?: string; 
      geoLat?: number; 
      geoLng?: number; 
      geofenceRadiusMeters?: number; 
      geofenceEnabled?: boolean;
      kioskPasswordHash?: string | null;
      kioskIdleTimeoutSeconds?: number;
    }) => Promise<void>;
    updateBranchStatus: (branchId: string, status: "active" | "inactive") => Promise<void>;
    deleteBranch: (branchId: string) => Promise<void>;
    requestUpgrade: (companyId: string, type: "branch" | "plan", details?: any) => Promise<void>;
    addDesk: (branchId: string, label: string, serviceIds: string[]) => Promise<void>;
    addService: (branchId: string, name: string, prefix: string, avgMinutes: number) => Promise<void>;
    inviteStaff: (input: Omit<Staff, "id" | "servedToday" | "avgHandleMin" | "status">) => Promise<void>;
    createStaff: (input: { companyId: string; branchId: string; name: string; email: string; role: string; password: string; passwordConfirm: string }) => Promise<void>;
    removeStaff: (id: string) => Promise<void>;
    issueManualTicket: (input: { branchId: string; name?: string; phone?: string; serviceId?: string; deskId?: string }) => Promise<any>;
    bookAppointment: (input: { branchId: string; serviceId: string; customerName: string; contact: string; date: string; slot: string }) => Promise<string>;
    cancelAppointment: (appointmentId: string) => Promise<void>;
    readAlert: (alertId: string) => Promise<void>;
    readAllAlerts: () => Promise<void>;
    toggleRule: (ruleId: string) => Promise<void>;
    checkoutSubscription: (planId: string, billingCycle: "monthly" | "yearly") => Promise<void>;
    updateCompanyBranding: (companyId: string, input: any) => Promise<void>;
    createPlanComponent: (input: Omit<PlanComponent, "id">) => Promise<void>;
    updatePlanComponent: (id: string, patch: Partial<PlanComponent>) => Promise<void>;
    createQueueSolutionType: (input: any) => Promise<void>;
    updateQueueSolutionType: (id: string, patch: any) => Promise<void>;
    deleteQueueSolutionType: (id: string) => Promise<void>;
    createTokenDeliveryMethod: (input: any) => Promise<void>;
    updateTokenDeliveryMethod: (id: string, patch: any) => Promise<void>;
    deleteTokenDeliveryMethod: (id: string) => Promise<void>;
    createDurationTier: (input: any) => Promise<void>;
    updateDurationTier: (id: string, patch: any) => Promise<void>;
    deleteDurationTier: (id: string) => Promise<void>;
    buyAddOn: (input: { componentKey: string; quantity: number; simulateFailure?: boolean; branch_id?: number | null }) => Promise<void>;
    checkoutItemizedRegistration: (input: {
      companyName: string;
      industry: string;
      city: string;
      contactName: string;
      email: string;
      password: string;
      phone: string;
      itemizedSelections: Record<string, number>;
      branches?: any[];
      companyAddons?: Record<string, number>;
      durationMonths?: number;
      quoteId?: string;
      simulateFailure?: boolean;
      portalName?: string;
      logoUrl?: string;
      primaryColor?: string;
      displayAddress?: string;
      enabledCustomerFields?: string[];
      enabledBookingFields?: string[];
      enabledNotificationChannels?: string[];
    }) => Promise<{ companyId: string; branchId: string }>;
      checkoutUpgrade: (input: {
        branches: any[];
        durationMonths: number;
        quoteId?: string;
        simulateFailure?: boolean;
      }) => Promise<{ status: "success" | "approval_required"; message: string; upgrade_request_id?: string; purchased_amount?: number }>;
      regenerateKioskPin: (kioskId: string) => Promise<any>;
      updateKiosk: (kioskId: string, input: { status?: "active" | "inactive" }) => Promise<void>;
    };
  }

function mapPackageToPlanId(packageName: string): PlanTier {
  if (!packageName) return "starter";
  const name = packageName.toLowerCase();
  if (name.includes("starter")) return "starter";
  if (name.includes("growth")) return "growth";
  if (name.includes("advanced")) return "advanced";
  if (name.includes("standard")) return "standard";
  if (name.includes("enterprise")) return "enterprise";
  return "starter";
}

const QuesoleContext = createContext<Ctx | null>(null);

const SESSION_KEY = "quesole.session";

export function QuesoleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuesoleState>(() => ({
    companies: [],
    branches: [],
    desks: [],
    services: [],
    staff: [],
    tickets: [],
    appointments: [],
    alertRules: [],
    alerts: [],
    audit: [],
    upgrades: [],
    planComponents: [],
    companyAllocations: [],
    planPurchases: [],
    deskServices: [],
    userServices: [],
    solutionTypes: [],
    tokenDeliveryMethods: [],
    durationTiers: [],
    priceLogs: [],
    kiosks: [],
  }));
  const [session, setSessionState] = useState<Session | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  });
  const [simulating, setSimulating] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSessionState(JSON.parse(raw) as Session);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((s: Session | null) => {
    setSessionState(s);
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch real data from the backend
  const loadData = useCallback(async () => {
    try {
      const [
        companiesData,
        branchesData,
        desksData,
        servicesData,
        usersData,
        ticketsData,
        upgradesData,
        auditLogsData,
        queueMethodsData,
        planComponentsData,
        allocationsData,
        purchasesData,
        deskServicesData,
        userServicesData,
        solutionTypesData,
        tokenDeliveryMethodsData,
        durationTiersData,
        priceLogsData,
        kiosksData
      ] = await Promise.all([
        session?.role === "super_admin"
          ? apiFetch("/api/companies/").catch(() => [])
          : session?.companyId
            ? apiFetch(`/api/companies/${session.companyId}/`).then(c => [c]).catch(() => [])
            : apiFetch("/api/companies/").catch(() => []),
        apiFetch("/api/branches/").catch(() => []),
        apiFetch("/api/desks/").catch(() => []),
        apiFetch("/api/services/").catch(() => []),
        apiFetch("/api/users/").catch(() => []),
        apiFetch("/api/tickets/").catch(() => []),
        apiFetch("/api/upgrades/").catch(() => []),
        apiFetch("/api/audit-logs/").catch(() => []),
        apiFetch("/api/queue-methods/").catch(() => []),
        apiFetch("/api/billing/plan-components/").catch(() => []),
        apiFetch("/api/billing/allocations/").catch(() => []),
        apiFetch("/api/billing/purchases/").catch(() => []),
        apiFetch("/api/desk-services/").catch(() => []),
        apiFetch("/api/user-services/").catch(() => []),
        apiFetch("/api/billing/solution-types/").catch(() => []),
        apiFetch("/api/billing/token-delivery-methods/").catch(() => []),
        apiFetch("/api/billing/duration-tiers/").catch(() => []),
        apiFetch("/api/billing/price-change-logs/").catch(() => []),
        apiFetch("/api/kot/kiosks/").catch(() => [])
      ]);

      const formattedCompanies = Array.isArray(companiesData) ? companiesData : [companiesData].filter(Boolean);
      const fetchedComponents = Array.isArray(planComponentsData) && planComponentsData.length > 0
        ? planComponentsData.map((pc: any) => ({
            id: String(pc.id),
            key: pc.key,
            label: pc.label,
            description: pc.description || "",
            unit_label: pc.unit_label || "unit",
            default_included_qty: Number(pc.default_included_qty),
            price_per_unit: Number(pc.price_per_unit),
            is_toggle: Boolean(pc.is_toggle),
            min_qty: Number(pc.min_qty || 0),
            max_qty: pc.max_qty !== null ? Number(pc.max_qty) : null,
            is_active: Boolean(pc.is_active),
            category: pc.category || "ADDON",
            branch_mode_scope: pc.branch_mode_scope || "BOTH",
            pricing_type: pc.pricing_type || "PER_UNIT",
            max_qty_per_branch: pc.max_qty_per_branch !== null ? Number(pc.max_qty_per_branch) : null,
            is_addon_only: Boolean(pc.is_addon_only),
            display_order: Number(pc.display_order || 0),
            icon_key: pc.icon_key || "",
          }))
        : [];

      setState({
        companies: formattedCompanies.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          industry: c.industry,
          city: c.city,
          plan: mapPackageToPlanId(c.package_name || c.plan),
          status: c.status,
          createdAt: c.created_at || "",
          contact: c.contact_name || "",
          email: c.contact_email || "",
          branchIds: (c.branches || []).map((b: any) => String(b.id || b)),
          monthlySpend: Number(c.monthly_spend || 0),
          slug: c.slug || "",
          solution: c.solution || "ONSITE_ONLINE"
        })),
        branches: (Array.isArray(branchesData) ? branchesData : []).map((b: any) => ({
          id: String(b.id),
          companyId: String(b.company),
          name: b.name,
          city: b.city,
          address: b.address || "",
          method: b.method || 1,
          enabledMethods: b.enabled_methods || [1, 2],
          openHours: b.operating_hours_summary || "09:00 - 17:00",
          deskIds: (b.desks || []).map((d: any) => String(d.id || d)),
          serviceIds: (b.services || []).map((s: any) => String(s.id || s)),
          status: b.status || "active",
          slug: b.slug || "",
          geoLat: b.geo_lat !== null ? Number(b.geo_lat) : undefined,
          geoLng: b.geo_lng !== null ? Number(b.geo_lng) : undefined,
          geofenceRadiusMeters: b.geofence_radius_meters !== null ? Number(b.geofence_radius_meters) : undefined,
          geofenceEnabled: b.geofence_enabled !== null ? Boolean(b.geofence_enabled) : undefined,
          kioskPasswordHash: b.kiosk_password_hash || null,
          kioskIdleTimeoutSeconds: b.kiosk_idle_timeout_seconds !== null ? Number(b.kiosk_idle_timeout_seconds) : undefined,
          mode: b.mode,
          channel_type: b.channel_type || "ONSITE_ONLY",
        })),
        desks: (Array.isArray(desksData) ? desksData : []).map((d: any) => ({
          id: String(d.id),
          branchId: String(d.branch),
          label: d.name || d.label || "",
          serviceIds: [],
          staffId: d.staff_id ? String(d.staff_id) : null,
          status: d.is_active ? (d.staff_id ? "open" : "offline") : "offline",
          isActive: Boolean(d.is_active),
          isOnlineBookingDesk: Boolean(d.is_online_booking_desk)
        })),
        services: (Array.isArray(servicesData) ? servicesData : []).map((s: any) => ({
          id: String(s.id),
          branchId: String(s.branch),
          name: s.name,
          prefix: s.prefix || "A",
          avgMinutes: s.est_service_minutes || 15,
          isActive: Boolean(s.is_active)
        })),
        staff: (Array.isArray(usersData) ? usersData : []).filter((u: any) => u.role !== "super_admin" && u.role !== "company_admin").map((u: any) => {
          const assignedDesk = (Array.isArray(desksData) ? desksData : []).find((d: any) => String(d.staff_id) === String(u.id));
          return {
            id: String(u.id),
            companyId: String(u.company),
            branchId: String(u.branch),
            name: `${u.first_name} ${u.last_name}`,
            email: u.email,
            role: u.role === "desk_staff" ? "operator" : u.role,
            status: u.is_active ? "online" : "offline",
            servedToday: 0,
            avgHandleMin: 0,
            deskId: assignedDesk ? String(assignedDesk.id) : null
          };
        }),
        tickets: (Array.isArray(ticketsData) ? ticketsData : []).map((t: any) => ({
          id: String(t.id),
          branchId: t.branch ? (typeof t.branch === "object" ? String(t.branch.id) : String(t.branch)) : "",
          serviceId: t.service ? (typeof t.service === "object" ? String(t.service.id) : String(t.service)) : "",
          deskId: t.desk ? (typeof t.desk === "object" ? String(t.desk.id) : String(t.desk)) : null,
          predictedDeskId: t.predicted_desk ? (typeof t.predicted_desk === "object" ? String(t.predicted_desk.id) : String(t.predicted_desk)) : null,
          number: t.token_number,
          customerName: t.customer_name || "Guest",
          contact: t.customer_phone || "",
          note: t.message || "",
          status: t.status,
          joinedAt: new Date(t.created_at).getTime(),
          calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
          servedAt: t.served_at ? new Date(t.served_at).getTime() : undefined
        })),
        appointments: [],
        alertRules: [],
        alerts: [],
        audit: (Array.isArray(auditLogsData) ? auditLogsData : []).map((a: any) => ({
          id: String(a.id),
          actor: a.actor_user_id ? String(a.actor_user_id) : "system",
          action: a.action,
          target: a.object_type,
          at: new Date(a.created_at).getTime()
        })),
        upgrades: (Array.isArray(upgradesData) ? upgradesData : []).map((u: any) => ({
          id: String(u.id),
          companyId: String(u.company),
          type: u.type,
          from: u.details?.from || "starter",
          to: u.details?.to || "growth",
          status: u.status,
          requestedAt: new Date(u.created_at).toISOString()
        })),
        planComponents: fetchedComponents,
        companyAllocations: (Array.isArray(allocationsData) ? allocationsData : []).map((a: any) => ({
          id: String(a.id),
          companyId: String(a.company),
          plan_component_id: String(a.plan_component),
          component_key: a.component_key,
          component_label: a.component_label,
          component_unit_label: a.component_unit_label,
          is_toggle: Boolean(a.is_toggle),
          description: a.description || "",
          min_qty: Number(a.min_qty || 0),
          max_qty: a.max_qty !== null ? Number(a.max_qty) : null,
          purchased_qty: Number(a.purchased_qty),
          unit_price_at_purchase: Number(a.unit_price_at_purchase),
          branch_id: a.branch ? String(a.branch) : null
        })),
        planPurchases: (Array.isArray(purchasesData) ? purchasesData : []).map((p: any) => ({
          id: String(p.id),
          companyId: String(p.company),
          type: p.type,
          line_items: p.line_items || [],
          total_amount: Number(p.total_amount),
          payment_status: p.payment_status,
          payment_reference: p.payment_reference || "",
          created_at: p.created_at || ""
        })),
        deskServices: (Array.isArray(deskServicesData) ? deskServicesData : []).map((ds: any) => ({
          id: String(ds.id),
          deskId: String(ds.desk),
          serviceId: String(ds.service)
        })),
        userServices: (Array.isArray(userServicesData) ? userServicesData : []).map((us: any) => ({
          id: String(us.id),
          userId: String(us.user),
          serviceId: String(us.service)
        })),
        solutionTypes: (Array.isArray(solutionTypesData) ? solutionTypesData : []).map((st: any) => ({
          id: String(st.id),
          key: st.key,
          label: st.label,
          description: st.description || "",
          icon_key: st.icon_key || "",
          is_active: Boolean(st.is_active),
          display_order: Number(st.display_order || 0)
        })),
        tokenDeliveryMethods: (Array.isArray(tokenDeliveryMethodsData) ? tokenDeliveryMethodsData : []).map((tdm: any) => ({
          id: String(tdm.id),
          key: tdm.key,
          label: tdm.label,
          price_per_branch: tdm.price_per_branch !== null ? Number(tdm.price_per_branch) : null,
          is_active: Boolean(tdm.is_active),
          requires_hardware: Boolean(tdm.requires_hardware),
          display_order: Number(tdm.display_order || 0)
        })),
        durationTiers: (Array.isArray(durationTiersData) ? durationTiersData : []).map((dt: any) => ({
          id: String(dt.id),
          months: Number(dt.months),
          discount_percent: Number(dt.discount_percent),
          is_active: Boolean(dt.is_active),
          display_order: Number(dt.display_order || 0)
        })),
        priceLogs: (Array.isArray(priceLogsData) ? priceLogsData : []).map((pl: any) => ({
          id: String(pl.id),
          plan_component: String(pl.plan_component),
          old_price: Number(pl.old_price),
          new_price: Number(pl.new_price),
          changed_by: pl.changed_by ? String(pl.changed_by) : null,
          changed_by_email: pl.changed_by_email || "",
          component_label: pl.component_label || "",
          component_key: pl.component_key || "",
          changed_at: pl.changed_at
        })),
        kiosks: (Array.isArray(kiosksData) ? kiosksData : []).map((k: any) => ({
          id: String(k.id),
          company: Number(k.company),
          branch: Number(k.branch),
          kiosk_identifier: k.kiosk_identifier,
          pin: k.pin,
          status: k.status,
          session_token: k.session_token,
          connected_at: k.connected_at,
          last_seen: k.last_seen,
          is_logged_in: Boolean(k.is_logged_in),
          created_at: k.created_at,
          updated_at: k.updated_at
        }))
      });
    } catch (err) {
      console.error("Failed to load backend data:", err);
    }
  }, [session]);

  // Load data initially when session is established
  useEffect(() => {
    loadData();
  }, [session, loadData]);

  // WebSocket Live Updates Connection
  useEffect(() => {
    if (!session || !session.branchId) return;

    const clientType = session.role === "operator" || session.role === "branch_admin" || session.role === "company_admin" ? "staff" : "public";
    const token = localStorage.getItem("quesole.access_token");
    
    // Connect over our ASGI path
    const wsUrl = `ws://localhost:8000/ws/branch/${session.branchId}/${clientType}/${clientType === "staff" ? `?token=${token}` : ""}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "queue.update" && payload.data) {
          const t = payload.data;
          const mappedTicket: Ticket = {
            id: String(t.id),
            branchId: String(t.branch),
            serviceId: String(t.service),
            deskId: t.desk ? String(t.desk) : null,
            predictedDeskId: t.predicted_desk ? String(t.predicted_desk) : null,
            number: t.token_number,
            customerName: t.customer_name || "Guest",
            contact: t.customer_phone || "",
            note: t.message || "",
            status: t.status,
            joinedAt: new Date(t.created_at).getTime(),
            calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
            servedAt: t.served_at ? new Date(t.served_at).getTime() : undefined
          };

          setState((s) => {
            const exists = s.tickets.some((x) => x.id === mappedTicket.id);
            const updatedTickets = exists
              ? s.tickets.map((x) => (x.id === mappedTicket.id ? mappedTicket : x))
              : [...s.tickets, mappedTicket];
            return { ...s, tickets: updatedTickets };
          });
        }
      } catch (err) {
        console.error("Error parsing websocket queue update:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetch("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      const access = data.access;
      const refresh = data.refresh;
      
      let rawRole = String(data.user.role || "");
      let role: Role = (rawRole === "desk_staff" ? "operator" : rawRole) as Role;
      
      const newSession: Session = {
        role,
        name: data.user.name,
        email: data.user.email,
        companyId: String(data.user.companyId || ""),
        branchId: String(data.user.branchId || ""),
        deskId: String(data.user.deskId || ""),
      };
      
      localStorage.setItem("quesole.access_token", access);
      localStorage.setItem("quesole.refresh_token", refresh);
      persist(newSession);
      
      return newSession;
    } catch (err: any) {
      throw new Error(err.message || "Invalid credentials");
    }
  }, [persist]);

  const signOut = useCallback(async () => {
    const refreshToken = localStorage.getItem("quesole.refresh_token");
    if (refreshToken) {
      try {
        await apiFetch("/api/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch (err) {
        console.error("Logout API failed:", err);
      }
    }
    localStorage.removeItem("quesole.access_token");
    localStorage.removeItem("quesole.refresh_token");
    persist(null);
  }, [persist]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const actions = useMemo(() => {
    return {
      async joinQueue(input: {
        branchId: string;
        serviceId: string;
        customerName: string;
        contact: string;
        customerEmail?: string;
        note?: string;
        method?: string;
        channel?: "qr" | "kiosk" | "remote" | "onscreen" | "sms" | "whatsapp";
      }) {
        const branchObj = stateRef.current.branches.find(b => String(b.id) === String(input.branchId));
        const activeMethod = input.method || String(branchObj?.method || "1");

        const res = await apiFetch("/api/public/join/", {
          method: "POST",
          body: JSON.stringify({
            branch_id: input.branchId,
            name: input.customerName,
            contact: input.contact,
            email: input.customerEmail || "",
            message: input.note || "",
            service_id: input.serviceId || null,
            method: activeMethod,
            channel: input.channel || "qr",
            consent: true,
          })
        });
        loadData();
        return String(res.id);
      },

      async callNext(deskId: string) {
        const res = await apiFetch("/api/tickets/call-next/", {
          method: "POST",
          body: JSON.stringify({ desk_id: deskId })
        });
        if (res && res.id) {
          const resDeskId = res.desk ? (typeof res.desk === "object" ? String(res.desk.id) : String(res.desk)) : String(deskId);
          setState((prev) => ({
            ...prev,
            tickets: prev.tickets.map((t) =>
              String(t.id) === String(res.id)
                ? { ...t, status: "called", deskId: resDeskId, calledAt: Date.now() }
                : t
            )
          }));
        }
        await loadData();
        return res;
      },

      async setTicketStatus(ticketId: string, status: Ticket["status"]) {
        let actionStr = "serve";
        if (status === "served") actionStr = "complete";
        if (status === "skipped") actionStr = "skip";
        if (status === "hold") actionStr = "hold";
        
        setState((prev) => ({
          ...prev,
          tickets: prev.tickets.map((t) =>
            String(t.id) === String(ticketId)
              ? { ...t, status, servedAt: status === "served" ? Date.now() : t.servedAt }
              : t
          )
        }));

        await apiFetch(`/api/tickets/${ticketId}/action/`, {
          method: "POST",
          body: JSON.stringify({ action: actionStr })
        });
        await loadData();
      },

      async transferTicket(ticketId: string, deskId: string) {
        await apiFetch(`/api/tickets/${ticketId}/action/`, {
          method: "POST",
          body: JSON.stringify({ action: "transfer", target_desk_id: deskId })
        });
        loadData();
      },

      async approveCompany(companyId: string) {
        await apiFetch(`/api/companies/${companyId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" })
        });
        loadData();
      },

      async suspendCompany(companyId: string) {
        await apiFetch(`/api/companies/${companyId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "suspended" })
        });
        loadData();
      },

      async resolveUpgrade(id: string, status: "approved" | "declined") {
        await apiFetch(`/api/upgrades/${id}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: status === "approved" ? "approved" : "rejected" })
        });
        loadData();
      },

      async setDeskStatus(deskId: string, status: Desk["status"]) {
        await apiFetch(`/api/desks/${deskId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        loadData();
      },

      async setBranchMethod(branchId: string, method: QueueMethod, isEnabled?: boolean) {
        let targetEnabled = true;
        if (isEnabled !== undefined) {
          targetEnabled = isEnabled;
        } else if (method === 4) {
          const branch = stateRef.current.branches.find(x => x.id === branchId);
          const wasEnabled = branch?.enabledMethods?.includes(4) ?? false;
          targetEnabled = !wasEnabled;
        }

        await apiFetch("/api/queue-methods/", {
          method: "POST",
          body: JSON.stringify({
            branch: branchId,
            method: String(method),
            is_enabled: targetEnabled,
            config: {}
          })
        });
        loadData();
      },

      async registerCompany(input: {
        name: string;
        industry: string;
        city: string;
        plan: Company["plan"];
        contact: string;
        email: string;
        branchName: string;
        password?: string;
        phone?: string;
      }) {
        const res = await apiFetch("/api/companies/register/", {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            industry: input.industry,
            city: input.city,
            plan: input.plan,
            contact: input.contact,
            email: input.email,
            branchName: input.branchName,
            password: input.password,
            phone: input.phone
          })
        });
        return { companyId: String(res.companyId), branchId: String(res.branchId) };
      },

      async addBranch(input: Omit<Branch, "id" | "deskIds" | "serviceIds">) {
        const res = await apiFetch("/api/branches/", {
          method: "POST",
          body: JSON.stringify({
            name: input.name,
            slug: input.slug || input.name.toLowerCase().replace(/\s+/g, "-"),
            city: input.city,
            address: input.address,
            open_hours: input.openHours || "09:00 – 18:00",
            timezone: "Asia/Kolkata",
            status: input.status || "active",
            geo_lat: input.geoLat !== undefined ? input.geoLat : null,
            geo_lng: input.geoLng !== undefined ? input.geoLng : null,
            geofence_radius_meters: input.geofenceRadiusMeters !== undefined ? input.geofenceRadiusMeters : 200,
            geofence_enabled: input.geofenceEnabled !== undefined ? input.geofenceEnabled : true,
          })
        });
        loadData();
        return String(res.id);
      },

      async updateBranchDetails(branchId: string, input: { 
        name: string; 
        city: string; 
        address?: string; 
        openHours?: string; 
        geoLat?: number; 
        geoLng?: number; 
        geofenceRadiusMeters?: number; 
        geofenceEnabled?: boolean;
        kioskPasswordHash?: string | null;
        kioskIdleTimeoutSeconds?: number;
      }) {
        const body: Record<string, any> = {
          name: input.name,
          slug: input.name.toLowerCase().replace(/\s+/g, "-"),
          city: input.city,
          address: input.address,
          open_hours: input.openHours,
          geo_lat: input.geoLat,
          geo_lng: input.geoLng,
          geofence_radius_meters: input.geofenceRadiusMeters,
          geofence_enabled: input.geofenceEnabled,
        };
        if (input.kioskPasswordHash !== undefined) {
          body["kiosk_password_hash"] = input.kioskPasswordHash;
        }
        if (input.kioskIdleTimeoutSeconds !== undefined) {
          body["kiosk_idle_timeout_seconds"] = input.kioskIdleTimeoutSeconds;
        }

        await apiFetch(`/api/branches/${branchId}/`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        loadData();
      },

      async updateCompanyBranding(companyId: string, input: any) {
        const body: Record<string, any> = {};
        if (input.name) body["name"] = input.name;
        if (input.industry) body["industry"] = input.industry;
        if (input.city) body["city"] = input.city;
        if (input.address) body["address"] = input.address;
        if (input.tagline) body["tagline"] = input.tagline;
        if (input.slug !== undefined) body["slug"] = input.slug;
        if (input.supportPhone) body["support_phone"] = input.supportPhone;
        if (input.supportEmail) body["support_email"] = input.supportEmail;
        if (input.contactPhone) body["contact_phone"] = input.contactPhone;
        if (input.contactEmail) body["contact_email"] = input.contactEmail;
        if (input.logoUrl) body["logo_url"] = input.logoUrl;
        if (input.brandColors) body["brand_colors"] = input.brandColors;
        else if (input.primaryColor) body["brand_colors"] = { primary: input.primaryColor };

        await apiFetch(`/api/companies/${companyId}/`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
        loadData();
      },

      async issueManualTicket(input: { branchId: string; name?: string; phone?: string; serviceId?: string; deskId?: string }) {
        const res = await apiFetch("/api/tickets/manual-issue/", {
          method: "POST",
          body: JSON.stringify({
            branch_id: input.branchId,
            name: input.name || "Walk-in Visitor",
            contact: input.phone || "Walk-in",
            service_id: input.serviceId,
            desk_id: input.deskId
          })
        });
        loadData();
        return res;
      },

      async bookAppointment(input: { branchId: string; serviceId: string; customerName: string; contact: string; date: string; slot: string }) {
        const res = await apiFetch("/api/appointments/", {
          method: "POST",
          body: JSON.stringify({
            branch: input.branchId,
            service: input.serviceId,
            customer_name: input.customerName,
            contact: input.contact,
            date: input.date,
            slot: input.slot,
            status: "confirmed"
          })
        }).catch(() => null);
        loadData();
        return res ? res.code || "APT-100" : "APT-100";
      },

      async cancelAppointment(appointmentId: string) {
        await apiFetch(`/api/appointments/${appointmentId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled" })
        }).catch(() => {});
        loadData();
      },

      async readAlert(alertId: string) {
        await apiFetch(`/api/alerts/${alertId}/`, {
          method: "PATCH",
          body: JSON.stringify({ read: true })
        }).catch(() => {});
        loadData();
      },

      async readAllAlerts() {
        await apiFetch("/api/alerts/read-all/", {
          method: "POST"
        }).catch(() => {});
        loadData();
      },

      async toggleRule(ruleId: string) {
        const rule = stateRef.current.alertRules.find((r) => r.id === ruleId);
        if (rule) {
          await apiFetch(`/api/alert-rules/${ruleId}/`, {
            method: "PATCH",
            body: JSON.stringify({ enabled: !rule.enabled })
          }).catch(() => {});
          loadData();
        }
      },

      async updateBranchStatus(branchId: string, status: "active" | "inactive") {
        await apiFetch(`/api/branches/${branchId}/`, {
          method: "PATCH",
          body: JSON.stringify({ status })
        });
        loadData();
      },

      async deleteBranch(branchId: string) {
        await apiFetch(`/api/branches/${branchId}/`, {
          method: "DELETE"
        });
        loadData();
      },

      async requestUpgrade(companyId: string, type: "branch" | "plan", details?: any) {
        await apiFetch("/api/upgrades/", {
          method: "POST",
          body: JSON.stringify({
            company: companyId,
            type,
            details: details || { reason: "Requested upgrade from Company Admin" }
          })
        });
        loadData();
      },

      async createDesk(input: { branchId: string; name: string }) {
        const res = await apiFetch("/api/desks/", {
          method: "POST",
          body: JSON.stringify({
            branch: input.branchId,
            name: input.name,
            status: "offline",
            is_active: true,
          }),
        });
        loadData();
        return String(res.id);
      },

      async updateDesk(deskId: string, input: { name?: string; label?: string; isActive?: boolean; serviceIds?: string[]; assignedStaffId?: string | null; isOnlineBookingDesk?: boolean }) {
        const nameToUpdate = input.name || input.label;
        
        setState((prev) => ({
          ...prev,
          desks: prev.desks.map((d) =>
            String(d.id) === String(deskId)
              ? ({
                  ...d,
                  label: nameToUpdate !== undefined ? nameToUpdate : d.label,
                  isActive: input.isActive !== undefined ? input.isActive : d.isActive,
                  staffId: input.assignedStaffId !== undefined ? input.assignedStaffId : d.staffId,
                  isOnlineBookingDesk: input.isOnlineBookingDesk !== undefined ? input.isOnlineBookingDesk : d.isOnlineBookingDesk,
                } as Desk)
              : d
          ),
          staff: input.assignedStaffId !== undefined
            ? prev.staff.map((st) => {
                if (String(st.id) === String(input.assignedStaffId)) {
                  return { ...st, deskId: String(deskId) };
                } else if (String(st.deskId) === String(deskId)) {
                  return { ...st, deskId: null };
                }
                return st;
              })
            : prev.staff,
        }));

        const body: Record<string, any> = {};
        if (nameToUpdate !== undefined) {
          body["name"] = nameToUpdate;
        }
        if (input.isActive !== undefined) {
          body["is_active"] = input.isActive;
        }
        if (input.isOnlineBookingDesk !== undefined) {
          body["is_online_booking_desk"] = input.isOnlineBookingDesk;
        }
        if (Object.keys(body).length > 0) {
          await apiFetch(`/api/desks/${deskId}/`, {
            method: "PATCH",
            body: JSON.stringify(body),
          }).catch((err) => console.warn("Failed to patch desk:", err));
        }

        // Persist Desk Staff Assignment to Database
        if (input.assignedStaffId !== undefined) {
          try {
            const assignments = await apiFetch("/api/desk-staff-assignments/").catch(() => []);
            const toDelete = assignments.filter((a: any) =>
              String(a.desk) === String(deskId) || (input.assignedStaffId && String(a.user) === String(input.assignedStaffId))
            );
            await Promise.all(toDelete.map((a: any) =>
              apiFetch(`/api/desk-staff-assignments/${a.id}/`, { method: "DELETE" }).catch(() => {})
            ));

            if (input.assignedStaffId) {
              const now = new Date().toISOString();
              const end = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
              await apiFetch("/api/desk-staff-assignments/", {
                method: "POST",
                body: JSON.stringify({
                  desk: deskId,
                  user: input.assignedStaffId,
                  shift_start: now,
                  shift_end: end,
                  is_active: true
                })
              });
            }
          } catch (err) {
            console.error("Failed to update desk staff assignment in DB:", err);
          }
        }

        if (input.serviceIds !== undefined) {
          await actions.updateDeskServices(deskId, input.serviceIds);
        } else {
          await loadData();
        }
      },

      async toggleDeskStatus(deskId: string, isActive: boolean) {
        await apiFetch(`/api/desks/${deskId}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        });
        loadData();
      },

      async deleteDesk(deskId: string) {
        await apiFetch(`/api/desks/${deskId}/`, {
          method: "DELETE",
        });
        loadData();
      },

      async createService(input: { branchId: string; name: string; prefix?: string; estServiceMinutes?: number }) {
        const res = await apiFetch("/api/services/", {
          method: "POST",
          body: JSON.stringify({
            branch: input.branchId,
            name: input.name,
            prefix: input.prefix || "A",
            est_service_minutes: input.estServiceMinutes || 15,
            is_active: true,
          }),
        });
        loadData();
        return String(res.id);
      },

      async toggleServiceStatus(serviceId: string, isActive: boolean) {
        await apiFetch(`/api/services/${serviceId}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_active: isActive }),
        });
        loadData();
      },

      async updateDeskServices(deskId: string, serviceIds: string[]) {
        // Find existing mappings for this desk
        const existing = stateRef.current.deskServices.filter((ds) => String(ds.deskId) === String(deskId));
        for (const ds of existing) {
          await apiFetch(`/api/desk-services/${ds.id}/`, { method: "DELETE" }).catch(() => {});
        }
        for (const sId of serviceIds) {
          await apiFetch("/api/desk-services/", {
            method: "POST",
            body: JSON.stringify({ desk: deskId, service: sId }),
          }).catch(() => {});
        }

        // Auto-sync user_services for all staff members assigned to this desk
        const assignedStaffUsers = stateRef.current.staff.filter((st) => String(st.deskId) === String(deskId));
        for (const st of assignedStaffUsers) {
          await actions.updateUserServices(st.id, serviceIds);
        }

        loadData();
      },

      async updateUserServices(userId: string, serviceIds: string[]) {
        // Find existing mappings for this user
        const existing = stateRef.current.userServices.filter((us) => us.userId === userId);
        for (const us of existing) {
          await apiFetch(`/api/user-services/${us.id}/`, { method: "DELETE" }).catch(() => {});
        }
        for (const sId of serviceIds) {
          await apiFetch("/api/user-services/", {
            method: "POST",
            body: JSON.stringify({ user: userId, service: sId }),
          }).catch(() => {});
        }
        loadData();
      },

      async createBranchStaff(input: {
        branchId: string;
        email: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        role: "branch_admin" | "desk_staff";
        serviceIds?: string[];
      }) {
        const password = input.password || "Staff123!";
        const res = await apiFetch("/api/users/", {
          method: "POST",
          body: JSON.stringify({
            email: input.email.trim(),
            password: password,
            password_confirm: password,
            first_name: input.firstName?.trim() || "",
            last_name: input.lastName?.trim() || "",
            phone: input.phone?.trim() || "",
            role: input.role,
            branch: input.branchId,
          })
        });

        if (input.serviceIds && input.serviceIds.length > 0 && res?.id) {
          for (const sId of input.serviceIds) {
            await apiFetch("/api/user-services/", {
              method: "POST",
              body: JSON.stringify({ user: res.id, service: sId })
            }).catch(console.error);
          }
        }
        loadData();
        return res;
      },

      async updateBranchStaff(userId: string, input: {
        firstName?: string;
        lastName?: string;
        email?: string;
        role?: "branch_admin" | "desk_staff";
        serviceIds?: string[];
      }) {
        const body: Record<string, any> = {};
        if (input.firstName !== undefined) body["first_name"] = input.firstName;
        if (input.lastName !== undefined) body["last_name"] = input.lastName;
        if (input.email !== undefined) body["email"] = input.email;
        if (input.role !== undefined) body["role"] = input.role;

        if (Object.keys(body).length > 0) {
          await apiFetch(`/api/users/${userId}/`, {
            method: "PATCH",
            body: JSON.stringify(body)
          }).catch(() => {});
        }

        if (input.serviceIds !== undefined) {
          await actions.updateUserServices(userId, input.serviceIds);
        } else {
          loadData();
        }
      },

      async addDesk(branchId: string, label: string, serviceIds: string[]) {
        const res = await apiFetch("/api/desks/", {
          method: "POST",
          body: JSON.stringify({
            name: label,
            status: "offline"
          })
        });
        await Promise.all(serviceIds.map(sid => 
          apiFetch("/api/desk-services/", {
            method: "POST",
            body: JSON.stringify({ desk: res.id, service: sid })
          }).catch(console.error)
        ));
        loadData();
      },

      async addService(branchId: string, name: string, prefix: string, avgMinutes: number) {
        await apiFetch("/api/services/", {
          method: "POST",
          body: JSON.stringify({
            name,
            prefix,
            est_service_minutes: avgMinutes
          })
        });
        loadData();
      },

      async createStaff(input: { companyId: string; branchId: string; name: string; email: string; role: string; password: string; passwordConfirm: string }) {
        const [firstName, ...lastParts] = input.name.split(" ");
        const apiRole = input.role === "operator" ? "desk_staff" : input.role;
        await apiFetch("/api/users/", {
          method: "POST",
          body: JSON.stringify({
            email: input.email,
            first_name: firstName || input.name,
            last_name: lastParts.join(" ") || "",
            role: apiRole,
            branch: input.branchId || null,
            password: input.password,
            password_confirm: input.passwordConfirm,
          })
        });
        loadData();
      },

      async inviteStaff(input: Omit<Staff, "id" | "servedToday" | "avgHandleMin" | "status">) {
        const apiRole = input.role === "operator" ? "desk_staff" : input.role;
        await apiFetch("/api/invites/", {
          method: "POST",
          body: JSON.stringify({
            email_or_phone: input.email,
            role: apiRole,
            branch: input.branchId || null
          })
        });
        loadData();
      },

      async removeStaff(id: string) {
        await apiFetch(`/api/users/${id}/`, {
          method: "DELETE"
        });
        loadData();
      },

      async checkoutSubscription(planId: string, billingCycle: "monthly" | "yearly") {
        let packageId = 1;
        if (planId === "starter") packageId = 1;
        else if (planId === "growth" || planId === "standard") packageId = 2;
        else if (planId === "advanced") packageId = 3;
        else if (planId === "enterprise") packageId = 4;

        const res = await apiFetch("/api/billing/checkout/", {
          method: "POST",
          body: JSON.stringify({ package_id: packageId, billing_cycle: billingCycle })
        });
        
        if (res.checkout_url) {
          let url = res.checkout_url;
          if (url.startsWith("/")) {
            url = `${API_BASE}${url}`;
          }
          window.location.href = url;
        }
      },

      async createPlanComponent(input: Omit<PlanComponent, "id">) {
        await apiFetch("/api/billing/plan-components/", {
          method: "POST",
          body: JSON.stringify(input)
        });
        loadData();
      },

      async updatePlanComponent(id: string, patch: Partial<PlanComponent>) {
        await apiFetch(`/api/billing/plan-components/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        loadData();
      },

      async createQueueSolutionType(input: any) {
        await apiFetch("/api/billing/solution-types/", {
          method: "POST",
          body: JSON.stringify(input)
        });
        loadData();
      },

      async updateQueueSolutionType(id: string, patch: any) {
        await apiFetch(`/api/billing/solution-types/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        loadData();
      },

      async deleteQueueSolutionType(id: string) {
        await apiFetch(`/api/billing/solution-types/${id}/`, {
          method: "DELETE"
        });
        loadData();
      },

      async createTokenDeliveryMethod(input: any) {
        await apiFetch("/api/billing/token-delivery-methods/", {
          method: "POST",
          body: JSON.stringify(input)
        });
        loadData();
      },

      async updateTokenDeliveryMethod(id: string, patch: any) {
        await apiFetch(`/api/billing/token-delivery-methods/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        loadData();
      },

      async deleteTokenDeliveryMethod(id: string) {
        await apiFetch(`/api/billing/token-delivery-methods/${id}/`, {
          method: "DELETE"
        });
        loadData();
      },

      async createDurationTier(input: any) {
        await apiFetch("/api/billing/duration-tiers/", {
          method: "POST",
          body: JSON.stringify(input)
        });
        loadData();
      },

      async updateDurationTier(id: string, patch: any) {
        await apiFetch(`/api/billing/duration-tiers/${id}/`, {
          method: "PATCH",
          body: JSON.stringify(patch)
        });
        loadData();
      },

      async deleteDurationTier(id: string) {
        await apiFetch(`/api/billing/duration-tiers/${id}/`, {
          method: "DELETE"
        });
        loadData();
      },

      async buyAddOn(input: { componentKey: string; quantity: number; simulateFailure?: boolean; branch_id?: number | null }) {
        await apiFetch("/api/billing/buy-addon/", {
          method: "POST",
          body: JSON.stringify({
            component_key: input.componentKey,
            quantity: input.quantity,
            simulate_failure: input.simulateFailure ?? false,
            branch_id: input.branch_id
          })
        });
        await loadData();
      },

      async checkoutItemizedRegistration(input: {
        companyName: string;
        industry: string;
        city: string;
        contactName: string;
        email: string;
        password: string;
        confirmPassword?: string;
        phone: string;
        itemizedSelections: Record<string, number>;
        branches?: any[];
        companyAddons?: Record<string, number>;
        durationMonths?: number;
        quoteId?: string;
        simulateFailure?: boolean;
        portalName?: string;
        logoUrl?: string;
        primaryColor?: string;
        displayAddress?: string;
        enabledCustomerFields?: string[];
        enabledBookingFields?: string[];
        enabledNotificationChannels?: string[];
        companySlug?: string;
        website?: string;
      }) {
        if (input.simulateFailure) {
          throw new Error("Simulated Payment Gateway Authorization Failed. Please check card credentials and retry.");
        }

        const res = await apiFetch("/api/companies/register/", {
          method: "POST",
          body: JSON.stringify({
            name: input.companyName,
            industry: input.industry,
            city: input.city,
            contact: input.contactName,
            email: input.email,
            password: input.password,
            admin_confirm_password: input.confirmPassword || input.password,
            phone: input.phone || "9999999999",
            itemizedSelections: input.itemizedSelections,
            branches: input.branches,
            company_addons: input.companyAddons,
            duration_months: input.durationMonths || 1,
            quote_id: input.quoteId,
            portal_name: input.portalName,
            logo_url: input.logoUrl,
            primary_color: input.primaryColor,
            display_address: input.displayAddress,
            enabled_customer_fields: input.enabledCustomerFields,
            enabled_booking_fields: input.enabledBookingFields,
            enabled_notification_channels: input.enabledNotificationChannels,
            slug: input.companySlug,
            website: input.website,
          })
        });

        await loadData();
        return {
          companyId: String(res.companyId),
          branchId: String(res.branchId)
        };
      },

      async checkoutUpgrade(input: {
        branches: any[];
        durationMonths: number;
        quoteId?: string;
        simulateFailure?: boolean;
      }) {
        const res = await apiFetch("/api/billing/checkout-upgrade/", {
          method: "POST",
          body: JSON.stringify({
            branches: input.branches,
            duration_months: input.durationMonths,
            quote_id: input.quoteId,
            simulate_failure: input.simulateFailure ?? false
          })
        });

        await loadData();
        return res;
      },

      async regenerateKioskPin(kioskId: string) {
        const res = await apiFetch(`/api/kot/kiosks/${kioskId}/regenerate-pin/`, {
          method: "POST"
        });
        await loadData();
        return res;
      },

      async updateKiosk(kioskId: string, input: { status?: "active" | "inactive" }) {
        await apiFetch(`/api/kot/kiosks/${kioskId}/`, {
          method: "PATCH",
          body: JSON.stringify(input)
        });
        await loadData();
      }
    };
  }, [loadData]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      session,
      simulating,
      tick,
      signIn,
      signOut,
      setSession: (patch: Partial<Session>) =>
        persist(session ? { ...session, ...patch } : session),
      setSimulating,
      refresh: loadData,
      actions,
    }),
    [state, session, simulating, tick, persist, signIn, signOut, loadData, actions],
  );

  return <QuesoleContext.Provider value={value}>{children}</QuesoleContext.Provider>;
}

export function useQuesole() {
  const ctx = useContext(QuesoleContext);
  if (!ctx) throw new Error("useQuesole must be used inside QuesoleProvider");
  return ctx;
}

/* ---------- Derived selectors ---------- */

export function branchesOf(state: QuesoleState, companyId: string) {
  return state.branches.filter((b) => String(b.companyId) === String(companyId));
}

export function ticketsOf(state: QuesoleState, branchId: string) {
  return state.tickets.filter((t) => String(t.branchId) === String(branchId));
}

export function waitingOf(state: QuesoleState, branchId: string) {
  return ticketsOf(state, branchId)
    .filter((t) => t.status === "waiting")
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

export function servingOf(state: QuesoleState, branchId: string) {
  return ticketsOf(state, branchId).filter((t) => t.status === "serving");
}

export function branchStats(state: QuesoleState, branchId: string) {
  const tickets = ticketsOf(state, branchId);
  const served = tickets.filter((t) => t.status === "served");
  const waiting = tickets.filter((t) => t.status === "waiting");
  const waits = served
    .filter((t) => t.calledAt)
    .map((t) => (t.calledAt! - t.joinedAt) / 60000);
  const avgWait = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
  const handles = served
    .filter((t) => t.servedAt && t.calledAt)
    .map((t) => (t.servedAt! - t.calledAt!) / 60000);
  const avgHandle = handles.length ? handles.reduce((a, b) => a + b, 0) / handles.length : 0;
  const desks = state.desks.filter((d) => d.branchId === branchId);
  return {
    waiting: waiting.length,
    served: served.length,
    avgWait: Math.max(1.5, avgWait),
    avgHandle: Math.max(2, avgHandle),
    desksOpen: desks.filter((d) => d.status === "open").length,
    desksTotal: desks.length,
  };
}

export function companyStats(state: QuesoleState, companyId: string) {
  const bs = branchesOf(state, companyId);
  const branchIds = new Set(bs.map((b) => String(b.id)));
  const agg = bs.map((b) => branchStats(state, b.id));
  const sum = (k: "waiting" | "served") => agg.reduce((a, x) => a + x[k], 0);
  const avg = (k: "avgWait" | "avgHandle") =>
    agg.length ? agg.reduce((a, x) => a + x[k], 0) / agg.length : 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const apptsToday = state.appointments
    ? state.appointments.filter(
        (a) => branchIds.has(String(a.branchId)) && a.date === todayStr && a.status === "confirmed"
      ).length
    : 0;

  return {
    branches: bs.length,
    waiting: sum("waiting"),
    served: sum("served"),
    avgWait: avg("avgWait"),
    avgHandle: avg("avgHandle"),
    appointments: apptsToday,
    staffOnline: state.staff.filter((s) => String(s.companyId) === String(companyId) && s.status === "online").length,
    staffTotal: state.staff.filter((s) => String(s.companyId) === String(companyId)).length,
    // Calculated mock/live trend percentages vs. yesterday/last hour
    waitingTrend: -8, // 8% down in wait list (positive performance indicator)
    servedTrend: +14, // 14% up in served volume
    avgWaitTrend: -5, // 5% down in avg wait time
    staffTrend: +3,
  };
}

export function planOf(id: string) {
  return PLANS.find((p) => p.id === id) ?? PLANS[1]!;
}

export function positionOf(state: QuesoleState, ticketId: string) {
  const ticket = state.tickets.find((t) => String(t.id) === String(ticketId));
  if (!ticket) return null;
  const ahead = state.tickets.filter(
    (t) =>
      String(t.branchId) === String(ticket.branchId) &&
      String(t.serviceId) === String(ticket.serviceId) &&
      t.status === "waiting" &&
      t.joinedAt < ticket.joinedAt,
  ).length;
  const svc = state.services.find((s) => String(s.id) === String(ticket.serviceId));
  return {
    ticket,
    ahead,
    eta: Math.round(ahead * (svc?.avgMinutes ?? 8) * 0.8) + (ticket.status === "serving" ? 0 : 2),
    service: svc,
  };
}

export function isNoServiceMode(companyId: string, allocations: CompanyPlanAllocation[]): boolean {
  if (!companyId) return false;
  const alloc = allocations.find(
    (a) => String(a.companyId) === String(companyId) && a.component_key === "services"
  );
  if (!alloc) return false;
  return alloc.purchased_qty === 0;
}

export function calculateBranchReadiness(branch: Branch, state: QuesoleState): {
  score: number;
  steps: { label: string; done: boolean; required: boolean }[];
} {
  const branchServices = state.services.filter((s) => String(s.branchId) === String(branch.id));
  const branchDesks = state.desks.filter((d) => String(d.branchId) === String(branch.id));
  const branchStaff = state.staff.filter((st) => String(st.branchId) === String(branch.id));
  const branchDeskServices = state.deskServices?.filter((ds) => branchDesks.some((d) => d.id === ds.deskId)) ?? [];

  const hasDetails = Boolean(branch.name && branch.city && branch.address);
  const hasServices = branchServices.length > 0;
  const hasDesks = branchDesks.length > 0;
  const hasStaff = branchStaff.length > 0;
  const hasAssignments = branchDeskServices.length > 0 || (hasDesks && hasStaff);
  const hasMethods = Boolean(branch.method || branch.enabledMethods?.length);

  const noService = isNoServiceMode(branch.companyId, state.companyAllocations);

  const steps = [
    { label: "Branch details & location", done: hasDetails, required: true },
    ...(noService ? [] : [
      { label: "Operational Services", done: hasServices, required: true },
    ]),
    { label: "Operator Desks", done: hasDesks, required: true },
    { label: "Branch staff accounts", done: hasStaff, required: true },
    ...(noService ? [] : [
      { label: "Desk ↔ Service routing", done: hasAssignments, required: true },
    ]),
    { label: "Queue Methods enabled", done: hasMethods, required: true },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const score = Math.round((doneCount / steps.length) * 100);

  return { score, steps };
}
