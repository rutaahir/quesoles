import type {
  Appointment,
  AlertEvent,
  AlertRule,
  AuditEntry,
  Branch,
  Company,
  Desk,
  Plan,
  Service,
  Staff,
  Ticket,
  UpgradeRequest,
} from "./types";

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 3900,
    annual: 39000,
    tagline: "One branch, one clean queue.",
    branches: 1,
    desks: 3,
    maxUsers: 2,
    methods: [1],
    features: [
      "QR walk-in queue",
      "1 branch, 3 desks",
      "Live customer token page",
      "Daily operations report",
      "Email support",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    monthly: 9900,
    annual: 99000,
    tagline: "Multi-desk service routing across your branches.",
    branches: 3,
    desks: 15,
    maxUsers: 5,
    methods: [1, 2],
    features: [
      "Everything in Starter",
      "Service-based multi-desk routing",
      "Up to 3 branches, 15 desks",
      "Alert rules & notification center",
      "Priority support",
    ],
    recommended: true,
  },
  {
    id: "advanced",
    name: "Advanced",
    monthly: 17900,
    annual: 179000,
    tagline: "Display boards, analytics and expanded capacity.",
    branches: 10,
    desks: 50,
    maxUsers: 20,
    methods: [1, 2, 3],
    features: [
      "Everything in Standard",
      "Now Serving display boards",
      "Branch comparison analytics",
      "Up to 10 branches, 50 desks",
      "Dedicated support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 24900,
    annual: 249000,
    tagline: "Nationwide operations, appointments and command centre.",
    branches: 999,
    desks: 999,
    maxUsers: 999,
    methods: [1, 2, 3, 4],
    features: [
      "Everything in Advanced",
      "Remote appointment booking + OTP",
      "Unlimited branches & desks",
      "Custom SLA & escalation matrix",
      "White-label branding",
      "Dedicated success manager",
    ],
  },
];

export const companies: Company[] = [
  {
    id: "c_apollo",
    name: "Apollo Care Center",
    industry: "Healthcare",
    city: "Ahmedabad",
    plan: "enterprise",
    status: "active",
    createdAt: "2025-02-11",
    contact: "Rhea Mehta",
    email: "rhea.mehta@apollocare.in",
    branchIds: ["b_amd_central", "b_surat_hub", "b_mumbai_west"],
    monthlySpend: 24900,
  },
  {
    id: "c_axis",
    name: "Axis Business Center",
    industry: "Banking",
    city: "Mumbai",
    plan: "growth",
    status: "active",
    createdAt: "2025-05-03",
    contact: "Nikhil Bansal",
    email: "nikhil@axisbusiness.in",
    branchIds: ["b_axis_bkc", "b_axis_rajkot"],
    monthlySpend: 9900,
  },
  {
    id: "c_citycare",
    name: "CityCare Hospital",
    industry: "Healthcare",
    city: "Delhi",
    plan: "growth",
    status: "pending",
    createdAt: "2026-08-09",
    contact: "Dr. Ananya Rao",
    email: "ananya.rao@citycare.org",
    branchIds: [],
    monthlySpend: 0,
  },
  {
    id: "c_meridian",
    name: "Meridian Telecom Services",
    industry: "Telecom",
    city: "Pune",
    plan: "starter",
    status: "pending",
    createdAt: "2026-08-12",
    contact: "Farhan Qureshi",
    email: "farhan@meridiantel.com",
    branchIds: [],
    monthlySpend: 0,
  },
  {
    id: "c_sunview",
    name: "Sunview Passport Seva Kendra",
    industry: "Government",
    city: "Rajkot",
    plan: "growth",
    status: "active",
    createdAt: "2025-09-21",
    contact: "Meera Joshi",
    email: "meera.joshi@sunviewpsk.gov.in",
    branchIds: ["b_sunview_rjt"],
    monthlySpend: 9900,
  },
];

