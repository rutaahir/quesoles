import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Sun, Moon, Building2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuesole, apiFetch } from "@/lib/quesole/store";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/$companySlug/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Corporate Portal | Quesole" },
      {
        name: "description",
        content: "Sign in to your corporate queue management console.",
      },
    ],
  }),
  component: CompanyLoginPage,
});

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
  primaryColor?: string;
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
  primaryColor = "#7C3AED",
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
        style={{
          boxShadow: focused && !shouldReduceMotion ? `0 0 20px ${primaryColor}20` : undefined,
          borderColor: focused ? primaryColor : undefined,
        }}
        className={cn(
          "relative rounded-2xl transition-all duration-300 p-[2px] bg-slate-200 dark:bg-slate-800 border border-transparent",
          focused && "scale-[1.01]"
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
              style={{ color: focused ? primaryColor : undefined }}
              className={cn(
                "h-5 w-5 mr-3 transition-colors duration-300 shrink-0",
                focused ? "" : "text-muted-foreground/60"
              )}
            />
          )}
          <div className="relative flex-1 h-full flex items-center">
            <label
              htmlFor={id}
              style={{ color: isLabelFloating ? primaryColor : undefined }}
              className={cn(
                "absolute left-0 font-semibold uppercase tracking-[0.15em] transition-all duration-300 pointer-events-none select-none",
                isLabelFloating 
                  ? "text-[9px] -translate-y-3.5 font-bold" 
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
          className="text-xs font-semibold text-destructive mt-1.5 ml-2"
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

function CompanyLoginPage() {
  const { companySlug } = Route.useParams();
  const { signIn } = useQuesole();
  const navigate = useNavigate();

  const [company, setCompany] = useState<any | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Load public company data based on slug
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const data = await apiFetch(`/api/public/company/${companySlug}/`);
        setCompany(data);
      } catch (err: any) {
        console.error("Failed to resolve corporate portal:", err);
        setCompanyError(err.message || "This corporate portal is not available.");
      } finally {
        setIsLoadingCompany(false);
      }
    };
    fetchCompanyData();
  }, [companySlug]);

  const primaryColor = company?.booking_config?.primary_color || "#7C3AED";
  const portalName = company?.booking_config?.portal_name || companySlug.toUpperCase();
  const logoUrl = company?.booking_config?.logo_url;

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    
    let hasError = false;
    if (!email.includes("@")) {
      setEmailError(true);
      hasError = true;
    } else {
      setEmailError(false);
    }

    if (password.length < 4) {
      setPasswordError(true);
      hasError = true;
    } else {
      setPasswordError(false);
    }

    if (hasError) {
      setError("Please fix the validation errors below.");
      return;
    }

    setError(null);
    setEmailError(false);
    setPasswordError(false);
    setLoading(true);
    
    try {
      await signIn(email, password);
      toast.success("Signed in successfully", { description: `Welcome back to the ${portalName} console.` });
      void navigate({ to: "/app" });
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
      toast.error("Sign in failed", { description: err?.message || "Please check your credentials." });
    } finally {
      setLoading(false);
    }
  }

  if (isLoadingCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19]">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resolving Portal Details...</p>
        </div>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#0B0F19] px-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 text-center space-y-5 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Corporate Portal Inactive</h2>
          <p className="text-sm text-muted-foreground leading-normal">{companyError}</p>
          <div className="pt-2">
            <Link to="/login" className="text-brand hover:underline font-bold text-sm block">
              Go to Standard Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[9fr_11fr] bg-[#FAFAFA] dark:bg-[#0B0F19] font-sans overflow-hidden">
      
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 z-10 bg-[#FAFAFA] dark:bg-[#0B0F19]">
        
        <div className="absolute top-8 right-8 z-30">
          <ThemeToggle />
        </div>

        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-brand/5 dark:bg-brand/10 blur-[100px] pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-md mx-auto space-y-10 relative"
        >
          <motion.div variants={itemVariants}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 w-auto max-h-12 object-contain" />
            ) : (
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <Building2 className="h-6 w-6" />
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="font-display text-3xl lg:text-4xl font-black tracking-tighter text-foreground leading-tight">
              Sign in to {portalName}
            </h1>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground/80 uppercase">
              Corporate queue operations portal
            </p>
          </motion.div>

          <motion.form variants={itemVariants} className="space-y-6" onSubmit={submit}>
            <div className="space-y-4">
              <FloatingInput
                id="email"
                label="Work email"
                type="email"
                value={email}
                onChange={setEmail}
                error={emailError}
                errorMessage="Enter a valid work email address"
                placeholder="you@company.com"
                icon={Mail}
                primaryColor={primaryColor}
              />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span />
                  <Link to="/forgot-password" style={{ color: primaryColor }} className="text-[10px] font-bold uppercase tracking-wider hover:opacity-80 transition-opacity z-20">
                    Forgot password?
                  </Link>
                </div>
                <FloatingInput
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  error={passwordError}
                  errorMessage="Password is required"
                  placeholder="••••••••"
                  icon={Lock}
                  primaryColor={primaryColor}
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
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive text-xs font-semibold leading-normal flex items-start gap-2.5">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
              className="w-full h-14 rounded-2xl text-white font-bold text-lg shadow-xl shadow-brand/10 hover:opacity-90 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] gap-2 border-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </motion.form>

          <motion.div variants={itemVariants} className="flex justify-center text-xs font-semibold text-muted-foreground/60 border-t border-border/40 pt-6">
            <span>Powered by Quesole queue analytics</span>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative hidden lg:block overflow-hidden bg-slate-900 h-full">
        {/* Soft atmospheric gradient panels using company primary color */}
        <div 
          style={{ background: `radial-gradient(circle at 80% 20%, ${primaryColor}20, transparent 60%)` }}
          className="absolute inset-0 z-10 pointer-events-none" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-5 pointer-events-none" />

        <div className="absolute inset-0 flex flex-col justify-end p-20 z-20 pointer-events-none space-y-6 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight">
              Orchestrating live customer queues.
            </h2>
            <p className="text-lg font-medium text-slate-350 dark:text-slate-400">
              Welcome to the customized operations dashboard for {portalName}. Start managing branches and operator desks.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
