import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { useQuesole } from "@/lib/quesole/store";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import loginVideo from "@/assets/login.mp4";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Quesole console" },
      {
        name: "description",
        content:
          "Sign in to the Quesole console to run branch queues, monitor live dashboards and manage appointments.",
      },
      { property: "og:title", content: "Sign in to Quesole" },
      { property: "og:description", content: "Access your queue operations console." },
    ],
  }),
  component: LoginPage,
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

function LoginPage() {
  const { signIn } = useQuesole();
  const navigate = useNavigate();
  const [email, setEmail] = useState("rhea.mehta@apollocare.in");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const shouldReduceMotion = useReducedMotion();

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
      toast.success("Signed in", { description: "Welcome back to your operations console." });
      void navigate({ to: "/app" });
    } catch (err: any) {
      setError(err?.message || "Invalid email or password.");
      toast.error("Sign in failed", { description: err?.message || "Please check your credentials." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[9fr_11fr] bg-[#FAFAFA] dark:bg-[#0B0F19] font-sans overflow-hidden">
      
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

      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24 z-10 bg-[#FAFAFA] dark:bg-[#0B0F19]">
        
        <div className="absolute top-8 right-8 z-30">
          <ThemeToggle />
        </div>

        <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-brand/5 dark:bg-brand/10 blur-[100px] pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-md mx-auto relative space-y-10"
        >
          <motion.div variants={itemVariants}>
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo size={48} />
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-3">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter text-foreground leading-tight">
              Welcome back.
            </h1>
            <p className="text-sm font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Sign in to your operations console.
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
              />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span />
                  <Link to="/forgot-password" className="text-[10px] font-bold uppercase tracking-wider text-brand hover:text-brand/80 transition-colors z-20">
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
                  errorMessage="Password must be at least 4 characters"
                  placeholder="Enter password"
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
              </div>
            </div>

            {error && !emailError && !passwordError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-bold text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                {error}
              </motion.p>
            )}

            <Button 
              type="submit"
              size="lg" 
              disabled={loading}
              className={cn(
                "w-full h-14 rounded-2xl text-white font-bold text-lg shadow-xl shadow-brand/10 hover:shadow-brand/30 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] gap-2 group cursor-pointer border-none outline-none",
                shouldReduceMotion 
                  ? "bg-brand" 
                  : "bg-[linear-gradient(270deg,#7C3AED,#3B82F6,#7C3AED)] animate-btn-gradient"
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign in 
                  <ArrowRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Button>
          </motion.form>

          <motion.div 
            variants={itemVariants} 
            className="space-y-6 pt-2 text-center"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 block">
                Or sign in with
              </span>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => toast.info("Single Sign-On is not configured for your domain.")}
                  className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-white dark:bg-slate-900 border border-border/50 hover:scale-[1.02] shadow-sm hover:shadow-md hover:border-border transition-all duration-200 text-sm font-semibold text-foreground cursor-pointer"
                >
                  <img src="https://www.svgrepo.com/show/355037/google.svg" className="h-4 w-4" alt="" />
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Single Sign-On is not configured for your domain.")}
                  className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-white dark:bg-slate-900 border border-border/50 hover:scale-[1.02] shadow-sm hover:shadow-md hover:border-border transition-all duration-200 text-sm font-semibold text-foreground cursor-pointer"
                >
                  <img src="https://www.svgrepo.com/show/448240/microsoft.svg" className="h-4 w-4" alt="" />
                  Microsoft
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground/60 text-xs font-semibold">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-border/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Secure Connection (SSL/TLS)
              </span>
            </div>

            <div className="text-center pt-2">
              <span className="text-sm font-medium text-muted-foreground">New to Quesole? </span>
              <Link to="/signup" className="text-sm font-bold text-foreground hover:text-brand transition-colors">
                Register a company
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Panel: Video & Showcase (55%) */}
      <div className="relative hidden lg:block overflow-hidden bg-[#0B0F19]">
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
        
        <div className="absolute top-0 left-0 bottom-0 w-[12%] bg-gradient-to-r from-[#FAFAFA] dark:from-[#0B0F19] via-[#FAFAFA]/60 dark:via-[#0B0F19]/60 to-transparent z-10 pointer-events-none" />
        
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

      {/* Root Vignettes covering the entire screen to eliminate vertical line cutoffs */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 dark:from-black/50 to-transparent z-25 pointer-events-none hidden lg:block" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/30 dark:from-black/60 via-black/10 dark:via-black/20 to-transparent z-25 pointer-events-none hidden lg:block" />
    </div>
  );
}