export const branches: Branch[] = [
  {
    id: "b_amd_central",
    companyId: "c_apollo",
    name: "Ahmedabad Central Branch",
    city: "Ahmedabad",
    address: "Nehru Bridge Corner, Ashram Road, Ahmedabad 380009",
    method: 3,
    openHours: "08:00 – 21:00",
    deskIds: ["d_amd_1", "d_amd_2", "d_amd_3", "d_amd_4"],
    serviceIds: ["s_amd_opd", "s_amd_lab", "s_amd_pharm", "s_amd_billing"],
  },
  {
    id: "b_surat_hub",
    companyId: "c_apollo",
    name: "Surat Customer Service Hub",
    city: "Surat",
    address: "Ring Road, Udhna Darwaja, Surat 395002",
    method: 2,
    openHours: "09:00 – 20:00",
    deskIds: ["d_srt_1", "d_srt_2", "d_srt_3"],
    serviceIds: ["s_srt_opd", "s_srt_lab", "s_srt_billing"],
  },
  {
    id: "b_mumbai_west",
    companyId: "c_apollo",
    name: "Mumbai West Diagnostics",
    city: "Mumbai",
    address: "Linking Road, Bandra West, Mumbai 400050",
    method: 4,
    openHours: "07:30 – 19:30",
    deskIds: ["d_mum_1", "d_mum_2"],
    serviceIds: ["s_mum_scan", "s_mum_lab"],
  },
  {
    id: "b_axis_bkc",
    companyId: "c_axis",
    name: "BKC Corporate Branch",
    city: "Mumbai",
    address: "G Block, Bandra Kurla Complex, Mumbai 400051",
    method: 2,
    openHours: "09:30 – 18:00",
    deskIds: ["d_bkc_1", "d_bkc_2", "d_bkc_3"],
    serviceIds: ["s_bkc_account", "s_bkc_loan", "s_bkc_cash"],
  },
  {
    id: "b_axis_rajkot",
    companyId: "c_axis",
    name: "Rajkot City Branch",
    city: "Rajkot",
    address: "Kalawad Road, Rajkot 360005",
    method: 1,
    openHours: "10:00 – 17:00",
    deskIds: ["d_rjt_1", "d_rjt_2"],
    serviceIds: ["s_rjt_general"],
  },
  {
    id: "b_sunview_rjt",
    companyId: "c_sunview",
    name: "Sunview Seva Kendra",
    city: "Rajkot",
    address: "Sector 4, Rajkot 360001",
    method: 3,
    openHours: "09:00 – 16:00",
    deskIds: ["d_svw_1", "d_svw_2", "d_svw_3"],
    serviceIds: ["s_svw_new", "s_svw_renew", "s_svw_verify"],
  },
];

export const services: Service[] = [
  { id: "s_amd_opd", branchId: "b_amd_central", name: "OPD Consultation", prefix: "A", avgMinutes: 9 },
  { id: "s_amd_lab", branchId: "b_amd_central", name: "Lab Sample Collection", prefix: "L", avgMinutes: 5 },
  { id: "s_amd_pharm", branchId: "b_amd_central", name: "Pharmacy Pickup", prefix: "P", avgMinutes: 4 },
  { id: "s_amd_billing", branchId: "b_amd_central", name: "Billing & Insurance", prefix: "B", avgMinutes: 11 },
  { id: "s_srt_opd", branchId: "b_surat_hub", name: "OPD Consultation", prefix: "A", avgMinutes: 10 },
  { id: "s_srt_lab", branchId: "b_surat_hub", name: "Diagnostics", prefix: "D", avgMinutes: 7 },
  { id: "s_srt_billing", branchId: "b_surat_hub", name: "Billing Desk", prefix: "B", avgMinutes: 8 },
  { id: "s_mum_scan", branchId: "b_mumbai_west", name: "MRI / CT Scan", prefix: "M", avgMinutes: 22 },
  { id: "s_mum_lab", branchId: "b_mumbai_west", name: "Pathology", prefix: "L", avgMinutes: 6 },
  { id: "s_bkc_account", branchId: "b_axis_bkc", name: "Account Services", prefix: "A", avgMinutes: 12 },
  { id: "s_bkc_loan", branchId: "b_axis_bkc", name: "Loans & Advisory", prefix: "L", avgMinutes: 18 },
  { id: "s_bkc_cash", branchId: "b_axis_bkc", name: "Cash & Deposits", prefix: "C", avgMinutes: 5 },
  { id: "s_rjt_general", branchId: "b_axis_rajkot", name: "General Banking", prefix: "G", avgMinutes: 9 },
  { id: "s_svw_new", branchId: "b_sunview_rjt", name: "New Application", prefix: "N", avgMinutes: 14 },
  { id: "s_svw_renew", branchId: "b_sunview_rjt", name: "Renewal", prefix: "R", avgMinutes: 8 },
  { id: "s_svw_verify", branchId: "b_sunview_rjt", name: "Document Verification", prefix: "V", avgMinutes: 6 },
];

