import { useState, useEffect, useMemo } from "react";
import {
  Check, CheckCircle2, ArrowRight, Minus, Plus, Loader2, Printer, Info,
  ShieldAlert, ChevronDown, ChevronUp, Sparkles, Monitor, Globe, User,
  Building, Settings, FileText, CheckSquare, MessageSquare, PhoneCall, Mail,
  CreditCard, ExternalLink, ShieldCheck, Heart, Download
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuesole } from "@/lib/quesole/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface BillingPlanConfiguratorProps {
  mode: "registration" | "view" | "upgrade";
  initialData?: any;
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  initialStep?: number;
}

export function BillingPlanConfigurator({
  mode: propMode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: propIsSubmitting,
  initialStep,
}: BillingPlanConfiguratorProps) {
  const { state } = useQuesole();
  const [isEditMode, setIsEditMode] = useState(propMode !== "view");
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);
  const [step, setStep] = useState(initialStep ?? 1);

  useEffect(() => {
    if (initialStep !== undefined) {
      setStep(initialStep);
    }
  }, [initialStep]);

  // 1. Fetch config dynamically
  const [billingConfig, setBillingConfig] = useState<any | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/billing/config/`);
        if (res.ok) {
          const data = await res.json();
          setBillingConfig(data);
        }
      } catch (err) {
        console.error("Failed to fetch billing config", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    fetchConfig();
  }, []);

  // fallback/default config values derived from store state
  const config = useMemo(() => {
    if (billingConfig) return billingConfig;
    const compsByCategory: Record<string, any[]> = {};
    state.planComponents.forEach((pc) => {
      const cat = pc.category || "ADDON";
      if (!compsByCategory[cat]) {
        compsByCategory[cat] = [];
      }
      compsByCategory[cat].push(pc);
    });

    return {
      solution_types: state.solutionTypes,
      components: compsByCategory,
      token_delivery_methods: state.tokenDeliveryMethods,
      duration_tiers: state.durationTiers,
      gst_percent: 18.0
    };
  }, [billingConfig, state]);

  // Current company plan parameters
  const currentCompany = useMemo(() => {
    if (state.companies.length > 0) {
      return state.companies[0]; // Active company
    }
    return null;
  }, [state.companies]);

  // Current purchased limits (price locking constraints)
  const currentAllocations = useMemo(() => {
    const allocs: Record<string, number> = {
      branches: 1,
      operator_screens: 3,
      services: 0,
      paper_roll_screens: 1,
      printed_qr: 0,
    };
    state.companyAllocations.forEach((a) => {
      allocs[a.component_key] = a.purchased_qty;
    });
    return allocs;
  }, [state.companyAllocations]);

  // Pricing definitions from config
  const componentPrices = useMemo(() => {
    const prices: Record<string, any> = {};
    Object.values(config.components || {}).forEach((list: any) => {
      list.forEach((c: any) => {
        prices[c.key] = c;
      });
    });
    return prices;
  }, [config.components]);

  const getFreeClarityLabel = (key: string, qty: number) => {
    const comp = componentPrices[key];
    if (!comp) return "";
    const freeQty = comp.default_included_qty || 0;
    const price = Number(comp.price_per_unit);

    if (freeQty === 0) {
      if (comp.pricing_type === "FLAT") {
        return `₹${price.toLocaleString("en-IN")} flat`;
      }
      return `₹${price.toLocaleString("en-IN")}/mo each`;
    }

    if (qty <= freeQty) {
      return `${qty} of ${freeQty} free`;
    } else {
      const extra = qty - freeQty;
      return `${freeQty} free + ${extra} extra (+₹${(extra * price).toLocaleString("en-IN")}/mo)`;
    }
  };

  const getComponentPriceLabelText = (key: string) => {
    const comp = state.planComponents.find((c) => c.key === key);
    if (!comp) {
      if (key === "services") return "₹800/mo per service";
      if (key === "operator_screens") return "₹1,200/mo per seat";
      if (key === "paper_roll_screens") return "₹1,500/mo per Kiosk screen";
      if (key === "printed_qr") return "₹990/mo flat";
      return "";
    }
    const price = Number(comp.price_per_unit);
    const label = comp.unit_label || "unit";
    if (comp.pricing_type === "FLAT") {
      return `₹${price.toLocaleString("en-IN")}/mo flat`;
    }
    return `₹${price.toLocaleString("en-IN")}/mo per ${label}`;
  };

  // 2. Form state variables
  const [selectedSolution, setSelectedSolution] = useState<string>(() => {
    return initialData?.solution || "ONSITE_ONLINE";
  });

  const [branchesCount, setBranchesCount] = useState<number>(() => {
    return initialData?.branchesCount || currentAllocations["branches"] || 1;
  });

  const [durationMonths, setDurationMonths] = useState<number>(() => {
    return initialData?.durationMonths || 1;
  });

  // Master module enablement toggles
  const [onlineModuleEnabled, setOnlineModuleEnabled] = useState(() => {
    if (propMode === "registration") {
      const sol = initialData?.solution || "ONSITE_ONLINE";
      return sol === "ONLINE_ONLY" || sol === "ONSITE_ONLINE";
    }
    return true;
  });
  const [onsiteModuleEnabled, setOnsiteModuleEnabled] = useState(() => {
    if (propMode === "registration") {
      const sol = initialData?.solution || "ONSITE_ONLINE";
      return sol === "ONSITE_ONLY" || sol === "ONSITE_ONLINE";
    }
    return true;
  });

  // Online customizer parameters
  const [logoUrl, setLogoUrl] = useState("");
  const [portalName, setPortalName] = useState(() => {
    return initialData?.companyName || "";
  });
  const [primaryColor, setPrimaryColor] = useState("#7C3AED");
  const [displayAddress, setDisplayAddress] = useState(() => {
    return initialData?.locationAddress || "";
  });
  const [enabledCustomerFields, setEnabledCustomerFields] = useState<string[]>(["name", "email", "phone"]);
  const [enabledBookingFields, setEnabledBookingFields] = useState<string[]>(["date_slot", "message"]);
  const [enabledNotificationChannels, setEnabledNotificationChannels] = useState<string[]>(["email"]);

  // Global addons selections
  const [companyAddons, setCompanyAddons] = useState<Record<string, number>>(() => {
    if (initialData?.companyAddons) {
      return initialData.companyAddons;
    }
    return {
      whatsapp_integration: 0,
    };
  });

  // Modal prompts
  const [showHybridPromptModal, setShowHybridPromptModal] = useState(false);
  const [activeBranchToToggle, setActiveBranchToToggle] = useState<number | null>(null);

  // Per-branch configurations state
  const [branches, setBranches] = useState<any[]>(() => {
    if (initialData?.branches && initialData.branches.length > 0) {
      return initialData.branches.map((b: any) => ({
        ...b,
        serviceQty: b.serviceQty ?? 1,
        operatorQty: b.operatorQty ?? 0,
        kioskQty: b.kioskQty ?? 0,
        tokenDeliverySelections: b.tokenDeliverySelections ?? ["SCREEN_ONLY"],
        activeMethods: b.activeMethods ?? b.enabledMethods?.map(String) ?? (() => {
          const methods: string[] = [];
          if (b.tokenDeliverySelections?.includes("SCREEN_ONLY")) methods.push("1");
          if (b.tokenDeliverySelections?.includes("PRINTED_TOKEN")) methods.push("2");
          if (b.tokenDeliverySelections?.includes("SMS")) methods.push("3");
          if (b.tokenDeliverySelections?.includes("WHATSAPP")) methods.push("4");
          return methods.length > 0 ? methods : ["1"];
        })(),
        serviceAssignments: b.serviceAssignments ?? {},
        addons: b.addons ?? { operator_screens: 0, paper_roll_screens: 0, services: 0, printed_qr: 0 }
      }));
    }
    // Seed default branch list
    return Array.from({ length: 15 }, (_, i) => ({
      name: i === 0 ? "Head Office" : `Branch ${i + 1}`,
      mode: "NON_SERVICE_BASED" as "SERVICE_BASED" | "NON_SERVICE_BASED",
      channel_type: "ONSITE_ONLY" as "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID",
      serviceQty: 1,
      operatorQty: 0,
      kioskQty: 0,
      tokenDeliverySelections: ["SCREEN_ONLY"],
      activeMethods: ["1"],
      serviceAssignments: {},
      addons: {
        operator_screens: 0,
        paper_roll_screens: 0,
        services: 0,
        printed_qr: 0,
      },
    }));
  });

  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [showApplyAllModal, setShowApplyAllModal] = useState<boolean>(false);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);

  const [companySlug, setCompanySlug] = useState("");
  const [slugLoading, setSlugLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Initialize slug from company name when Step 2 loads
  useEffect(() => {
    if (!companySlug) {
      const initialName = currentCompany?.name || initialData?.companyName || "";
      const baseSlug = initialName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setCompanySlug(baseSlug);
    }
  }, [currentCompany, initialData, companySlug]);

  // Debounced check slug
  useEffect(() => {
    if (!companySlug) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    const checkAvailability = async () => {
      if (currentCompany?.slug && companySlug === currentCompany.slug) {
        setSlugAvailable(true);
        setSlugLoading(false);
        return;
      }
      setSlugLoading(true);
      setSlugError(null);
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/companies/check-slug/?slug=${companySlug}`);
        const data = await res.json();
        if (res.ok) {
          setSlugAvailable(data.available);
          if (!data.available) {
            setSlugError("This company URL slug is already taken.");
          }
        } else {
          setSlugAvailable(false);
          setSlugError(data.error || "Invalid slug format.");
        }
      } catch (err) {
        setSlugAvailable(false);
        setSlugError("Failed to verify slug availability.");
      } finally {
        setSlugLoading(false);
      }
    };

    const timer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timer);
  }, [companySlug, currentCompany]);

  // Load existing BookingPageConfig if available
  useEffect(() => {
    if (propMode !== "registration" && currentCompany) {
      async function loadBookingConfig() {
        try {
          const res = await fetch(`http://${window.location.hostname}:8000/api/public/company-booking-config/`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("quesole.access_token")}` }
          });
          if (res.ok) {
            const data = await res.json();
            setLogoUrl(data.logo_url || "");
            setPortalName(data.portal_name || "");
            setPrimaryColor(data.primary_color || "#7C3AED");
            setDisplayAddress(data.display_address || "");
            setEnabledCustomerFields(data.enabled_customer_fields || ["name", "email", "phone"]);
            setEnabledBookingFields(data.enabled_booking_fields || ["date_slot", "message"]);
            setEnabledNotificationChannels(data.enabled_notification_channels || ["email"]);
          }
        } catch (e) {
          console.error("Error loading booking config", e);
        }
      }
      loadBookingConfig();
    }
  }, [propMode, currentCompany]);

  // Adjust branch list size to branchesCount
  useEffect(() => {
    if (branches.length < branchesCount) {
      setBranches((prev) => {
        const next = [...prev];
        for (let i = next.length; i < branchesCount; i++) {
          next.push(
            applyToAll
              ? JSON.parse(JSON.stringify(next[0]))
              : {
                  name: `Branch ${i + 1}`,
                  mode: "NON_SERVICE_BASED",
                  channel_type: "ONSITE_ONLY",
                  serviceQty: 1,
                  operatorQty: 0,
                  kioskQty: 0,
                  tokenDeliverySelections: ["SCREEN_ONLY"],
                  activeMethods: ["3"],
                  serviceAssignments: {},
                  addons: {
                    operator_screens: 0,
                    paper_roll_screens: 0,
                    services: 0,
                    printed_qr: 0,
                  },
                }
          );
        }
        return next;
      });
    }
  }, [branchesCount, branches, applyToAll]);

  // Synchronize configs if applyToAll is toggled
  useEffect(() => {
    if (applyToAll && branches.length > 0) {
      const b1 = branches[0];
      const isAlreadySynced = branches.slice(1).every((b) => {
        return b.mode === b1.mode &&
               b.channel_type === b1.channel_type &&
               b.serviceQty === b1.serviceQty &&
               b.operatorQty === b1.operatorQty &&
               b.kioskQty === b1.kioskQty &&
               JSON.stringify(b.tokenDeliverySelections) === JSON.stringify(b1.tokenDeliverySelections) &&
               JSON.stringify(b.addons) === JSON.stringify(b1.addons);
      });
      if (isAlreadySynced) return;

      setBranches((prev) => {
        const b1 = prev[0];
        return prev.map((b, i) => {
          if (i === 0) return b;
          return {
            ...JSON.parse(JSON.stringify(b1)),
            name: b.name, // Keep original branch name
          };
        });
      });
    }
  }, [applyToAll, branches]);

  // Collapsible branch state
  const [collapsedBranchIndex, setCollapsedBranchIndex] = useState<number | null>(null);

  const activeBranchesList = useMemo(() => {
    const activeList = branches.slice(0, branchesCount);
    if (applyToAll && activeList.length > 0) {
      const b1 = activeList[0];
      return activeList.map((b, i) => {
        if (i === 0) return b;
        return {
          ...JSON.parse(JSON.stringify(b1)),
          name: b.name,
        };
      });
    }
    return activeList;
  }, [branches, branchesCount, applyToAll]);

  const hasOnsiteOperations = useMemo(() => {
    return activeBranchesList.some((b) => b.channel_type === "ONSITE_ONLY" || b.channel_type === "HYBRID");
  }, [activeBranchesList]);

  useEffect(() => {
    const firstOnsiteIndex = activeBranchesList.findIndex(
      (b) => b.channel_type !== "ONLINE_ONLY"
    );
    if (firstOnsiteIndex !== -1) {
      const isCurrentActiveValid = activeBranchesList[activeBranchIndex]?.channel_type !== "ONLINE_ONLY";
      if (!isCurrentActiveValid) {
        setActiveBranchIndex(firstOnsiteIndex);
      }
    }
  }, [activeBranchesList, activeBranchIndex]);

  // Compute number of branches in online booking
  const onlineBranchesCount = useMemo(() => {
    return activeBranchesList.filter((b) => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID").length;
  }, [activeBranchesList]);

  // 3. Debounced Quote Calculations via backend API
  const [quote, setQuote] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const quotePayload = useMemo(() => {
    const branchesPayload = activeBranchesList.map((b) => {
      // If master toggles are off, zero out fields
      const isOnline = onlineModuleEnabled && (b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID");
      const isOnsite = onsiteModuleEnabled && (b.channel_type === "ONSITE_ONLY" || b.channel_type === "HYBRID");

      const finalChannel = (isOnline && isOnsite) ? "HYBRID" : isOnline ? "ONLINE_ONLY" : "ONSITE_ONLY";

      const onsiteSelections: string[] = [];
      if (b.activeMethods?.includes("1")) onsiteSelections.push("SCREEN_ONLY");
      if (b.activeMethods?.includes("2")) onsiteSelections.push("PRINTED_TOKEN");
      if (b.activeMethods?.includes("3")) onsiteSelections.push("SMS");
      if (b.activeMethods?.includes("4")) onsiteSelections.push("WHATSAPP");
      const finalSelections = Array.from(new Set(onsiteSelections));

      return {
        name: b.name,
        mode: b.mode,
        channel_type: finalChannel,
        service_qty: isOnsite ? (b.serviceQty + (b.addons["services"] || 0)) : 0,
        operator_qty: isOnsite ? (b.operatorQty + (b.addons["operator_screens"] || 0)) : 0,
        kiosk_qty: isOnsite ? (b.kioskQty + (b.addons["paper_roll_screens"] || 0)) : 0,
        token_delivery_selections: isOnsite ? finalSelections : [],
        active_methods: isOnsite ? (b.activeMethods || ["3"]) : [],
        addons: {
          printed_qr: isOnsite ? (b.addons["printed_qr"] || 0) : 0,
        },
      };
    });

    return {
      duration_months: durationMonths,
      branches: branchesPayload,
      company_addons: companyAddons,
      online_module_enabled: onlineModuleEnabled,
      onsite_module_enabled: onsiteModuleEnabled,
    };
  }, [durationMonths, activeBranchesList, onlineModuleEnabled, onsiteModuleEnabled, companyAddons]);

  const debouncedPayload = useDebounce(quotePayload, 300);

  useEffect(() => {
    async function calculateQuote() {
      setLoadingQuote(true);
      try {
        const res = await fetch(`http://${window.location.hostname}:8000/api/billing/calculate-quote/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(debouncedPayload),
        });
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
          setQuoteError(null);
        } else {
          setQuote(null);
          try {
            const errData = await res.json();
            const messages = [];
            for (const [key, value] of Object.entries(errData)) {
              if (Array.isArray(value)) {
                messages.push(`${key}: ${value.join(", ")}`);
              } else {
                messages.push(`${key}: ${value}`);
              }
            }
            setQuoteError(messages.join("; "));
          } catch (e) {
            setQuoteError("Failed to calculate quote");
          }
        }
      } catch (err) {
        console.error("Quote calculation error", err);
        setQuoteError("Failed to fetch pricing quote due to a network error.");
      } finally {
        setLoadingQuote(false);
      }
    }
    calculateQuote();
  }, [debouncedPayload]);

  // Current allocations pricing snapshot (for upgrade mode comparison)
  const [currentQuote, setCurrentQuote] = useState<any | null>(null);
  useEffect(() => {
    if (propMode === "upgrade" && currentCompany) {
      async function calculateCurrentQuote() {
        try {
          const payload = {
            duration_months: durationMonths,
            branches: Array.from({ length: currentAllocations["branches"] || 1 }).map(() => ({
              mode: "NON_SERVICE_BASED",
              channel_type: "ONSITE_ONLY",
              service_qty: currentAllocations["services"] || 0,
              operator_qty: currentAllocations["operator_screens"] || 3,
              kiosk_qty: currentAllocations["paper_roll_screens"] || 1,
              token_delivery_selections: ["SCREEN_ONLY"],
              addons: {
                printed_qr: currentAllocations["printed_qr"] || 0,
              },
            })),
          };
          const res = await fetch(`http://${window.location.hostname}:8000/api/billing/calculate-quote/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentQuote(data);
          }
        } catch (e) {
          console.error("Current allocations quote error", e);
        }
      }
      calculateCurrentQuote();
    }
  }, [propMode, currentCompany, currentAllocations, durationMonths]);

  // 4. Update handlers
  const syncApplyToAll = (list: any[], editedIndex: number) => {
    if (editedIndex === 0 && applyToAll) {
      const b1 = list[0];
      for (let i = 1; i < list.length; i++) {
        list[i] = {
          ...JSON.parse(JSON.stringify(b1)),
          name: list[i].name,
        };
      }
    } else if (editedIndex > 0 && applyToAll) {
      setApplyToAll(false);
    }
    return list;
  };

  const updateBranchField = (index: number, field: string, value: any) => {
    setBranches((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return syncApplyToAll(next, index);
    });
  };

  const updateBranchAddon = (index: number, key: string, value: number) => {
    setBranches((prev) => {
      const next = [...prev];
      const addons = { ...next[index].addons, [key]: value };
      next[index] = { ...next[index], addons };
      return syncApplyToAll(next, index);
    });
  };

  const toggleDeliveryMethod = (index: number, key: string) => {
    setBranches((prev) => {
      const next = [...prev];
      let selections = [...next[index].tokenDeliverySelections];
      if (selections.includes(key)) {
        if (selections.length > 1) {
          selections = selections.filter((k) => k !== key);
        } else {
          toast.warning("At least one token delivery method is required.");
        }
      } else {
        selections.push(key);
      }
      next[index] = { ...next[index], tokenDeliverySelections: selections };
      return syncApplyToAll(next, index);
    });
  };

  // Toggle branch checkbox in Step 2 Online module
  const toggleOnlineForBranch = (index: number) => {
    const currentType = branches[index].channel_type || "ONSITE_ONLY";
    if (currentType === "ONSITE_ONLY") {
      // Direct enable: transition to HYBRID (since onsite is active by default)
      updateBranchField(index, "channel_type", "HYBRID");
      toast.success(`Online Booking enabled for ${branches[index]?.name}!`);
    } else if (currentType === "HYBRID") {
      // Direct disable online: transition back to ONSITE_ONLY
      updateBranchField(index, "channel_type", "ONSITE_ONLY");
      toast.success(`Online Booking disabled for ${branches[index]?.name}!`);
    } else if (currentType === "ONLINE_ONLY") {
      // Cannot disable both modules
      toast.warning("At least one module (Online or Onsite) must be enabled for each branch.");
    }
  };

  // Save Booking config details
  const saveBookingPageConfig = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/public/company-booking-config/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("quesole.access_token")}`
        },
        body: JSON.stringify({
          logo_url: logoUrl,
          portal_name: portalName,
          primary_color: primaryColor,
          display_address: displayAddress,
          enabled_customer_fields: enabledCustomerFields,
          enabled_booking_fields: enabledBookingFields,
          enabled_notification_channels: enabledNotificationChannels,
        })
      });
      if (res.ok) {
        toast.success("Online booking page branding configurations saved successfully!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save branding customizations.");
    }
  };

  // Submit flows
  const [submitting, setSubmitting] = useState(false);
  const handleUpgradeSubmit = async () => {
    if (!onSubmit) return;

    // Validate service assignments for active branches
    for (const b of activeBranchesList) {
      if (b.mode === "SERVICE_BASED") {
        for (let sIdx = 0; sIdx < b.serviceQty; sIdx++) {
          const assignedDesks = b.serviceAssignments?.[sIdx] || [1];
          if (assignedDesks.length === 0) {
            toast.error(`Service ${sIdx + 1} on ${b.name} has no desks assigned! Please assign at least one desk.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      // Save branding customizer details first
      await saveBookingPageConfig();

      const mappedBranches = activeBranchesList.map((b) => {
        const onsiteSelections: string[] = [];
        if (b.activeMethods?.includes("2")) onsiteSelections.push("PRINTED_TOKEN");
        if (b.activeMethods?.includes("3") || b.activeMethods?.includes("1")) onsiteSelections.push("SCREEN_ONLY");
        const otherSelections = (b.tokenDeliverySelections || []).filter((s: string) => s !== "PRINTED_TOKEN" && s !== "SCREEN_ONLY");
        const finalSelections = Array.from(new Set([...onsiteSelections, ...otherSelections]));

        return {
          name: b.name,
          mode: b.mode,
          channel_type: b.channel_type || "ONSITE_ONLY",
          service_qty: b.serviceQty,
          operator_qty: b.operatorQty,
          kiosk_qty: b.kioskQty,
          token_delivery_selections: finalSelections,
          active_methods: b.activeMethods || ["3"],
          addons: {
            operator_screens: b.addons["operator_screens"] || 0,
            paper_roll_screens: b.addons["paper_roll_screens"] || 0,
            services: b.addons["services"] || 0,
            printed_qr: b.addons["printed_qr"] || 0,
          },
        };
      });
      await onSubmit({
        branches: mappedBranches,
        durationMonths,
        simulateFailure,
        quoteId: quote?.quote_id,
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to process upgrade checkout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrationSubmit = async () => {
    if (!onSubmit) return;

    if (slugLoading) {
      toast.error("Please wait while we verify your company URL slug availability.");
      return;
    }
    if (slugError || slugAvailable === false) {
      toast.error(slugError || "This company URL slug is already taken. Please choose another.");
      return;
    }

    // Validate service assignments for active branches
    for (const b of activeBranchesList) {
      if (b.mode === "SERVICE_BASED") {
        for (let sIdx = 0; sIdx < b.serviceQty; sIdx++) {
          const assignedDesks = b.serviceAssignments?.[sIdx] || [1];
          if (assignedDesks.length === 0) {
            toast.error(`Service ${sIdx + 1} on ${b.name} has no desks assigned! Please assign at least one desk.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    try {
      // Save branding customizer details
      await saveBookingPageConfig();

      const mappedBranches = activeBranchesList.map((b) => {
        const onsiteSelections: string[] = [];
        if (b.activeMethods?.includes("1")) onsiteSelections.push("SCREEN_ONLY");
        if (b.activeMethods?.includes("2")) onsiteSelections.push("PRINTED_TOKEN");
        if (b.activeMethods?.includes("3")) onsiteSelections.push("SMS");
        if (b.activeMethods?.includes("4")) onsiteSelections.push("WHATSAPP");
        const finalSelections = Array.from(new Set(onsiteSelections));

        return {
          name: b.name,
          mode: b.mode,
          channel_type: b.channel_type || "ONSITE_ONLY",
          serviceQty: b.serviceQty,
          operatorQty: b.operatorQty,
          kioskQty: b.kioskQty,
          tokenDeliverySelections: finalSelections,
          activeMethods: b.activeMethods || ["1"],
          active_methods: b.activeMethods || ["1"],
          serviceAssignments: b.serviceAssignments || {},
          addons: b.addons,
        };
      });

      await onSubmit({
        solution: selectedSolution,
        branches: mappedBranches,
        durationMonths,
        simulateFailure,
        totalPrice: quote ? quote.total : 0,
        quote: quote,
        companyAddons: companyAddons,
        portalName,
        logoUrl,
        primaryColor,
        displayAddress,
        enabledCustomerFields,
        enabledBookingFields,
        enabledNotificationChannels,
        companySlug,
        itemizedSelections: {
          branches: branchesCount,
          operator_screens: activeBranchesList.reduce((acc, b) => acc + (b.operatorQty + (b.addons["operator_screens"] || 0)), 0),
          services: activeBranchesList.reduce((acc, b) => acc + (b.serviceQty + (b.addons["services"] || 0)), 0),
          paper_roll_screens: activeBranchesList.reduce((acc, b) => acc + (b.kioskQty + (b.addons["paper_roll_screens"] || 0)), 0),
          printed_qr: activeBranchesList.reduce((acc, b) => acc + (b.addons["printed_qr"] || 0), 0)
        }
      });
    } catch (e: any) {
      toast.error(e.message || "Registration configuration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Client-side PDF Quote generation
  const handleDownloadPDF = () => {
    if (!quote) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to download the quote.");
      return;
    }
    const gstRate = config.gst_percent || 18.0;
    const items = quote.itemized;
    printWindow.document.write(`
      <html>
        <head>
          <title>Quesole Pricing Quote</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 3px solid #7c3aed; padding-bottom: 24px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 28px; font-weight: 800; color: #7c3aed; margin: 0; }
            .subtitle { font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 4px; }
            .metadata { font-size: 13px; text-align: right; color: #64748b; }
            .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-align: left; }
            th, td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .total-table { width: 40%; margin-left: auto; margin-top: 30px; }
            .total-table td { border-bottom: none; padding: 8px 16px; }
            .total-table tr.grand-total td { font-size: 18px; font-weight: bold; color: #7c3aed; border-top: 2px solid #7c3aed; padding-top: 12px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1 class="title">QUESOLE QUEUE PLATFORM</h1>
                <div class="subtitle">Subscription Pricing Proposal</div>
              </div>
              <div class="metadata">
                <div>Quote Date: ${new Date().toLocaleDateString("en-IN")}</div>
                <div>Contract Term: ${durationMonths} Month${durationMonths > 1 ? "s" : ""}</div>
              </div>
            </div>
            
            <p>Dear Customer,</p>
            <p>Thank you for choosing Quesole. Below is the official pricing proposal and itemized cost estimation based on your branch and operator configuration selections:</p>
            
            <div class="section-title">Itemized Pricing Breakdown</div>
            <table>
              <thead>
                <tr>
                  <th>Billing Component</th>
                  <th>Quantity Description</th>
                  <th style="text-align: right;">Cost (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${Number(items.branches_subtotal) > 0 ? `
                  <tr>
                    <td>Branches License Setup</td>
                    <td>${branchesCount} Active Locations</td>
                    <td style="text-align: right;">₹${Number(items.branches_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.online_subtotal) > 0 ? `
                  <tr>
                    <td>Online Booking Module</td>
                    <td>${onlineBranchesCount} Online Branches Enabled</td>
                    <td style="text-align: right;">₹${Number(items.online_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.operators_subtotal) > 0 ? `
                  <tr>
                    <td>Operator Seat Allocations</td>
                    <td>Total Seats Across Locations</td>
                    <td style="text-align: right;">₹${Number(items.operators_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.services_subtotal) > 0 ? `
                  <tr>
                    <td>Service Categories</td>
                    <td>Allocated Service Lines</td>
                    <td style="text-align: right;">₹${Number(items.services_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.kiosks_subtotal) > 0 ? `
                  <tr>
                    <td>Display Screens & Ticketing Kiosks</td>
                    <td>Physical Display Terminals</td>
                    <td style="text-align: right;">₹${Number(items.kiosks_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.qr_subtotal) > 0 ? `
                  <tr>
                    <td>Self-Service QR Code Ticketing</td>
                    <td>Digital Boarding QR Codes</td>
                    <td style="text-align: right;">₹${Number(items.qr_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Number(items.delivery_subtotal) > 0 ? `
                  <tr>
                    <td>Notification Channels</td>
                    <td>SMS / WhatsApp / Alerts Setup</td>
                    <td style="text-align: right;">₹${Number(items.delivery_subtotal).toLocaleString("en-IN")}</td>
                  </tr>` : ""}
                ${Object.entries(companyAddons)
                  .filter(([_, qty]) => qty > 0)
                  .map(([key, qty]) => {
                    const comp = state.planComponents.find((c) => c.key === key);
                    const label = comp?.label || (key === "whatsapp_integration" ? "WhatsApp Integration" : key);
                    const price = comp ? Number(comp.price_per_unit) : (key === "whatsapp_integration" ? 1500 : 0);
                    const cost = qty * price;
                    return `
                      <tr>
                        <td>${label} Addon</td>
                        <td>Global Integration addon</td>
                        <td style="text-align: right;">₹${cost.toLocaleString("en-IN")}</td>
                      </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
            
            <table class="total-table">
              <tr>
                <td>Subtotal Cost:</td>
                <td style="text-align: right;">₹${Number(quote.raw_total).toLocaleString("en-IN")}</td>
              </tr>
              ${quote.discount_percent > 0 ? `
                <tr style="color: #10b981;">
                  <td>Term Discount (${quote.discount_percent}%):</td>
                  <td style="text-align: right;">-₹${Number(quote.discount_amount).toLocaleString("en-IN")}</td>
                </tr>` : ""}
              <tr>
                <td>GST (${gstRate}%):</td>
                <td style="text-align: right;">₹${(Number(quote.total) * gstRate / 100).toLocaleString("en-IN")}</td>
              </tr>
              <tr class="grand-total">
                <td>Grand Total Due:</td>
                <td style="text-align: right;">₹${(Number(quote.total) * (1 + gstRate / 100)).toLocaleString("en-IN")}</td>
              </tr>
            </table>

            <div class="footer font-medium">
              This is a system generated pricing proposal and does not constitute a tax invoice. All prices listed are in Indian Rupees (INR).
              <br/>For any support, reach out to billing@quesole.com
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (loadingConfig) {
    return (
      <div className="flex h-96 items-center justify-center bg-background rounded-3xl border border-border shadow-sm">
        <Loader2 className="h-10 w-10 animate-spin text-brand" />
        <span className="ml-3 text-sm font-bold text-foreground">Loading interactive configurator...</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 px-4 md:px-8">
      {/* ──── REDESIGNED STEPPER HEADER ──── */}
      <div className="max-w-7xl mx-auto pt-8 pb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border/60 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Configure Your Platform Plan
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select channels, features, and branch limits. Pricing updates dynamically.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const allSteps = [
                { id: 1, label: "Branches" },
                { id: 2, label: "Online" },
                { id: 3, label: "Onsite" },
                { id: 4, label: "Addons" }
              ];
              const visibleSteps = hasOnsiteOperations ? allSteps : allSteps.filter(s => s.id !== 3);
              return visibleSteps.map((s, index) => {
                const isCompleted = s.id < step;
                const isActive = s.id === step;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id === 3 && !hasOnsiteOperations) {
                        toast.info("On-site configuration is not applicable for Online Booking only plans.");
                        return;
                      }
                      setStep(s.id);
                    }}
                    className="flex items-center gap-2 group cursor-pointer outline-none"
                  >
                    <span className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all border",
                      isCompleted ? "bg-emerald border-emerald text-white" :
                      isActive ? "bg-brand border-brand text-white shadow-md shadow-brand/20 scale-105" :
                      "bg-background border-border text-muted-foreground hover:border-slate-400"
                    )}>
                      {isCompleted ? <Check className="h-4 w-4" /> : (index + 1)}
                    </span>
                    <span className={cn(
                      "text-xs font-bold hidden sm:inline transition-all",
                      isActive ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {s.label}
                    </span>
                    {index < visibleSteps.length - 1 && <span className="text-muted-foreground/30 text-xs hidden sm:inline">/</span>}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-3 items-start">
        {/* LEFT COLUMN: SELECTED STEP FORM */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {/* STEP 1: COMPANY DETAILS & BRANCHES */}
              {step === 1 && (
                <div className="panel p-6 md:p-8 space-y-6 border border-border shadow-sm bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-violet-600" />
                  <div className="border-b border-border pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">1. Company Details & Branches</h2>
                      <p className="text-xs text-muted-foreground">Define your organization boundaries and active branches count.</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600">
                      <Building className="h-5 w-5" />
                    </span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left Column: Branches Config & Customizations */}
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Company Name</label>
                          <Input
                            value={currentCompany?.name || initialData?.companyName || ""}
                            disabled
                            className="rounded-xl h-11 bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Location Address</label>
                          <Input
                            value={currentCompany?.address || initialData?.locationAddress || ""}
                            disabled
                            className="rounded-xl h-11 bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Branches count Stepper */}
                      <div className="border-t border-border/60 pt-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-sm">How Many Branches Do You Need?</h3>
                          <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">Specify the total locations to register under subscription.</p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-border rounded-2xl p-1.5">
                            <button
                              type="button"
                              disabled={branchesCount <= (currentAllocations["branches"] || 1)}
                              onClick={() => setBranchesCount((c) => Math.max(1, c - 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-sm cursor-pointer transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center font-bold text-sm tabular-nums text-foreground">{branchesCount}</span>
                            <button
                              type="button"
                              onClick={() => setBranchesCount((c) => c + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white dark:hover:bg-slate-800 font-bold text-sm cursor-pointer transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Branches Name Customizer Panel */}
                      <div className="border-t border-border/60 pt-6">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">Your Branches ({branchesCount})</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {Array.from({ length: branchesCount }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-3 rounded-xl border border-border p-3.5 bg-slate-50 dark:bg-slate-900/60">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/40 text-[10px] font-bold text-violet-600 font-mono">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <Input
                                  value={branches[idx]?.name || `Branch ${idx + 1}`}
                                  onChange={(e) => updateBranchField(idx, "name", e.target.value)}
                                  className="h-8 text-xs font-semibold rounded-lg bg-background border-border"
                                  placeholder={`Branch ${idx + 1}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking branding customizer details */}
                      <div className="space-y-4 pt-6 border-t border-border/60">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Portal Customization</h4>
                        
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Company URL Slug</label>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-semibold bg-slate-100 dark:bg-slate-900 border border-border px-2.5 h-9 rounded-lg flex items-center shrink-0">
                              {window.location.host}/
                            </span>
                            <Input
                              value={companySlug}
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
                                setCompanySlug(val);
                              }}
                              className={cn(
                                "rounded-lg h-9 text-xs flex-1 font-semibold",
                                slugError ? "border-destructive bg-destructive/5 focus-visible:ring-destructive" :
                                slugAvailable === true ? "border-emerald-500 bg-emerald-500/5 focus-visible:ring-emerald-500" : ""
                              )}
                              placeholder="company-slug"
                            />
                          </div>
                          {slugLoading && (
                            <p className="text-[9px] text-muted-foreground mt-1">Checking availability...</p>
                          )}
                          {!slugLoading && slugError && (
                            <p className="text-[9px] text-destructive mt-1 font-semibold">{slugError}</p>
                          )}
                          {!slugLoading && slugAvailable && (
                            <p className="text-[9px] text-emerald-500 mt-1 font-semibold">✓ URL is available!</p>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Branding Name</label>
                          <Input
                            value={portalName}
                            onChange={(e) => setPortalName(e.target.value)}
                            placeholder={currentCompany?.name || initialData?.companyName || "My Portal Name"}
                            className="rounded-lg h-9 text-xs"
                          />
                        </div>

                        <div className="grid gap-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block">
                            Company Logo
                          </label>
                          <div className="flex items-center gap-3 mt-0.5">
                            {logoUrl ? (
                              <div className="h-10 w-10 rounded-xl border border-border bg-background p-1 overflow-hidden shrink-0 flex items-center justify-center">
                                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-xl border border-dashed border-border bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center text-[9px] font-bold text-muted-foreground">
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
                                      setLogoUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="h-10 rounded-xl text-xs cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 pt-2"
                              />
                              {logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setLogoUrl("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-destructive hover:underline font-bold bg-background dark:bg-slate-950 px-1"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground/70">PNG, JPG or SVG image file (max 2MB).</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Primary Color</label>
                            <div className="flex items-center gap-2 border border-border rounded-lg p-1 bg-background">
                              <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-7 w-7 rounded cursor-pointer border-0"
                              />
                              <span className="text-[10px] font-bold font-mono text-muted-foreground">{primaryColor.toUpperCase()}</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Address to Display</label>
                            <Input
                              value={displayAddress}
                              onChange={(e) => setDisplayAddress(e.target.value)}
                              placeholder="Head Office Address"
                              className="rounded-lg h-9 text-xs"
                            />
                          </div>
                        </div>

                        {/* Customer/Booking Fields customizers */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-2">Customer Info fields</label>
                            {["name", "email", "phone"].map((field) => (
                              <label key={field} className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1">
                                <input
                                  type="checkbox"
                                  checked={enabledCustomerFields.includes(field)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEnabledCustomerFields([...enabledCustomerFields, field]);
                                    } else {
                                      setEnabledCustomerFields(enabledCustomerFields.filter((f) => f !== field));
                                    }
                                  }}
                                  className="rounded border-border text-brand h-3.5 w-3.5"
                                />
                                <span className="capitalize">{field}</span>
                              </label>
                            ))}
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-2">Booking Fields</label>
                            {["date_slot", "message"].map((field) => (
                              <label key={field} className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1">
                                <input
                                  type="checkbox"
                                  checked={enabledBookingFields.includes(field)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEnabledBookingFields([...enabledBookingFields, field]);
                                    } else {
                                      setEnabledBookingFields(enabledBookingFields.filter((f) => f !== field));
                                    }
                                  }}
                                  className="rounded border-border text-brand h-3.5 w-3.5"
                                />
                                <span>{field === "date_slot" ? "Date & Time Slot" : "Custom Message"}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/60 flex justify-end">
                        <Button onClick={() => setStep(2)} className="bg-brand text-white font-bold gap-2 rounded-xl px-5 h-11">
                          Continue to Online Module <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Right Column: Live Booking Wizard Page Preview Card */}
                    <div className="rounded-3xl border border-border bg-slate-50 dark:bg-slate-900/40 p-5 flex flex-col justify-between shadow-inner h-[460px] overflow-hidden sticky top-6">
                      <div className="space-y-4">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block text-center border-b border-border/60 pb-2">
                          Live Portal Preview
                        </span>
                        
                        {/* Mock Portal Wrapper */}
                        <div className="rounded-2xl bg-background border border-border shadow p-4 space-y-4 text-left">
                          <div className="flex items-center gap-2.5">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="h-7 w-7 object-contain rounded" />
                            ) : (
                              <span className="h-7 w-7 rounded bg-brand/10 flex items-center justify-center font-bold text-brand text-xs">
                                Logo
                              </span>
                            )}
                            <div>
                              <div className="font-bold text-xs">{portalName || currentCompany?.name || "Your Branding Logo/Name"}</div>
                              <div className="text-[9px] text-muted-foreground">{displayAddress || currentCompany?.address || "Display location address"}</div>
                              <div className="text-[8px] text-brand font-semibold select-all mt-0.5 font-mono">
                                {window.location.protocol}//{window.location.host}/{companySlug || "slug"}
                              </div>
                            </div>
                          </div>

                          {/* Booking form mock inputs */}
                          <div className="space-y-2 pt-2 border-t border-border/40">
                            {enabledCustomerFields.includes("name") && (
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">Your Full Name</span>
                                <div className="h-7 rounded border border-border bg-slate-50/50 text-[10px] px-2 flex items-center text-slate-400">John Doe</div>
                              </div>
                            )}
                            {enabledCustomerFields.includes("email") && (
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">Email Address</span>
                                <div className="h-7 rounded border border-border bg-slate-50/50 text-[10px] px-2 flex items-center text-slate-400">johndoe@example.com</div>
                              </div>
                            )}
                            {enabledCustomerFields.includes("phone") && (
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 block mb-0.5">Contact Number</span>
                                <div className="h-7 rounded border border-border bg-slate-50/50 text-[10px] px-2 flex items-center text-slate-400">+91 98765 43210</div>
                              </div>
                            )}
                            {enabledBookingFields.includes("date_slot") && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[8px] font-bold text-slate-400 block mb-0.5">Select Date</span>
                                  <div className="h-7 rounded border border-border bg-slate-50/50 text-[10px] px-2 flex items-center text-slate-400">2026-08-22</div>
                                </div>
                                <div>
                                  <span className="text-[8px] font-bold text-slate-400 block mb-0.5">Select Slot</span>
                                  <div className="h-7 rounded border border-border bg-slate-50/50 text-[10px] px-2 flex items-center text-slate-400">10:00 AM</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Button matching customization settings */}
                      <button
                        type="button"
                        style={{ backgroundColor: primaryColor }}
                        className="w-full h-9 rounded-xl text-xs font-bold text-white shadow hover:opacity-90 transition-opacity border-0"
                      >
                        Confirm Booking Reservation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: ONLINE MODULE */}
              {step === 2 && (
                <div className="panel p-6 md:p-8 space-y-6 border border-border shadow-sm bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                  
                  <div className="border-b border-border pb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold tracking-tight">2. Online Booking Module Configuration</h2>
                        <input
                          type="checkbox"
                          checked={onlineModuleEnabled}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              const hasActiveOnline = branches.slice(0, branchesCount).some((b) => b.channel_type !== "ONSITE_ONLY");
                              if (hasActiveOnline) {
                                if (confirm("Disabling this module will turn off online booking capabilities for all branches. Do you want to continue?")) {
                                  setOnlineModuleEnabled(false);
                                  setBranches((prev) => prev.map((b) => ({ ...b, channel_type: "ONSITE_ONLY" })));
                                }
                              } else {
                                setOnlineModuleEnabled(false);
                              }
                            } else {
                              setOnlineModuleEnabled(true);
                            }
                          }}
                          className="toggle-checkbox h-4 w-4 accent-brand cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Configure online booking slots, routing, and services for active branches.</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                      <Globe className="h-5 w-5" />
                    </span>
                  </div>

                  {!onlineModuleEnabled ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-muted-foreground">
                      <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <h4 className="font-bold text-sm">Online Booking Module is Inactive</h4>
                      <p className="text-xs mt-1">Toggle the checkbox next to the section title to activate online booking.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Enabled Branches ({onlineBranchesCount} of {branchesCount})
                        </label>
                        <div className="max-h-96 overflow-y-auto border border-border rounded-2xl p-3.5 space-y-3 bg-slate-50 dark:bg-slate-900/60">
                          {activeBranchesList.map((b, idx) => {
                            const isChecked = b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID";
                            return (
                              <div key={idx} className="border-b border-border/30 last:border-0 pb-3 last:pb-0 pt-1 first:pt-0">
                                <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                                  <span className="text-foreground">{b.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOnlineForBranch(idx)}
                                    className="rounded border-border text-brand h-4 w-4 cursor-pointer"
                                  />
                                </label>

                                {isChecked && (
                                  <div className="mt-2.5 ml-2 pl-3 border-l-2 border-brand/30 space-y-2.5 animate-fade-in text-[10px]">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="font-bold text-muted-foreground uppercase tracking-wider">Online Routing Mode</span>
                                      <select
                                        value={b.mode}
                                        onChange={(e) => updateBranchField(idx, "mode", e.target.value)}
                                        className="h-7 rounded-lg text-[10px] font-semibold border-border bg-background px-1.5 shrink-0"
                                      >
                                        <option value="NON_SERVICE_BASED">Non-Service-Based</option>
                                        <option value="SERVICE_BASED">Service-Based</option>
                                      </select>
                                    </div>

                                    {b.mode === "SERVICE_BASED" && (
                                      <div className="flex items-center justify-between gap-4">
                                        <div>
                                          <span className="font-bold text-muted-foreground uppercase tracking-wider block">Services Offered</span>
                                          <span className="text-[9px] text-muted-foreground block font-medium">{getComponentPriceLabelText("services")}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-0.5 shrink-0">
                                          <button
                                            type="button"
                                            disabled={b.serviceQty <= 1}
                                            onClick={() => {
                                              const nextQty = Math.max(1, b.serviceQty - 1);
                                              updateBranchField(idx, "serviceQty", nextQty);
                                            }}
                                            className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold text-xs cursor-pointer border-0 bg-transparent"
                                          >
                                            −
                                          </button>
                                          <span className="w-5 text-center font-bold text-[10px]">{b.serviceQty}</span>
                                          <button
                                            type="button"
                                            onClick={() => updateBranchField(idx, "serviceQty", b.serviceQty + 1)}
                                            className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer border-0 bg-transparent"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl h-11 font-bold">
                      Back to Step 1
                    </Button>
                    <Button
                      onClick={() => {
                        if (!hasOnsiteOperations) {
                          setStep(4);
                        } else {
                          setStep(3);
                        }
                      }}
                      className="bg-brand text-white font-bold gap-2 rounded-xl px-5 h-11"
                    >
                      {!hasOnsiteOperations ? "Continue to Addons" : "Continue to Onsite Module"} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: ONSITE MODULE */}
              {step === 3 && (
                <div className="panel p-6 md:p-8 space-y-6 border border-border shadow-sm bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
                  
                  <div className="border-b border-border pb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold tracking-tight">3. Onsite Module (In-Branch Queue)</h2>
                        <input
                          type="checkbox"
                          checked={onsiteModuleEnabled}
                          onChange={(e) => setOnsiteModuleEnabled(e.target.checked)}
                          className="toggle-checkbox h-4 w-4 accent-brand cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Manage on-site physical walk-ins, print tickets, and display tokens.</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                      <Monitor className="h-5 w-5" />
                    </span>
                  </div>

                  {!onsiteModuleEnabled ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-muted-foreground">
                      <Monitor className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <h4 className="font-bold text-sm">Onsite Queue Module is Inactive</h4>
                      <p className="text-xs mt-1">Toggle the checkbox next to the section title to activate onsite queue operations.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Branch Tab selectors */}
                      <div className="border-b border-border/60 pb-3 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                          {activeBranchesList.map((b, idx) => {
                            const isActive = activeBranchIndex === idx;
                            const isOnlineOnly = b.channel_type === "ONLINE_ONLY";
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveBranchIndex(idx)}
                                className={cn(
                                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer shrink-0 flex items-center gap-1.5",
                                  isActive 
                                    ? "bg-brand text-white border-brand shadow-sm animate-scale-in" 
                                    : "bg-background border-border text-muted-foreground hover:text-foreground",
                                  isOnlineOnly && "opacity-65 border-dashed"
                                )}
                              >
                                {b.name}
                                {isOnlineOnly && (
                                  <span className="text-[8px] bg-slate-100 dark:bg-slate-900 border border-border text-muted-foreground/80 px-1 py-0.2 rounded font-semibold font-sans">
                                    ONLINE ONLY
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBranches((prev) => {
                              const next = [...prev];
                              const b1 = next[0];
                              for (let i = 1; i < next.length; i++) {
                                next[i] = {
                                  ...JSON.parse(JSON.stringify(b1)),
                                  name: next[i].name,
                                };
                              }
                              return next;
                            });
                            setApplyToAll(true);
                            toast.success("Applied configurations to all branches!");
                          }}
                          className="rounded-lg text-[10px] font-bold uppercase tracking-wider h-8 shrink-0"
                        >
                          Apply to All Locations
                        </Button>
                      </div>

                       {/* Inner branch configurator */}
                      {branches[activeBranchIndex] && (
                        <div className="grid gap-6 md:grid-cols-2 items-start pt-2">
                          {/* Enable/Disable Onsite operations toggle */}
                          <div className="col-span-2 rounded-2xl border border-border p-4 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shadow-sm">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs block text-foreground">Enable Onsite Queue Operations</span>
                              <span className="text-[10px] text-muted-foreground block leading-normal">
                                Activate thermal kiosks, SMS/WhatsApp delivery, physical ticket prints, and operator desks for this location.
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={branches[activeBranchIndex].channel_type !== "ONLINE_ONLY"}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const currentType = branches[activeBranchIndex].channel_type || "ONSITE_ONLY";
                                if (isChecked) {
                                  if (currentType === "ONLINE_ONLY") {
                                    updateBranchField(activeBranchIndex, "channel_type", "HYBRID");
                                    toast.success(`Enabled onsite operations for ${branches[activeBranchIndex]?.name}!`);
                                  }
                                } else {
                                  if (currentType === "HYBRID") {
                                    updateBranchField(activeBranchIndex, "channel_type", "ONLINE_ONLY");
                                    toast.success(`Disabled onsite operations for ${branches[activeBranchIndex]?.name}!`);
                                  } else {
                                    toast.warning("At least one module (Online or Onsite) must be enabled for each branch.");
                                  }
                                }
                              }}
                              className="rounded border-border text-brand h-4.5 w-4.5 cursor-pointer accent-brand"
                            />
                          </div>
                          {branches[activeBranchIndex].channel_type === "ONLINE_ONLY" && (
                            <div className="col-span-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-blue-500 text-xs font-semibold leading-normal mb-2 flex items-start gap-2.5">
                              <Globe className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-foreground">Online Booking Only Mode</span>
                                <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">
                                  This location is configured to exclusively accept online pre-scheduled appointments. On-site ticketing kiosks, printer screens, and walk-in operator desks are disabled and not charged.
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="space-y-5">
                            {/* 3.2 Queue Options mapping */}
                            <div className="space-y-2">
                              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">3.2 Queue Options</label>
                              <div className="space-y-3">
                                {(() => {
                                  const activeMethods = branches[activeBranchIndex].activeMethods || ["1"];
                                  const isQrSel = activeMethods.includes("1");
                                  const isKioskSel = activeMethods.includes("2");
                                  const isKotSel = activeMethods.includes("3") || activeMethods.includes("4");

                                  const isSmsActive = state.tokenDeliveryMethods.some(m => m.key === "SMS" && m.is_active);
                                  const isWhatsappActive = state.tokenDeliveryMethods.some(m => m.key === "WHATSAPP" && m.is_active);
                                  const hasAnyKotDelivery = isSmsActive || isWhatsappActive;

                                  const smsMethod = state.tokenDeliveryMethods.find(m => m.key === "SMS");
                                  const whatsappMethod = state.tokenDeliveryMethods.find(m => m.key === "WHATSAPP");

                                  const smsPrice = smsMethod ? Number(smsMethod.price_per_branch) : 490;
                                  const whatsappPrice = whatsappMethod ? Number(whatsappMethod.price_per_branch) : 790;

                                  const isDisabled = branches[activeBranchIndex].channel_type === "ONLINE_ONLY";

                                  return (
                                    <>
                                      {/* Option 1: QR Scanning */}
                                      <label className={cn(
                                        "flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-200",
                                        isQrSel ? "border-brand bg-brand/5 shadow-sm" : "border-border bg-background",
                                        isDisabled && "opacity-50 pointer-events-none"
                                      )}>
                                        <input
                                          type="checkbox"
                                          checked={isQrSel}
                                          disabled={isDisabled}
                                          onChange={() => {
                                            let nextMethods = [...activeMethods];
                                            if (isQrSel) {
                                              nextMethods = nextMethods.filter(m => m !== "1");
                                            } else {
                                              nextMethods.push("1");
                                            }
                                            if (nextMethods.length === 0) {
                                              nextMethods = ["1"];
                                            }
                                            updateBranchField(activeBranchIndex, "activeMethods", nextMethods);
                                          }}
                                          className="mt-0.5 accent-brand"
                                        />
                                        <div>
                                          <span className="font-bold text-xs text-foreground block">QR Scanning Token (Free)</span>
                                          <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                                            Customers scan a QR poster on their mobile to join the digital queue (Always Free)
                                          </span>
                                        </div>
                                      </label>

                                      {/* Option 2: Kiosk Printed Token */}
                                      <label className={cn(
                                        "flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-200",
                                        isKioskSel ? "border-brand bg-brand/5 shadow-sm" : "border-border bg-background",
                                        isDisabled && "opacity-50 pointer-events-none"
                                      )}>
                                        <input
                                          type="checkbox"
                                          checked={isKioskSel}
                                          disabled={isDisabled}
                                          onChange={() => {
                                            let nextMethods = [...activeMethods];
                                            if (isKioskSel) {
                                              nextMethods = nextMethods.filter(m => m !== "2");
                                            } else {
                                              nextMethods.push("2");
                                            }
                                            if (nextMethods.length === 0) {
                                              nextMethods = ["1"];
                                            }
                                            updateBranchField(activeBranchIndex, "activeMethods", nextMethods);
                                          }}
                                          className="mt-0.5 accent-brand"
                                        />
                                        <div>
                                          <span className="font-bold text-xs text-foreground block">Kiosk (Printed Token)</span>
                                          <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                                            Prints thermal token tickets at walk-in terminal (Charged per kiosk unit rate)
                                          </span>
                                        </div>
                                      </label>

                                      {/* Option 3: KOT SMS/WhatsApp */}
                                      <div className={cn(
                                        "rounded-2xl border p-4 transition-all duration-200 space-y-4",
                                        isKotSel ? "border-brand bg-brand/5 shadow-sm" : "border-border bg-background",
                                        (isDisabled || !hasAnyKotDelivery) && "opacity-50 pointer-events-none"
                                      )}>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isKotSel}
                                            disabled={isDisabled || !hasAnyKotDelivery}
                                            onChange={() => {
                                              let nextMethods = [...activeMethods];
                                              if (isKotSel) {
                                                nextMethods = nextMethods.filter(m => m !== "3" && m !== "4");
                                              } else {
                                                if (isSmsActive) nextMethods.push("3");
                                                else if (isWhatsappActive) nextMethods.push("4");
                                              }
                                              if (nextMethods.length === 0) {
                                                nextMethods = ["1"];
                                              }
                                              updateBranchField(activeBranchIndex, "activeMethods", nextMethods);
                                            }}
                                            className="mt-0.5 accent-brand"
                                          />
                                          <div>
                                            <span className="font-bold text-xs text-foreground block">KOT — Digital Delivery Options</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5 block leading-normal">
                                              Deliver virtual ticket tokens directly to customers via SMS or WhatsApp channels
                                            </span>
                                          </div>
                                        </label>

                                        {!hasAnyKotDelivery && (
                                          <div className="text-[10px] font-bold text-destructive bg-destructive/10 rounded-xl p-3">
                                            Requires SMS or WhatsApp delivery — not available on your current plan. Please contact support or upgrade.
                                          </div>
                                        )}

                                        {isKotSel && hasAnyKotDelivery && (
                                          <div className="pl-6 pt-2 border-t border-border/40 space-y-3">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Select Delivery Method</span>
                                            <div className="grid gap-2">
                                              {/* Deliver via SMS sub-choice */}
                                              {isSmsActive && (
                                                <label className="flex items-center gap-2.5 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={activeMethods.includes("3")}
                                                    onChange={() => {
                                                      let nextMethods = [...activeMethods];
                                                      if (nextMethods.includes("3")) {
                                                        nextMethods = nextMethods.filter(m => m !== "3");
                                                      } else {
                                                        nextMethods.push("3");
                                                      }
                                                      if (!nextMethods.includes("3") && !nextMethods.includes("4")) {
                                                        nextMethods = nextMethods.filter(m => m !== "3" && m !== "4");
                                                      }
                                                      if (nextMethods.length === 0) {
                                                        nextMethods = ["1"];
                                                      }
                                                      updateBranchField(activeBranchIndex, "activeMethods", nextMethods);
                                                    }}
                                                    className="accent-brand h-3.5 w-3.5"
                                                  />
                                                  <span className="text-xs font-semibold text-foreground">
                                                    SMS Delivery (+₹{smsPrice.toLocaleString("en-IN")}/mo)
                                                  </span>
                                                </label>
                                              )}

                                              {/* Deliver via WhatsApp sub-choice */}
                                              {isWhatsappActive && (
                                                <label className="flex items-center gap-2.5 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={activeMethods.includes("4")}
                                                    onChange={() => {
                                                      let nextMethods = [...activeMethods];
                                                      if (nextMethods.includes("4")) {
                                                        nextMethods = nextMethods.filter(m => m !== "4");
                                                      } else {
                                                        nextMethods.push("4");
                                                      }
                                                      if (!nextMethods.includes("3") && !nextMethods.includes("4")) {
                                                        nextMethods = nextMethods.filter(m => m !== "3" && m !== "4");
                                                      }
                                                      if (nextMethods.length === 0) {
                                                        nextMethods = ["1"];
                                                      }
                                                      updateBranchField(activeBranchIndex, "activeMethods", nextMethods);
                                                    }}
                                                    className="accent-brand h-3.5 w-3.5"
                                                  />
                                                  <span className="text-xs font-semibold text-foreground">
                                                    WhatsApp Delivery (+₹{whatsappPrice.toLocaleString("en-IN")}/mo)
                                                  </span>
                                                </label>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* COLUMN 2 */}
                          <div className="space-y-5">
                            {/* Branch Mode Select & Routing */}
                            <div className="rounded-2xl border border-border p-4 bg-slate-50 dark:bg-slate-900/60 space-y-4">
                              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                                <span className="text-xs font-bold">Branch Routing Mode</span>
                                <select
                                  value={branches[activeBranchIndex].mode}
                                  disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                  onChange={(e) => updateBranchField(activeBranchIndex, "mode", e.target.value)}
                                  className="h-8 rounded-lg text-xs font-semibold border-border bg-background disabled:opacity-50"
                                >
                                  <option value="NON_SERVICE_BASED">Non-Service-Based (Single Queue)</option>
                                  <option value="SERVICE_BASED">Service-Based (Multiple queues)</option>
                                </select>
                              </div>

                              {branches[activeBranchIndex].mode === "SERVICE_BASED" ? (
                                <div className="space-y-4">
                                  {/* 3.3 Services Offered stepper */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <label className="text-xs font-bold block">3.3 Services Offered</label>
                                      <p className="text-[10px] text-muted-foreground">{getComponentPriceLabelText("services")}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-1">
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].serviceQty <= 1 || branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => {
                                          const nextQty = Math.max(1, branches[activeBranchIndex].serviceQty - 1);
                                          updateBranchField(activeBranchIndex, "serviceQty", nextQty);
                                          const nextAssignments = { ...(branches[activeBranchIndex].serviceAssignments || {}) };
                                          delete nextAssignments[nextQty - 1];
                                          updateBranchField(activeBranchIndex, "serviceAssignments", nextAssignments);
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold"
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center font-bold text-xs">{branches[activeBranchIndex].serviceQty}</span>
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => updateBranchField(activeBranchIndex, "serviceQty", branches[activeBranchIndex].serviceQty + 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-bold disabled:opacity-30"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* 3.4 Operator Desks stepper */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <label className="text-xs font-bold block">3.4 Operator Desks</label>
                                      <p className="text-[10px] text-muted-foreground">{getComponentPriceLabelText("operator_screens")}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-1">
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].operatorQty <= 0 || branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => {
                                          const nextQty = Math.max(0, branches[activeBranchIndex].operatorQty - 1);
                                          updateBranchField(activeBranchIndex, "operatorQty", nextQty);
                                          const nextAssignments = { ...(branches[activeBranchIndex].serviceAssignments || {}) };
                                          Object.keys(nextAssignments).forEach((sIdx: any) => {
                                            nextAssignments[sIdx] = (nextAssignments[sIdx] || []).filter((d: number) => d <= nextQty);
                                          });
                                          updateBranchField(activeBranchIndex, "serviceAssignments", nextAssignments);
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold"
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center font-bold text-xs">{branches[activeBranchIndex].operatorQty}</span>
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => updateBranchField(activeBranchIndex, "operatorQty", branches[activeBranchIndex].operatorQty + 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-bold disabled:opacity-30"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Service-to-Desk Assignment Grid */}
                                  <div className="space-y-3 pt-3 border-t border-border/40">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Service-to-Desk Assignment</label>
                                    <p className="text-[10px] text-muted-foreground leading-normal">
                                      Assign each service to at least one operator desk.
                                    </p>
                                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border/60">
                                      {Array.from({ length: branches[activeBranchIndex].serviceQty }).map((_, sIdx) => {
                                        const assignedDesks = branches[activeBranchIndex].serviceAssignments?.[sIdx] || [1];
                                        const hasNoDesks = assignedDesks.length === 0;
                                        return (
                                          <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-border/30 last:border-0 last:pb-0">
                                            <div>
                                              <span className="font-semibold text-xs text-foreground">Service {sIdx + 1}</span>
                                              {hasNoDesks && (
                                                <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded ml-2">
                                                  Unservable (No Desks Assigned)
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              {Array.from({ length: branches[activeBranchIndex].operatorQty }).map((_, dIdx) => {
                                                const deskNum = dIdx + 1;
                                                const isAssigned = assignedDesks.includes(deskNum);
                                                return (
                                                  <button
                                                    key={dIdx}
                                                    type="button"
                                                    disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                                    onClick={() => {
                                                      let nextAssigned = [...assignedDesks];
                                                      if (isAssigned) {
                                                        nextAssigned = nextAssigned.filter((d) => d !== deskNum);
                                                      } else {
                                                        nextAssigned.push(deskNum);
                                                      }
                                                      const updatedAssignments = {
                                                        ...(branches[activeBranchIndex].serviceAssignments || {}),
                                                        [sIdx]: nextAssigned
                                                      };
                                                      updateBranchField(activeBranchIndex, "serviceAssignments", updatedAssignments);
                                                    }}
                                                    className={cn(
                                                      "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer",
                                                      isAssigned ? "bg-brand text-white border-brand shadow-sm shadow-brand/15" : "bg-background border-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-foreground",
                                                      branches[activeBranchIndex].channel_type === "ONLINE_ONLY" && "opacity-50 pointer-events-none"
                                                    )}
                                                  >
                                                    Desk {deskNum}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* 3.4 Number of Operators stepper */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <label className="text-xs font-bold block">3.4 Number of Operators</label>
                                      <p className="text-[10px] text-muted-foreground">{getComponentPriceLabelText("operator_screens")}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-1">
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].operatorQty <= 0 || branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => updateBranchField(activeBranchIndex, "operatorQty", Math.max(0, branches[activeBranchIndex].operatorQty - 1))}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold"
                                      >
                                        −
                                      </button>
                                      <span className="w-8 text-center font-bold text-xs">{branches[activeBranchIndex].operatorQty}</span>
                                      <button
                                        type="button"
                                        disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                        onClick={() => updateBranchField(activeBranchIndex, "operatorQty", branches[activeBranchIndex].operatorQty + 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-bold disabled:opacity-30"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Base Kiosk selection */}
                            <div className="flex items-center justify-between border-t border-border/40 pt-3">
                              <div>
                                <label className="text-xs font-bold block">Base Ticketing Kiosks</label>
                                <p className="text-[10px] text-muted-foreground">{getComponentPriceLabelText("paper_roll_screens")}</p>
                              </div>
                              <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-1">
                                <button
                                  type="button"
                                  disabled={branches[activeBranchIndex].kioskQty <= 0 || branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                  onClick={() => updateBranchField(activeBranchIndex, "kioskQty", Math.max(0, branches[activeBranchIndex].kioskQty - 1))}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 font-bold"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center font-bold text-xs">{branches[activeBranchIndex].kioskQty}</span>
                                <button
                                  type="button"
                                  disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                  onClick={() => updateBranchField(activeBranchIndex, "kioskQty", branches[activeBranchIndex].kioskQty + 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-bold disabled:opacity-30"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Branch Addons */}
                            <div className="space-y-3 pt-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Branch Addons (Optional)</span>
                              <div className="flex justify-between items-center rounded-2xl border border-border p-3.5 bg-background">
                                <div>
                                  <span className="font-bold text-xs">Self-Ticketing QR Display Poster</span>
                                  <span className="text-[9px] text-muted-foreground block mt-0.5">{getComponentPriceLabelText("printed_qr")}</span>
                                </div>
                                <button
                                  type="button"
                                  disabled={branches[activeBranchIndex].channel_type === "ONLINE_ONLY"}
                                  onClick={() => updateBranchAddon(activeBranchIndex, "printed_qr", branches[activeBranchIndex].addons["printed_qr"] === 0 ? 1 : 0)}
                                  className={cn(
                                    "rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
                                    branches[activeBranchIndex].addons["printed_qr"] > 0 ? "bg-brand text-white border-brand" : "bg-background border-border text-foreground"
                                  )}
                                >
                                  {branches[activeBranchIndex].addons["printed_qr"] > 0 ? "Enabled" : "Enable"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl h-11 font-bold">
                      Back to Step 2
                    </Button>
                    <Button onClick={() => setStep(4)} className="bg-brand text-white font-bold gap-2 rounded-xl px-5 h-11">
                      Continue to Addons <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & ADDONS */}
              {step === 4 && (
                <div className="panel p-6 md:p-8 space-y-8 border border-border shadow-sm bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald" />
                  
                  <div className="border-b border-border pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">4. Organization Addons & Access</h2>
                      <p className="text-xs text-muted-foreground">Select global plugins and review your complete billing proposal details.</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald">
                      <Settings className="h-5 w-5" />
                    </span>
                  </div>

                  {/* Admin panel access list */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Panel Access Included</h3>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        "Manage Active Branches",
                        "Live Queue Monitoring",
                        "Interactive Kiosk Manager",
                        "Role-Based Operator Logs",
                        "Real-Time Wait Estimates",
                        "SLA Breach Trackers"
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Addon Component cards */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Features You Can Add</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">Toggle organization-wide features and integrations.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { key: "whatsapp_integration", title: "WhatsApp Integration", desc: "Deliver live queue digital tickets directly inside WhatsApp chat.", defaultPrice: 1500 }
                      ].map((addon) => {
                        const comp = state.planComponents.find((c) => c.key === addon.key);
                        const price = comp ? Number(comp.price_per_unit) : addon.defaultPrice;
                        const isAdded = (companyAddons[addon.key] ?? 0) > 0;
                        return (
                          <button
                            key={addon.key}
                            type="button"
                            onClick={() => {
                              setCompanyAddons((prev) => ({
                                ...prev,
                                [addon.key]: isAdded ? 0 : 1
                              }));
                            }}
                            className={cn(
                              "rounded-2xl border p-5 text-left transition-all duration-300 outline-none flex flex-col justify-between h-40 cursor-pointer hover:shadow-md",
                              isAdded ? "border-brand bg-brand/5 shadow-sm" : "border-border bg-background"
                            )}
                          >
                            <div className="flex items-start justify-between w-full">
                              <div>
                                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{addon.title}</h4>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-normal line-clamp-3">{addon.desc}</p>
                              </div>
                              {isAdded && <span className="rounded-full bg-brand text-white p-0.5"><Check className="h-3 w-3" /></span>}
                            </div>
                            <span className="text-[11px] font-black text-emerald mt-2 block">₹{price.toLocaleString("en-IN")}/mo</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!hasOnsiteOperations) {
                          setStep(2);
                        } else {
                          setStep(3);
                        }
                      }}
                      className="rounded-xl h-11 font-bold"
                    >
                      {!hasOnsiteOperations ? "Back to Step 2" : "Back to Step 3"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: STICKY SUMMARY & CHECKOUT */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
          <div className="panel p-6 space-y-6 border border-border/80 shadow-lg bg-white dark:bg-slate-900 rounded-3xl">
            {state.planComponents.length === 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-600 font-semibold leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <span className="font-bold block">Unable to load pricing.</span>
                  <span className="block mt-0.5 text-muted-foreground font-medium">Please try again.</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Selected Package Summary</h3>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={!quote}
                className="flex items-center gap-1.5 text-[10px] font-bold text-brand hover:underline cursor-pointer bg-transparent border-0 outline-none disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>

            {/* Config metadata summary indicators */}
            <div className="space-y-2.5 text-xs font-semibold">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Active Locations</span>
                <span className="text-foreground">{branchesCount} Branches</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Online Enabled</span>
                <span className="text-foreground">{onlineBranchesCount} Branches</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-slate-500">Contract Length</span>
                <span className="text-foreground">{durationMonths} Month{durationMonths > 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Collapsible branch list itemized summary */}
            <div className="space-y-2 border-t border-b border-border/50 py-4 max-h-48 overflow-y-auto pr-1">
              {activeBranchesList.map((b, idx) => (
                <div key={idx} className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-[11px] space-y-1">
                  <button
                    type="button"
                    onClick={() => setCollapsedBranchIndex(collapsedBranchIndex === idx ? null : idx)}
                    className="flex items-center justify-between w-full font-bold text-left cursor-pointer outline-none bg-transparent border-0"
                  >
                    <span className="text-brand">{b.name}</span>
                    {collapsedBranchIndex === idx ? <ChevronUp className="h-3.5 w-3.5 text-brand" /> : <ChevronDown className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  {(collapsedBranchIndex === idx || collapsedBranchIndex === null) && (
                    <div className="pt-2 space-y-1 border-t border-border/40 mt-1.5 text-[10px] text-muted-foreground font-semibold">
                      <div className="flex justify-between">
                        <span>• Channel:</span>
                        <strong className="text-foreground uppercase">{b.channel_type || "ONSITE_ONLY"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>• Mode:</span>
                        <strong className="text-foreground">{b.mode === "SERVICE_BASED" ? "Service Based" : "Single Queue"}</strong>
                      </div>
                      {b.mode === "SERVICE_BASED" && (
                        <div className="flex justify-between">
                          <span>• Services:</span>
                          <strong className="text-foreground">{b.serviceQty}</strong>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>• Operator seats:</span>
                        <strong className="text-foreground">
                          {b.channel_type === "ONLINE_ONLY" ? 0 : (b.mode === "SERVICE_BASED" ? b.serviceQty : b.operatorQty)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>• Displays/Kiosks:</span>
                        <strong className="text-foreground">{b.channel_type === "ONLINE_ONLY" ? 0 : b.kioskQty}</strong>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Subscription Contract selector */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Billing Cycle Tier</h4>
              <div className="grid grid-cols-2 gap-2">
                {config.duration_tiers.map((tier: any) => {
                  const isSel = durationMonths === tier.months;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setDurationMonths(tier.months)}
                      className={cn(
                        "rounded-xl border p-2.5 text-center flex flex-col justify-center items-center cursor-pointer outline-none transition-all duration-200",
                        isSel ? "border-brand bg-brand/5 shadow-sm scale-102 font-bold" : "border-border bg-background hover:bg-accent/10"
                      )}
                    >
                      <span className="font-bold text-xs">{tier.months} Month{tier.months > 1 ? "s" : ""}</span>
                      {tier.discount_percent > 0 ? (
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold text-emerald tracking-wide mt-1.5 uppercase">
                          Save {tier.discount_percent}%
                        </span>
                      ) : (
                        <span className="text-[8px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">
                          No Discount
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Recalculated pricing breaks */}
            <div className="space-y-3 pt-2 text-xs">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-border pb-2">
                Pricing Calculations
              </h4>

              {loadingQuote ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-brand" />
                </div>
              ) : quote ? (
                <div className="space-y-2.5 font-semibold text-slate-600 dark:text-slate-400">
                  {Number(quote.itemized.branches_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Branches License Fee</span>
                      <span className="text-foreground">₹{Number(quote.itemized.branches_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.online_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Online Booking Module</span>
                      <span className="text-foreground">₹{Number(quote.itemized.online_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.operators_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Operator Seats Total</span>
                      <span className="text-foreground">₹{Number(quote.itemized.operators_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.services_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Service Queues Total</span>
                      <span className="text-foreground">₹{Number(quote.itemized.services_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.kiosks_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Displays & Kiosks Total</span>
                      <span className="text-foreground">₹{Number(quote.itemized.kiosks_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.qr_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>QR Self-Ticketing Addon</span>
                      <span className="text-foreground">₹{Number(quote.itemized.qr_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Number(quote.itemized.delivery_subtotal) > 0 && (
                    <div className="flex justify-between">
                      <span>Token Delivery Channels</span>
                      <span className="text-foreground">₹{Number(quote.itemized.delivery_subtotal).toLocaleString("en-IN")}/mo</span>
                    </div>
                  )}
                  {Object.entries(companyAddons).map(([key, qty]) => {
                    if (qty <= 0) return null;
                    const comp = state.planComponents.find((c) => c.key === key);
                    const label = comp?.label || (key === "whatsapp_integration" ? "WhatsApp Integration" : key);
                    const price = comp ? Number(comp.price_per_unit) : (key === "whatsapp_integration" ? 1500 : 0);
                    const cost = qty * price;
                    return (
                      <div key={key} className="flex justify-between">
                        <span>{label} Addon</span>
                        <span className="text-foreground">₹{cost.toLocaleString("en-IN")}/mo</span>
                      </div>
                    );
                  })}

                  <div className="border-t border-border/40 pt-2 flex justify-between font-black text-slate-800 dark:text-slate-200">
                    <span>Monthly Subtotal</span>
                    <span>₹{Number(quote.raw_total).toLocaleString("en-IN")}/mo</span>
                  </div>

                  {durationMonths > 1 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-bold">
                      <span>Contract Base ({durationMonths} months)</span>
                      <span className="text-foreground">₹{(Number(quote.raw_total) * durationMonths).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {quote.discount_percent > 0 && (
                    <div className="flex justify-between text-emerald font-black">
                      <span>Contract Discount ({quote.discount_percent}%)</span>
                      <span>−₹{Number(quote.discount_amount).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {durationMonths > 1 && (
                    <div className="flex justify-between font-black text-slate-800 dark:text-slate-200">
                      <span>Contract Subtotal</span>
                      <span>₹{Number(quote.total).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {/* GST calculations */}
                  <div className="flex justify-between font-semibold">
                    <span>GST ({config.gst_percent}%)</span>
                    <span className="text-foreground">₹{(Number(quote.total) * config.gst_percent / 100).toLocaleString("en-IN")}</span>
                  </div>

                  {/* Upgrade Net Diff view */}
                  {propMode === "upgrade" && currentQuote && (
                    <div className="border-t border-dashed border-border bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl space-y-1.5 mt-2">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Current Subscription:</span>
                        <span>₹{Number(currentQuote.total).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between font-black text-xs text-brand">
                        <span>Net Upgrade Increase:</span>
                        <span>+₹{Math.max(0, Number(quote.total) - Number(currentQuote.total)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  )}

                  {/* Grand total highlight */}
                  <div className="border-t border-border pt-4 flex justify-between items-baseline font-black">
                    <span className="text-sm uppercase tracking-wider text-slate-500">Grand Total</span>
                    <div className="text-right">
                      <span className="text-emerald font-display text-3xl">
                        ₹{(Number(quote.total) * (1 + config.gst_percent / 100)).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground block uppercase tracking-wider mt-0.5">
                        Due contractually
                      </span>
                    </div>
                  </div>
                </div>
              ) : quoteError ? (
                <span className="text-xs text-coral font-bold">{quoteError}</span>
              ) : (
                <span className="text-xs text-coral font-bold">Failed to load pricing proposal.</span>
              )}
            </div>

            {/* Simulated Payment failure checkbox */}
            {(propMode === "registration" || propMode === "upgrade") && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between text-xs">
                <label htmlFor="simUpgradeFail" className="flex items-center gap-2 cursor-pointer text-red-500 font-semibold">
                  <ShieldAlert className="h-4 w-4 shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold">Simulate Payment Failure</span>
                    <span className="text-[8px] text-muted-foreground/60 block mt-0.5">Test payment gate error page</span>
                  </div>
                </label>
                <input
                  type="checkbox"
                  id="simUpgradeFail"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded border-red-500/30 text-red-500 h-4 w-4 cursor-pointer"
                />
              </div>
            )}

            {/* Interactive submit button actions */}
            <div className="pt-2">
              {propMode === "upgrade" ? (
                <Button
                  type="button"
                  onClick={handleUpgradeSubmit}
                  disabled={submitting || propIsSubmitting || !quote || state.planComponents.length === 0}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 font-bold shadow-md gap-2 border-none cursor-pointer flex items-center justify-center text-white"
                >
                  {(submitting || propIsSubmitting) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing Upgrade...
                    </>
                  ) : (
                    <>Submit Upgrade Plan <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              ) : propMode === "registration" ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={handleRegistrationSubmit}
                    disabled={submitting || propIsSubmitting || !quote || state.planComponents.length === 0}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 font-bold shadow-md gap-2 border-none cursor-pointer flex items-center justify-center text-white"
                  >
                    {(submitting || propIsSubmitting) ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Preparing Checkout...
                      </>
                    ) : (
                      <>Continue to Checkout <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              ) : null}

              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="w-full h-10 rounded-xl font-bold mt-2 cursor-pointer"
                >
                  Cancel & Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION OVERWRITE MODAL FOR APPLY ALL */}
      {showApplyAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-background p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold">Overwrite Branch Settings?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              This will overwrite configurations for Branch 2 and other branches and copy Branch 1's setup to them. Do you want to continue?
            </p>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/60">
              <Button variant="outline" onClick={() => setShowApplyAllModal(false)} className="rounded-xl">Cancel</Button>
              <Button
                variant="brand"
                className="rounded-xl"
                onClick={() => {
                  setBranches((prev) => {
                    const next = [...prev];
                    const b1 = next[0];
                    for (let i = 1; i < next.length; i++) {
                      next[i] = {
                        ...JSON.parse(JSON.stringify(b1)),
                        name: next[i].name,
                      };
                    }
                    return next;
                  });
                  setApplyToAll(true);
                  setShowApplyAllModal(false);
                }}
              >
                Continue & Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
