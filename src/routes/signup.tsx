import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, CreditCard, ShieldAlert, Sparkles, MapPin, Phone, User, Mail, Lock, Eye, EyeOff, Sun, Moon, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { useQuesole } from "@/lib/quesole/store";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BillingPlanConfigurator } from "@/components/console/billing-plan-configurator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import loginVideo from "@/assets/login.mp4";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Register your company — Itemized Plan Builder | Quesole" },
      {
        name: "description",
        content: "Configure your custom queue management plan with itemized components and start immediately.",
      },
    ],
  }),
  component: SignupPage,
});

const STEPS = ["Company & Admin", "Build Your Plan", "Payment"] as const;

const INDUSTRIES = [
  "Healthcare",
  "Banking & Finance",
  "Government",
  "Retail & Service",
  "Education",
  "Telecom",
  "Corporate Office",
];

interface Form {
  company: string;
  industry: string;
  city: string;
  address: string;
  website: string;
  adminName: string;
  email: string;
  password: string;
  confirmPassword: string;
  captchaInput: string;
  phone: string;
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  simulateFailure: boolean;
  durationMonths?: number;
  solution?: string;
  branches?: any[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

interface FloatingInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  errorMessage?: string | undefined;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  rightElement?: React.ReactNode;
}

function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  error,
  errorMessage,
  placeholder,
  icon: Icon,
  rightElement,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isFilled = value.length > 0;
  const isLabelFloating = focused || isFilled;