export const staff: Staff[] = [
  { id: "st_1", companyId: "c_apollo", branchId: "b_amd_central", name: "Kavya Trivedi", email: "kavya.t@apollocare.in", role: "operator", status: "online", servedToday: 41, avgHandleMin: 7.4 },
  { id: "st_2", companyId: "c_apollo", branchId: "b_amd_central", name: "Aarav Shah", email: "aarav.s@apollocare.in", role: "operator", status: "online", servedToday: 38, avgHandleMin: 8.1 },
  { id: "st_3", companyId: "c_apollo", branchId: "b_amd_central", name: "Ishita Nair", email: "ishita.n@apollocare.in", role: "operator", status: "break", servedToday: 26, avgHandleMin: 6.9 },
  { id: "st_4", companyId: "c_apollo", branchId: "b_amd_central", name: "Devansh Patel", email: "devansh.p@apollocare.in", role: "branch_admin", status: "online", servedToday: 0, avgHandleMin: 0 },
  { id: "st_5", companyId: "c_apollo", branchId: "b_surat_hub", name: "Riya Desai", email: "riya.d@apollocare.in", role: "operator", status: "online", servedToday: 33, avgHandleMin: 9.2 },
  { id: "st_6", companyId: "c_apollo", branchId: "b_surat_hub", name: "Manav Chauhan", email: "manav.c@apollocare.in", role: "operator", status: "offline", servedToday: 12, avgHandleMin: 10.4 },
  { id: "st_7", companyId: "c_apollo", branchId: "b_mumbai_west", name: "Sana Kapadia", email: "sana.k@apollocare.in", role: "branch_admin", status: "online", servedToday: 0, avgHandleMin: 0 },
  { id: "st_8", companyId: "c_axis", branchId: "b_axis_bkc", name: "Rohan Iyer", email: "rohan.iyer@axisbusiness.in", role: "operator", status: "online", servedToday: 29, avgHandleMin: 11.8 },
  { id: "st_9", companyId: "c_axis", branchId: "b_axis_bkc", name: "Tanvi Ghosh", email: "tanvi.g@axisbusiness.in", role: "operator", status: "online", servedToday: 24, avgHandleMin: 12.6 },
  { id: "st_10", companyId: "c_sunview", branchId: "b_sunview_rjt", name: "Harshil Vyas", email: "harshil.v@sunviewpsk.gov.in", role: "operator", status: "online", servedToday: 47, avgHandleMin: 5.8 },
];

