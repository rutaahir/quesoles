// Domain types for Quesole. This layer is intentionally backend-agnostic:
// swapping the mock service for a real API means re-implementing
// src/lib/quesole/service.ts only.

export type Role =
  | "super_admin"
  | "company_admin"
  | "branch_admin"
  | "operator"
  | "customer";

export type QueueMethod = 1 | 2 | 3 | 4;

export type PlanTier = "starter" | "standard" | "growth" | "advanced" | "enterprise";

export interface Plan {
  id: PlanTier;
  name: string;
  monthly: number;
  annual: number;
  tagline: string;
  branches: number;
  desks: number;
  maxUsers: number;
  methods: QueueMethod[];
  features: string[];
  recommended?: boolean | undefined;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  city: string;
  plan: PlanTier;
  status: "active" | "pending" | "suspended";
  createdAt: string;
  contact: string;
  email: string;
  address?: string;
  logoUrl?: string;
  tagline?: string;
  supportPhone?: string;
  supportEmail?: string;
  brandColors?: { primary: string };
  branchIds: string[];
  monthlySpend: number;
  slug?: string;
  solution?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  city: string;
  address: string;
  method: QueueMethod;
  enabledMethods?: QueueMethod[];
  openHours: string;
  deskIds: string[];
  serviceIds: string[];
  status?: "active" | "inactive";
  slug?: string;
  geoLat?: number | undefined;
  geoLng?: number | undefined;
  geofenceRadiusMeters?: number | undefined;
  geofenceEnabled?: boolean | undefined;
  kioskPasswordHash?: string | null | undefined;
  kioskIdleTimeoutSeconds?: number | undefined;
  mode?: "SERVICE_BASED" | "NON_SERVICE_BASED";
  channel_type?: "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID";
}

export interface Desk {
  id: string;
  branchId: string;
  label: string;
  serviceIds: string[];
  staffId: string | null;
  status: "open" | "paused" | "offline";
  isActive?: boolean | undefined;
  isOnlineBookingDesk?: boolean;
}

export interface Service {
  id: string;
  branchId: string;
  name: string;
  prefix: string;
  avgMinutes: number;
  isActive?: boolean | undefined;
}

export interface DeskServiceMapping {
  id: string;
  deskId: string;
  serviceId: string;
}

export interface UserServiceMapping {
  id: string;
  userId: string;
  serviceId: string;
}

export interface Staff {
  id: string;
  companyId: string;
  branchId: string;
  name: string;
  email: string;
  role: Exclude<Role, "customer" | "super_admin">;
  status: "online" | "break" | "offline";
  servedToday: number;
  avgHandleMin: number;
  deskId?: string | null | undefined;
}

export type TicketStatus = "waiting" | "called" | "serving" | "served" | "skipped" | "hold";

export interface Ticket {
  id: string;
  branchId: string;
  serviceId: string;
  deskId: string | null;
  predictedDeskId?: string | null | undefined;
  number: string;
  customerName: string;
  contact: string;
  customerEmail?: string | null | undefined;
  channel?: "qr" | "kiosk" | "remote" | "sms" | "whatsapp" | "onscreen" | undefined;
  method?: string | number | undefined;
  note?: string | undefined;
  status: TicketStatus;
  joinedAt: number;
  calledAt?: number | undefined;
  servedAt?: number | undefined;
  distanceAtCheckinMeters?: number;
}

export interface Appointment {
  id: string;
  branchId: string;
  serviceId: string;
  customerName: string;
  contact: string;
  date: string;
  slot: string;
  status: "confirmed" | "cancelled" | "completed";
  code: string;
}

export interface AlertRule {
  id: string;
  companyId: string;
  name: string;
  metric: "wait_time" | "queue_length" | "no_operator" | "device_offline" | "sla_breach";
  threshold: number;
  channel: "in_app" | "email" | "sms";
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  branchId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  at: number;
  read: boolean;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: number;
}

export interface UpgradeRequest {
  id: string;
  companyId: string;
  from: PlanTier;
  to: PlanTier;
  requestedAt: string;
  status: "open" | "approved" | "declined";
}

export interface NotificationItem {
  id: string;
  userId?: string;
  title: string;
  message: string;
  at: number;
  read: boolean;
  type?: "alert" | "system" | "upgrade" | "ticket";
  branchId?: string;
}

export interface ReportSnapshot {
  id: string;
  companyId: string;
  branchId?: string;
  timestamp: number;
  date: string;
  waitingCount: number;
  servedCount: number;
  avgWaitMinutes: number;
}

export interface PlanComponent {
  id: string;
  key: string;
  label: string;
  description: string;
  unit_label: string;
  default_included_qty: number;
  price_per_unit: number;
  is_toggle: boolean;
  min_qty: number;
  max_qty: number | null;
  is_active: boolean;
  is_mandatory?: boolean;
  category: "SOLUTION_TYPE" | "SERVICE" | "OPERATOR_DESK" | "KIOSK" | "TOKEN_DELIVERY" | "ADDON" | "BRANCH_SETUP";
  branch_mode_scope: "SERVICE_BASED" | "NON_SERVICE_BASED" | "BOTH" | "N_A";
  pricing_type: "PER_UNIT" | "FLAT" | "TOGGLE_FREE" | "TOGGLE_PAID";
  max_qty_per_branch: number | null;
  is_addon_only: boolean;
  display_order: number;
  icon_key: string;
}

export interface CompanyPlanAllocation {
  id: string;
  companyId: string;
  plan_component_id: string;
  component_key: string;
  component_label: string;
  component_unit_label: string;
  is_toggle: boolean;
  description: string;
  min_qty: number;
  max_qty: number | null;
  purchased_qty: number;
  unit_price_at_purchase: number;
  branch_id?: string | null;
}

export interface PlanPurchaseLineItem {
  component_key: string;
  component_label: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PlanPurchase {
  id: string;
  companyId: string;
  type: "initial_registration" | "add_on";
  line_items: PlanPurchaseLineItem[];
  total_amount: number;
  payment_status: "pending" | "paid" | "failed";
  payment_reference: string;
  created_at?: string;
}

export interface Session {
  role: Role;
  name: string;
  email: string;
  companyId: string;
  branchId: string;
  deskId: string;
}

export interface QueueSolutionType {
  id: string;
  key: string;
  label: string;
  description: string;
  icon_key: string;
  is_active: boolean;
  display_order: number;
}

export interface TokenDeliveryMethod {
  id: string;
  key: string;
  label: string;
  price_per_branch: number | null;
  is_active: boolean;
  requires_hardware: boolean;
  display_order: number;
}

export interface SubscriptionDurationTier {
  id: string;
  months: number;
  discount_percent: number;
  is_active: boolean;
  display_order: number;
}

export interface PriceChangeLog {
  id: string;
  plan_component: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  changed_by_email?: string;
  component_label?: string;
  component_key?: string;
  changed_at: string;
}

export interface Kiosk {
  id: string;
  company: number;
  branch: number;
  kiosk_identifier: string;
  pin: string;
  status: "active" | "inactive";
  session_token: string | null;
  connected_at: string | null;
  last_seen: string | null;
  is_logged_in: boolean;
  created_at: string;
  updated_at: string;
}