  return (
    <div className="w-full">
      <motion.div
        animate={error && !shouldReduceMotion ? { x: [-4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative rounded-2xl transition-all duration-300 p-[2px] bg-slate-200 dark:bg-slate-800",
          focused && !shouldReduceMotion && "animate-border-glow bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.15)] scale-[1.01]",
          focused && shouldReduceMotion && "bg-brand/50 border-brand",
          error && "bg-destructive/80"
        )}
      >
        <div
          className={cn(
            "relative h-[54px] rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center px-4 w-full transition-all duration-300",
            focused ? "bg-white dark:bg-slate-950" : ""
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                "h-5 w-5 mr-3 transition-colors duration-300 shrink-0",
                focused ? "text-brand" : "text-muted-foreground/60"
              )}
            />
          )}
          <div className="relative flex-1 h-full flex items-center">
            <label
              htmlFor={id}
              className={cn(
                "absolute left-0 font-semibold uppercase tracking-[0.15em] transition-all duration-300 pointer-events-none select-none",
                isLabelFloating 
                  ? "text-[9px] -translate-y-3.5 text-brand font-bold" 
                  : "text-xs text-muted-foreground/80 translate-y-0"
              )}
            >
              {label}
            </label>
            <input
              id={id}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                "w-full bg-transparent outline-none border-none text-foreground font-medium text-base pt-3.5 h-full transition-all pr-8",
                isLabelFloating ? "opacity-100" : "opacity-0 focus:opacity-100"
              )}
              placeholder={focused ? placeholder : ""}
              aria-label={label}
            />
          </div>
          {rightElement && (
            <div className="absolute right-4 flex items-center shrink-0 z-20">
              {rightElement}
            </div>
          )}
        </div>
      </motion.div>
      {error && errorMessage && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold text-destructive mt-1.5 ml-2 text-left"
        >
          {errorMessage}
        </motion.p>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={toggleTheme} 
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900 text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm border border-border/40 cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-amber-500" />}
    </button>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { state, actions, setSession } = useQuesole();
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupQuote, setSignupQuote] = useState<any | null>(null);
  const [companyAddons, setCompanyAddons] = useState<Record<string, number>>({});
  const [comingFromPayment, setComingFromPayment] = useState(false);
  const [portalConfig, setPortalConfig] = useState<any>(null);

  const getComponentRate = (key: string, defaultPrice: number = 100) => {
    const comp = state.planComponents.find((c) => c.key === key);
    return comp ? Number(comp.price_per_unit) : defaultPrice;
  };

  const [captchaCode, setCaptchaCode] = useState("");
  const generateCaptcha = () => {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    setCaptchaCode(code);
  };
  useEffect(() => {
    generateCaptcha();
  }, []);

  const [form, setForm] = useState<Form>({
    company: "",
    industry: "Healthcare",
    city: "",
    address: "",
    website: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
    captchaInput: "",
    phone: "",
    cardName: "Admin Cardholder",
    cardNumber: "4242 •••• •••• 4242",
    cardExpiry: "12/28",
    cardCvc: "123",
    simulateFailure: false,
  });

  const activeComponents = useMemo(() => {
    return state.planComponents.filter((c) => c.is_active);
  }, [state.planComponents]);

  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    state.planComponents.forEach((c) => {
      init[c.key] = c.default_included_qty;
    });
    return init;
  });

  useEffect(() => {
    if (state.planComponents.length > 0 && Object.keys(selections).length === 0) {
      const init: Record<string, number> = {};
      state.planComponents.forEach((c) => {
        init[c.key] = c.default_included_qty;
      });
      setSelections(init);
    }
  }, [state.planComponents, selections]);

  const setFormKey = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const setQty = (key: string, delta: number, minQty: number, maxQty: number | null) => {
    setSelections((prev) => {
      const current = prev[key] ?? 0;
      let nextVal = current + delta;
      if (nextVal < minQty) nextVal = minQty;
      if (maxQty !== null && nextVal > maxQty) nextVal = maxQty;
      return { ...prev, [key]: nextVal };
    });
  };

  const setToggle = (key: string, enabled: boolean) => {
    setSelections((prev) => ({ ...prev, [key]: enabled ? 1 : 0 }));
  };

  const errors: Partial<Record<keyof Form, string>> = {};
  if (step === 0) {
    if (form.company.trim().length < 3) errors.company = "Company name must be at least 3 characters.";
    if (form.city.trim().length < 2) errors.city = "Specify your primary branch city.";
    if (form.address.trim().length < 5) errors.address = "Specify your complete company address.";
    if (form.adminName.trim().length < 3) errors.adminName = "Enter administrator's full name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) errors.email = "Valid work email required.";
    if (form.password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
    if (form.captchaInput !== captchaCode) errors.captchaInput = "Incorrect captcha code.";
  }

  const valid = Object.keys(errors).length === 0;

  const orderSummary = useMemo(() => {
    const items = activeComponents.map((c) => {
      const qty = selections[c.key] ?? c.default_included_qty;
      const extraQty = Math.max(0, qty - c.default_included_qty);
      const subtotal = c.is_toggle
        ? (qty > 0 ? c.price_per_unit : 0)
        : extraQty * c.price_per_unit;

      return {
        key: c.key,
        label: c.label,
        unit_label: c.unit_label,
        is_toggle: c.is_toggle,
        default_included_qty: c.default_included_qty,
        qty,
        extraQty,
        price_per_unit: c.price_per_unit,
        subtotal,
      };
    });

    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    return { items, total };
  }, [activeComponents, selections]);

  function next() {
    setTouched(true);
    if (!valid) {
      if (errors.confirmPassword) {
        toast.error("Passwords do not match.");
      } else if (errors.captchaInput) {
        toast.error("Incorrect captcha code.");
      } else {
        toast.error("Please fill all required administrator fields correctly.");
      }
      return;
    }
    setTouched(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function handleSubmitPayment() {
    setSubmitting(true);
    try {
      // Map branches from frontend camelCase to backend snake_case format
      const mappedBranches = form.branches ? form.branches.map((b) => ({
        name: b.name,
        mode: b.mode,
        channel_type: b.channel_type || "ONSITE_ONLY",
        service_qty: b.serviceQty,
        operator_qty: b.operatorQty,
        kiosk_qty: b.kioskQty,
        token_delivery_selections: b.tokenDeliverySelections,
        addons: {
          operator_screens: b.addons?.operator_screens || 0,
          paper_roll_screens: b.addons?.paper_roll_screens || 0,
          services: b.addons?.services || 0,
          printed_qr: b.addons?.printed_qr || 0,
        },
      })) : [];

      const { companyId, branchId } = await actions.checkoutItemizedRegistration({
        companyName: form.company,
        industry: form.industry,
        city: form.city,
        contactName: form.adminName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone || "9999999999",
        itemizedSelections: selections,
        branches: mappedBranches,
        companyAddons: companyAddons,
        durationMonths: form.durationMonths || 1,
        quoteId: signupQuote?.quote_id,
        simulateFailure: form.simulateFailure,
        portalName: portalConfig?.portalName,
        logoUrl: portalConfig?.logoUrl,
        primaryColor: portalConfig?.primaryColor,
        displayAddress: portalConfig?.displayAddress,
        enabledCustomerFields: portalConfig?.enabledCustomerFields,
        enabledBookingFields: portalConfig?.enabledBookingFields,
        enabledNotificationChannels: portalConfig?.enabledNotificationChannels,
        companySlug: portalConfig?.companySlug,
        website: form.website,
      });

      setSession({
        role: "company_admin",
        name: form.adminName,
        email: form.email,
        companyId,
        branchId,
        deskId: "",
      });

      setSubmitting(false);
      setDone(true);
      toast.success("Account activated successfully!");
    } catch (err: any) {
      setSubmitting(false);
      toast.error(err.message || "Payment authorization failed");
    }
  }

  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn(
      "grid min-h-screen lg:h-screen bg-[#FAFAFA] dark:bg-[#0B0F19] font-sans overflow-y-auto lg:overflow-hidden",
      step === 1 ? "grid-cols-1" : "lg:grid-cols-[11fr_9fr]"
    )}>
      
      {/* Styles for complex conic gradient focus border loops */}
      <style>{`
        @keyframes borderRotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-border-glow {
          background-size: 200% 200%;
          animation: borderRotate 3s linear infinite;
        }
        @keyframes btnGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-btn-gradient {
          background-size: 200% auto;
          animation: btnGradient 5s ease infinite;
        }
      `}</style>

      {/* Left Panel: Video & Showcase (55%) */}
      <div className={cn(
        "relative hidden overflow-hidden bg-[#0B0F19] h-full",
        step !== 1 && "lg:block"
      )}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          preload="auto"
          poster="/login-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-40 scale-110 translate-y-4"
        >
          <source src={loginVideo} type="video/mp4" />
        </video>
        
        {/* Cinematic Overlays / Vignettes (dissolves to the right seam!) */}
        <div className="absolute top-0 right-0 bottom-0 w-[12%] bg-gradient-to-l from-[#FAFAFA] dark:from-[#0B0F19] via-[#FAFAFA]/60 dark:via-[#0B0F19]/60 to-transparent z-10 pointer-events-none" />
        
        {/* Live Stat Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="absolute top-16 left-10 z-20"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white uppercase tracking-widest shadow-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            32 branches orchestrated live
          </div>
        </motion.div>
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-20 z-20 pointer-events-none">
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="space-y-4 max-w-xl"
          >
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
              Orchestrate your branches with pure intelligence.
            </h2>
            <p className="text-lg font-medium text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              The world's most elegant smart-queue management platform.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right/Main Panel: Form Wizard */}
      <div className={cn(
        "relative flex flex-col z-10 bg-[#FAFAFA] dark:bg-[#0B0F19] min-h-screen lg:h-screen lg:overflow-y-auto",
        step === 1 ? "justify-start px-4 sm:px-6 lg:px-8" : "justify-center px-6 sm:px-12 lg:px-16 xl:px-20"
      )}>

        {/* Soft Radial Ambient Glow */}
        <div className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-brand/5 dark:bg-brand/10 blur-[100px] pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={cn(
            "w-full mx-auto relative space-y-8",
            step === 1 ? "max-w-6xl" : "max-w-xl"
          )}
        >
          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              <h1 className="font-display text-3xl font-black tracking-tight leading-none">
                Welcome to Quesole!
              </h1>
              <p className="text-sm text-muted-foreground/80 font-medium max-w-sm mx-auto">
                Your itemized subscription for **{form.company}** is active. Your dashboard is ready to go.
              </p>
              <Button
                variant="brand"
                size="lg"
                onClick={() => navigate({ to: "/app" })}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 font-bold text-lg shadow-xl shadow-brand/10 cursor-pointer border-none"
              >
                Enter Command Console <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Logo */}
              <div className="flex justify-between items-center">
                <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Logo size={48} />
                </Link>
                <ThemeToggle />
              </div>

              {/* Step Header */}
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/50 dark:bg-slate-900/50 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-brand">
                  <Building2 className="h-3.5 w-3.5 text-brand" /> Company Onboarding
                </span>
                <h1 className="font-display text-3xl font-black tracking-tighter text-foreground leading-tight">
                  Configure your plan & registration
                </h1>
              </div>

              {/* Progress Steps Indicators */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-border/40 w-fit">
                {STEPS.map((st, i) => (
                  <div key={st} className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300",
                        i === step
                          ? "bg-brand text-white shadow-md shadow-brand/10 scale-105"
                          : i < step
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-transparent text-muted-foreground/60",
                      )}
                    >
                      {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider pr-1.5 hidden md:inline",
                        i === step ? "text-foreground" : "text-muted-foreground/60",
                      )}
                    >
                      {st}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className="h-1.5 w-1.5 rounded-full bg-border/80 hidden md:block" />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Contents */}
              <div className="pt-2">
                {step === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 block">
                        Company Profile
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FloatingInput
                          id="company"
                          label="Company Name"
                          type="text"
                          value={form.company}
                          onChange={(v) => setFormKey("company", v)}
                          error={touched && !!errors.company}
                          errorMessage={errors.company}
                          placeholder="e.g. Tata Consultancy Services"
                          icon={Building2}
                        />
                        
                        <div className="relative flex flex-col justify-center w-full">
                          <div className="relative rounded-2xl transition-all duration-300 p-[2px] bg-slate-200 dark:bg-slate-800">
                            <div className="relative h-[54px] rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center w-full">
                              <label className="absolute top-1 left-4 text-[9px] font-bold uppercase tracking-[0.15em] text-brand select-none pointer-events-none z-20">
                                Industry
                              </label>
                              <Select value={form.industry} onValueChange={(v) => setFormKey("industry", v)}>
                                <SelectTrigger className="h-full rounded-xl bg-transparent border-none px-4 pt-3.5 text-foreground text-sm flex items-center justify-between shadow-none outline-none focus:ring-0 focus-visible:ring-0 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-border/80 bg-white dark:bg-slate-950 shadow-xl">
                                  {INDUSTRIES.map((ind) => (
                                    <SelectItem key={ind} value={ind} className="font-medium text-sm">{ind}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FloatingInput
                          id="phone"
                          label="Contact Phone"
                          type="text"
                          value={form.phone}
                          onChange={(v) => setFormKey("phone", v)}
                          placeholder="e.g. 9876543210"
                          icon={Phone}
                        />
                        <FloatingInput
                          id="website"
                          label="Company Website (If available)"
                          type="text"
                          value={form.website}
                          onChange={(v) => setFormKey("website", v)}
                          placeholder="e.g. https://tata.com"
                          icon={Globe}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <FloatingInput
                            id="address"
                            label="Address"
                            type="text"
                            value={form.address}
                            onChange={(v) => setFormKey("address", v)}
                            error={touched && !!errors.address}
                            errorMessage={errors.address}
                            placeholder="e.g. Mithakhali Six Roads"
                            icon={MapPin}
                          />
                        </div>
                        <FloatingInput
                          id="city"
                          label="City"
                          type="text"
                          value={form.city}
                          onChange={(v) => setFormKey("city", v)}
                          error={touched && !!errors.city}
                          errorMessage={errors.city}
                          placeholder="e.g. Ahmedabad"
                          icon={Globe}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 block">
                        Company Admin Credentials
                      </span>
                      <FloatingInput
                        id="adminName"
                        label="Name of Contact Person"
                        type="text"
                        value={form.adminName}
                        onChange={(v) => setFormKey("adminName", v)}
                        error={touched && !!errors.adminName}
                        errorMessage={errors.adminName}
                        placeholder="e.g. Rajesh Shah"
                        icon={User}
                      />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <FloatingInput
                            id="email"
                            label="Work Email"
                            type="email"
                            value={form.email}
                            onChange={(v) => setFormKey("email", v)}
                            error={touched && !!errors.email}
                            errorMessage={errors.email}
                            placeholder="admin@company.com"
                            icon={Mail}
                          />
                        </div>
                        <FloatingInput
                          id="password"
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(v) => setFormKey("password", v)}
                          error={touched && !!errors.password}
                          errorMessage={errors.password}
                          placeholder="••••••••"
                          icon={Lock}
                          rightElement={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-muted-foreground/60 hover:text-foreground transition-colors outline-none cursor-pointer flex items-center justify-center p-1"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          }
                        />
                        <FloatingInput
                          id="confirmPassword"
                          label="Confirm Password"
                          type={showPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(v) => setFormKey("confirmPassword", v)}
                          error={touched && !!errors.confirmPassword}
                          errorMessage={errors.confirmPassword}
                          placeholder="••••••••"
                          icon={Lock}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border/40">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 block">
                        Security Verification
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 justify-center select-none relative overflow-hidden h-[54px]">
                          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
                          <span className="font-mono text-xl font-bold tracking-widest text-brand skew-y-3 blur-[0.3px] rotate-2 dark:text-violet-400">
                            {captchaCode}
                          </span>
                          <button
                            type="button"
                            onClick={generateCaptcha}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0 text-muted-foreground/60 hover:text-foreground cursor-pointer border-none bg-transparent"
                            aria-label="Refresh Captcha"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                            </svg>
                          </button>
                        </div>
                        <FloatingInput
                          id="captchaInput"
                          label="Captcha (Numbers)"
                          type="text"
                          value={form.captchaInput}
                          onChange={(v) => setFormKey("captchaInput", v)}
                          error={touched && !!errors.captchaInput}
                          errorMessage={errors.captchaInput}
                          placeholder="Enter Captcha Code"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button 
                        type="button"
                        onClick={next}
                        className={cn(
                          "w-full h-14 rounded-2xl text-white font-bold text-lg shadow-xl shadow-brand/10 hover:shadow-brand/30 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] gap-2 border-none cursor-pointer",
                          shouldReduceMotion 
                            ? "bg-brand" 
                            : "bg-[linear-gradient(270deg,#7C3AED,#3B82F6,#7C3AED)] animate-btn-gradient"
                        )}
                      >
                        Continue to Plan Builder <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <BillingPlanConfigurator
                      mode="registration"
                      initialStep={comingFromPayment ? 4 : 1}
                      initialData={{
                        solution: form.solution || "ONSITE_ONLINE",
                        branchesCount: selections["branches"] || 1,
                        durationMonths: form.durationMonths || 1,
                        branches: form.branches,
                        companyName: form.company,
                        locationAddress: form.address || form.city,
                        companyAddons: companyAddons,
                      }}
                      onSubmit={async (configData: any) => {
                        setSelections(configData.itemizedSelections);
                        setCompanyAddons(configData.companyAddons || {});
                        setFormKey("simulateFailure", configData.simulateFailure);
                        setSignupQuote(configData.quote);
                        setPortalConfig(configData);
                        setForm((f) => ({
                          ...f,
                          durationMonths: configData.durationMonths,
                          solution: configData.solution,
                          branches: configData.branches,
                        }));
                        setStep(2);
                      }}
                      onCancel={() => {
                        setComingFromPayment(false);
                        setStep(0);
                      }}
                    />
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                      <div>
                        <h2 className="text-lg font-black tracking-tight">Review & Payment</h2>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Confirm details and activate account</p>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-500 font-display text-2xl font-black block">
                          ₹{signupQuote ? Number(signupQuote.grand_total).toLocaleString("en-IN") : "0"}
                        </span>
                        {form.durationMonths && form.durationMonths > 1 && (
                          <span className="text-[9px] font-bold text-emerald block uppercase tracking-wider mt-0.5 text-right max-w-[200px] leading-tight">
                            Total for {form.durationMonths} months (₹{Number(signupQuote.raw_total).toLocaleString("en-IN")}/mo base)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Plan Summary Badge */}
                    <div className="rounded-2xl border border-border/60 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Selected Company Info</span>
                        <div className="flex justify-between items-center text-sm font-bold text-foreground">
                          <span>{form.company} ({form.city})</span>
                          <span className="text-xs text-muted-foreground font-medium">Industry: {form.industry}</span>
                        </div>
                      </div>
                      
                      <div className="border-t border-border/40 pt-3 space-y-2 border-b border-border/20 pb-3 last:border-none">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest block">Configure Branches ({form.branches?.length || 1})</span>
                        {form.branches && form.branches.map((b, idx) => (
                          <div key={idx} className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-b border-border/30 pb-2 last:border-none last:pb-0">
                            <span className="text-foreground font-black block mb-0.5">{b.name} ({b.mode === "SERVICE_BASED" ? "Service Based" : "Single Queue"})</span>
                            • Seat Count: <strong className="text-foreground">{b.mode === "SERVICE_BASED" ? b.serviceQty : b.operatorQty}</strong> | 
                            {" "}Kiosks: <strong className="text-foreground">{b.kioskQty}</strong>
                            {b.addons?.printed_qr > 0 ? " | QR Ticketing: Enabled" : ""}
                            {b.tokenDeliverySelections?.length > 0 ? ` | Delivery: ${b.tokenDeliverySelections.join(", ")}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Itemized Pricing Review */}
                    {signupQuote && (
                      <div className="rounded-2xl border border-border/60 bg-white dark:bg-slate-900/50 p-4 space-y-2.5 text-xs">
                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">Price Breakdown (Itemized)</span>
                        <div className="space-y-1.5 font-medium border-t border-border/40 pt-2">
                          {Number(signupQuote.itemized.branches_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Branches Setup ({form.branches?.length || 1} {(form.branches?.length || 1) > 1 ? "branches" : "branch"} x ₹{getComponentRate("branches")}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.branches_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.online_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Online Booking Module ({form.branches?.filter(b => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID").length || 0} {(form.branches?.filter(b => b.channel_type === "ONLINE_ONLY" || b.channel_type === "HYBRID").length || 0) > 1 ? "branches" : "branch"} x ₹{getComponentRate("online_module", 5000)}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.online_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.operators_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Operator Desks ({form.branches?.reduce((acc, b) => acc + (b.operatorQty || 0), 0) || 0} {(form.branches?.reduce((acc, b) => acc + (b.operatorQty || 0), 0) || 0) > 1 ? "seats" : "seat"} x ₹{getComponentRate("operator_screens", 1200)}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.operators_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.services_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Service lines ({form.branches?.reduce((acc, b) => acc + (b.serviceQty || 0), 0) || 0} {(form.branches?.reduce((acc, b) => acc + (b.serviceQty || 0), 0) || 0) > 1 ? "services" : "service"} x ₹{getComponentRate("services", 800)}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.services_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.kiosks_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Display Units & Kiosks ({form.branches?.reduce((acc, b) => acc + (b.kioskQty || 0), 0) || 0} {(form.branches?.reduce((acc, b) => acc + (b.kioskQty || 0), 0) || 0) > 1 ? "kiosks" : "kiosk"} x ₹{getComponentRate("paper_roll_screens", 1500)}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.kiosks_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.qr_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                QR Self-Ticketing Addon ({form.branches?.reduce((acc, b) => acc + (b.addons?.printed_qr || 0), 0) || 0} {(form.branches?.reduce((acc, b) => acc + (b.addons?.printed_qr || 0), 0) || 0) > 1 ? "addons" : "addon"} x ₹{getComponentRate("printed_qr", 990)}/mo)
                              </span>
                              <span>₹{Number(signupQuote.itemized.qr_subtotal).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          {Number(signupQuote.itemized.delivery_subtotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Notification Channels</span>
                              <span>₹{Number(signupQuote.itemized.delivery_subtotal).toLocaleString("en-IN")}</span>
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
                                <span className="text-muted-foreground">
                                  {label} Addon (x {qty} x ₹{price.toLocaleString("en-IN")}/mo)
                                </span>
                                <span>₹{cost.toLocaleString("en-IN")}</span>
                              </div>
                            );
                          })}
                          <div className="border-t border-border/40 pt-1.5 flex justify-between font-semibold">
                            <span className="text-muted-foreground">Monthly Subtotal</span>
                            <span>₹{Number(signupQuote.raw_total).toLocaleString("en-IN")}/mo</span>
                          </div>
                          {signupQuote.discount_percent > 0 && (
                            <div className="flex justify-between text-emerald-500 font-semibold">
                              <span>Duration Discount ({signupQuote.discount_percent}%)</span>
                              <span>−₹{Number(signupQuote.discount_amount).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground font-semibold">
                            <span>Contract Subtotal ({form.durationMonths || 1} mo)</span>
                            <span>₹{Number(signupQuote.total).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground font-semibold">
                            <span>GST ({Number(signupQuote.gst_percent)}%)</span>
                            <span>₹{Number(signupQuote.gst_amount).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-foreground font-black text-sm border-t border-border/60 pt-1.5">
                            <span>Grand Total</span>
                            <span className="text-emerald-500">₹{Number(signupQuote.grand_total).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Gateway Box */}
                    <div className="space-y-4 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-brand" /> Secure Payment Details
                        </h3>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Test Mode
                        </span>
                      </div>

                      <div className="space-y-3">
                        <FloatingInput
                          id="cardName"
                          label="Cardholder Name"
                          type="text"
                          value={form.cardName}
                          onChange={(v) => setFormKey("cardName", v)}
                          placeholder="e.g. Admin Cardholder"
                          icon={User}
                        />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <FloatingInput
                              id="cardNumber"
                              label="Card Number"
                              type="text"
                              value={form.cardNumber}
                              onChange={(v) => setFormKey("cardNumber", v)}
                              placeholder="4242 •••• •••• 4242"
                              icon={CreditCard}
                            />
                          </div>
                          <div className="relative flex items-center">
                            <FloatingInput
                              id="cardExpiry"
                              label="Expiry / CVC"
                              type="text"
                              value={`${form.cardExpiry} / ${form.cardCvc}`}
                              onChange={() => {}}
                              placeholder="MM/YY / CVC"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Simulation Test switch */}
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-red-500">
                          <ShieldAlert className="h-5 w-5 shrink-0" />
                          <div className="text-xs font-semibold leading-normal">
                            <span>Simulate Gateway Failure</span>
                            <span className="text-[9px] text-muted-foreground/70 block uppercase tracking-wider mt-0.5">Toggle to test the payment rejection error</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={form.simulateFailure}
                          onChange={(e) => setFormKey("simulateFailure", e.target.checked)}
                          className="rounded border-red-500/30 text-red-500 h-4 w-4 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-4 pt-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setComingFromPayment(true);
                          setStep(1);
                        }}
                        className="flex-1 h-14 rounded-2xl font-bold border-border/80 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back
                      </Button>
                      <Button 
                        type="button" 
                        disabled={submitting} 
                        onClick={handleSubmitPayment}
                        className={cn(
                          "flex-[1.5] h-14 rounded-2xl text-white font-bold text-lg shadow-xl shadow-brand/10 hover:shadow-brand/30 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] gap-2 border-none cursor-pointer",
                          shouldReduceMotion 
                            ? "bg-brand" 
                            : "bg-[linear-gradient(270deg,#7C3AED,#3B82F6,#7C3AED)] animate-btn-gradient"
                        )}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Authorizing...
                          </>
                        ) : (
                          <>Authorize & Activate Account</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Secure SSL Connection Footer */}
              <div className="flex flex-col items-center justify-center gap-4 pt-4 border-t border-border/40 text-muted-foreground/60 text-xs font-semibold">
                <div className="text-center text-xs font-semibold text-muted-foreground/80">
                  Already have a company account?{" "}
                  <Link to="/login" className="text-brand hover:underline font-bold">
                    Sign in instead
                  </Link>
                </div>
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-border/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Secure Connection (SSL/TLS)
                </span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Root Vignettes covering the entire screen to eliminate vertical line cutoffs */}
      {step !== 1 && (
        <>
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 dark:from-black/50 to-transparent z-25 pointer-events-none hidden lg:block" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 dark:from-black/60 via-black/10 dark:via-black/20 to-transparent z-25 pointer-events-none hidden lg:block" />
        </>
      )}
    </div>
  );
}