export const desks: Desk[] = [
  { id: "d_amd_1", branchId: "b_amd_central", label: "Counter 01", serviceIds: ["s_amd_opd"], staffId: "st_1", status: "open" },
  { id: "d_amd_2", branchId: "b_amd_central", label: "Counter 02", serviceIds: ["s_amd_lab", "s_amd_pharm"], staffId: "st_2", status: "open" },
  { id: "d_amd_3", branchId: "b_amd_central", label: "Counter 03", serviceIds: ["s_amd_billing"], staffId: "st_3", status: "paused" },
  { id: "d_amd_4", branchId: "b_amd_central", label: "Counter 04", serviceIds: ["s_amd_opd", "s_amd_billing"], staffId: null, status: "offline" },
  { id: "d_srt_1", branchId: "b_surat_hub", label: "Desk A", serviceIds: ["s_srt_opd"], staffId: "st_5", status: "open" },
  { id: "d_srt_2", branchId: "b_surat_hub", label: "Desk B", serviceIds: ["s_srt_lab"], staffId: "st_6", status: "offline" },
  { id: "d_srt_3", branchId: "b_surat_hub", label: "Desk C", serviceIds: ["s_srt_billing"], staffId: null, status: "open" },
  { id: "d_mum_1", branchId: "b_mumbai_west", label: "Scan Suite 1", serviceIds: ["s_mum_scan"], staffId: null, status: "open" },
  { id: "d_mum_2", branchId: "b_mumbai_west", label: "Pathology Desk", serviceIds: ["s_mum_lab"], staffId: null, status: "open" },
  { id: "d_bkc_1", branchId: "b_axis_bkc", label: "Counter 01", serviceIds: ["s_bkc_account"], staffId: "st_8", status: "open" },
  { id: "d_bkc_2", branchId: "b_axis_bkc", label: "Counter 02", serviceIds: ["s_bkc_loan"], staffId: "st_9", status: "open" },
  { id: "d_bkc_3", branchId: "b_axis_bkc", label: "Counter 03", serviceIds: ["s_bkc_cash"], staffId: null, status: "paused" },
  { id: "d_rjt_1", branchId: "b_axis_rajkot", label: "Counter 01", serviceIds: ["s_rjt_general"], staffId: null, status: "open" },
  { id: "d_rjt_2", branchId: "b_axis_rajkot", label: "Counter 02", serviceIds: ["s_rjt_general"], staffId: null, status: "open" },
  { id: "d_svw_1", branchId: "b_sunview_rjt", label: "Window 1", serviceIds: ["s_svw_new"], staffId: "st_10", status: "open" },
  { id: "d_svw_2", branchId: "b_sunview_rjt", label: "Window 2", serviceIds: ["s_svw_renew"], staffId: null, status: "open" },
  { id: "d_svw_3", branchId: "b_sunview_rjt", label: "Window 3", serviceIds: ["s_svw_verify"], staffId: null, status: "open" },
];

const CUSTOMERS = [
  "Priya Raval", "Jatin Solanki", "Neha Kulkarni", "Imran Shaikh", "Ritika Bose",
  "Vivek Menon", "Sneha Pillai", "Arjun Thakkar", "Fatima Ansari", "Karan Malhotra",
  "Divya Sethi", "Yash Panchal", "Anjali Verma", "Suresh Bhatt", "Nandini Rao",
  "Zoya Merchant", "Parth Gandhi", "Leena D'Souza", "Rahul Chandra", "Megha Shukla",
];

let seq = 0;
export function nextId(prefix: string) {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`;
}

export function pickCustomer(i: number): string {
  return CUSTOMERS[i % CUSTOMERS.length] ?? "Guest Customer";
}

export function seedTickets(now: number): Ticket[] {
  const out: Ticket[] = [];
  let i = 0;
  const config: Array<[string, string, number, number]> = [
    ["b_amd_central", "s_amd_opd", 104, 9],
    ["b_amd_central", "s_amd_lab", 42, 5],
    ["b_amd_central", "s_amd_pharm", 18, 3],
    ["b_amd_central", "s_amd_billing", 27, 4],
    ["b_surat_hub", "s_srt_opd", 61, 6],
    ["b_surat_hub", "s_srt_lab", 22, 3],
    ["b_surat_hub", "s_srt_billing", 15, 2],
    ["b_mumbai_west", "s_mum_scan", 11, 2],
    ["b_mumbai_west", "s_mum_lab", 33, 4],
    ["b_axis_bkc", "s_bkc_account", 55, 5],
    ["b_axis_bkc", "s_bkc_loan", 12, 3],
    ["b_axis_bkc", "s_bkc_cash", 78, 6],
    ["b_axis_rajkot", "s_rjt_general", 24, 4],
    ["b_sunview_rjt", "s_svw_new", 91, 7],
    ["b_sunview_rjt", "s_svw_renew", 44, 5],
    ["b_sunview_rjt", "s_svw_verify", 30, 3],
  ];

  for (const [branchId, serviceId, start, waiting] of config) {
    const svc = services.find((s) => s.id === serviceId)!;
    const desk = desks.find((d) => d.branchId === branchId && d.serviceIds.includes(serviceId));

    // served history
    for (let k = 6; k > 0; k--) {
      i++;
      out.push({
        id: nextId("t"),
        branchId,
        serviceId,
        deskId: desk?.id ?? null,
        number: `${svc.prefix}${start - k}`,
        customerName: pickCustomer(i),
        contact: `+91 9${(700000000 + i * 13457).toString().slice(0, 9)}`,
        status: "served",
        joinedAt: now - (k + 8) * 6 * 60_000,
        calledAt: now - (k + 4) * 6 * 60_000,
        servedAt: now - k * 6 * 60_000,
      });
    }

    // currently serving
    i++;
    out.push({
      id: nextId("t"),
      branchId,
      serviceId,
      deskId: desk?.id ?? null,
      number: `${svc.prefix}${start}`,
      customerName: pickCustomer(i),
      contact: `+91 9${(700000000 + i * 13457).toString().slice(0, 9)}`,
      status: "serving",
      joinedAt: now - 14 * 60_000,
      calledAt: now - 3 * 60_000,
    });

    // waiting line
    for (let k = 1; k <= waiting; k++) {
      i++;
      out.push({
        id: nextId("t"),
        branchId,
        serviceId,
        deskId: null,
        number: `${svc.prefix}${start + k}`,
        customerName: pickCustomer(i),
        contact: `+91 9${(700000000 + i * 13457).toString().slice(0, 9)}`,
        status: "waiting",
        joinedAt: now - (waiting - k) * 90_000,
      });
    }
  }
  return out;
}

export const SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM",
];

export function seedAppointments(): Appointment[] {
  return [
    { id: "ap_1", branchId: "b_mumbai_west", serviceId: "s_mum_scan", customerName: "Rhea Kapoor", contact: "+91 98204 11233", date: "2026-08-15", slot: "10:30 AM", status: "confirmed", code: "QS-4821" },
    { id: "ap_2", branchId: "b_mumbai_west", serviceId: "s_mum_lab", customerName: "Aditya Bhandari", contact: "+91 99303 55418", date: "2026-08-15", slot: "11:00 AM", status: "confirmed", code: "QS-4822" },
    { id: "ap_3", branchId: "b_mumbai_west", serviceId: "s_mum_scan", customerName: "Sara Lobo", contact: "+91 90045 77219", date: "2026-08-16", slot: "09:30 AM", status: "confirmed", code: "QS-4830" },
    { id: "ap_4", branchId: "b_amd_central", serviceId: "s_amd_opd", customerName: "Kunal Dave", contact: "+91 97129 33018", date: "2026-08-15", slot: "03:00 PM", status: "completed", code: "QS-4790" },
  ];
}

export const alertRules: AlertRule[] = [
  { id: "ar_1", companyId: "c_apollo", name: "Wait time above 15 minutes", metric: "wait_time", threshold: 15, channel: "in_app", enabled: true },
  { id: "ar_2", companyId: "c_apollo", name: "Queue longer than 20 people", metric: "queue_length", threshold: 20, channel: "email", enabled: true },
  { id: "ar_3", companyId: "c_apollo", name: "No operator online at a desk", metric: "no_operator", threshold: 1, channel: "in_app", enabled: true },
  { id: "ar_4", companyId: "c_apollo", name: "Display device offline > 5 min", metric: "device_offline", threshold: 5, channel: "sms", enabled: false },
];

export function seedAlerts(now: number): AlertEvent[] {
  return [
    { id: "ae_1", branchId: "b_amd_central", severity: "warning", title: "Wait time exceeded 15 min", detail: "Billing & Insurance queue is averaging 17m 20s.", at: now - 4 * 60_000, read: false },
    { id: "ae_2", branchId: "b_surat_hub", severity: "critical", title: "No operator at Desk B", detail: "Diagnostics has 3 waiting customers and no operator online.", at: now - 11 * 60_000, read: false },
    { id: "ae_3", branchId: "b_sunview_rjt", severity: "info", title: "Peak hour started", detail: "Window 1 crossed 12 tickets in the last 30 minutes.", at: now - 26 * 60_000, read: true },
  ];
}

export const auditLog: AuditEntry[] = [
  { id: "au_1", actor: "platform@quesole.com", action: "Approved company", target: "Sunview Passport Seva Kendra", at: Date.now() - 3 * 3600_000 },
  { id: "au_2", actor: "rhea.mehta@apollocare.in", action: "Added branch", target: "Mumbai West Diagnostics", at: Date.now() - 9 * 3600_000 },
  { id: "au_3", actor: "devansh.p@apollocare.in", action: "Changed queue method", target: "Ahmedabad Central Branch → Method 3", at: Date.now() - 26 * 3600_000 },
  { id: "au_4", actor: "platform@quesole.com", action: "Updated plan", target: "Growth — desk limit 40", at: Date.now() - 52 * 3600_000 },
  { id: "au_5", actor: "nikhil@axisbusiness.in", action: "Invited staff", target: "tanvi.g@axisbusiness.in", at: Date.now() - 74 * 3600_000 },
];

export const upgradeRequests: UpgradeRequest[] = [
  { id: "ur_1", companyId: "c_axis", from: "growth", to: "enterprise", requestedAt: "2026-08-13", status: "open" },
  { id: "ur_2", companyId: "c_sunview", from: "growth", to: "enterprise", requestedAt: "2026-08-11", status: "open" },
];

export const HOURLY_VOLUME = [
  { hour: "08", tickets: 42, wait: 4.2 },
  { hour: "09", tickets: 88, wait: 6.1 },
  { hour: "10", tickets: 134, wait: 9.4 },
  { hour: "11", tickets: 176, wait: 12.8 },
  { hour: "12", tickets: 152, wait: 11.2 },
  { hour: "13", tickets: 96, wait: 7.0 },
  { hour: "14", tickets: 121, wait: 8.6 },
  { hour: "15", tickets: 168, wait: 13.5 },
  { hour: "16", tickets: 149, wait: 10.9 },
  { hour: "17", tickets: 103, wait: 7.7 },
  { hour: "18", tickets: 71, wait: 5.4 },
  { hour: "19", tickets: 38, wait: 3.6 },
];

export const WEEKLY_TREND = [
  { day: "Mon", served: 812, appointments: 143, noShow: 21 },
  { day: "Tue", served: 934, appointments: 168, noShow: 18 },
  { day: "Wed", served: 1021, appointments: 181, noShow: 26 },
  { day: "Thu", served: 968, appointments: 172, noShow: 15 },
  { day: "Fri", served: 1187, appointments: 203, noShow: 31 },
  { day: "Sat", served: 1342, appointments: 227, noShow: 40 },
  { day: "Sun", served: 486, appointments: 74, noShow: 9 },
];
