import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Home, Info, Cpu, Play, Users, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { motion, useScroll, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/about", label: "About Us", icon: Info },
  { to: "/services", label: "Services", icon: Cpu },
  { to: "/live-demo", label: "Live Demo", icon: Play },
  { to: "/partnerships", label: "Partnerships", icon: Users },
  { to: "/contact", label: "Contact Us", icon: Mail },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300 font-sans",
        scrolled ? "p-3" : "p-0"
      )}
    >
      <motion.div
        style={{ scaleX: progress }}
        className="absolute top-0 left-0 right-0 h-[3px] origin-left bg-gradient-to-r from-violet-600 to-blue-500 z-50"
        aria-hidden
      />
      <div
        className={cn(
          "transition-all duration-500 ease-out mx-auto w-full relative",
          scrolled
            ? cn(
                "mt-2 max-w-6xl shadow-[0_20px_40px_-12px_rgba(99,102,241,0.25)] px-6 py-1.5",
                open ? "rounded-3xl" : "rounded-full"
              )
            : "mt-0 max-w-full border-b border-white/10 bg-slate-950/40 backdrop-blur-[6px] px-8 py-2.5 shadow-none"
        )}
      >
        {scrolled && (
          <>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes nav-border-spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
              }
            `}} />
            <div className={cn("absolute inset-0 -z-10 overflow-hidden pointer-events-none", open ? "rounded-3xl" : "rounded-full")}>
              <div 
                className="absolute left-1/2 top-1/2 h-[300%] w-[300%]"
                style={{
                  background: "conic-gradient(from 0deg, #8b5cf6, #3b82f6, #ec4899, #8b5cf6)",
                  transform: "translate(-50%, -50%)",
                  animation: "nav-border-spin 6s linear infinite"
                }}
              />
              <div 
                className={cn("absolute bg-white/94 dark:bg-slate-950/94 backdrop-blur-md", open ? "rounded-[22px]" : "rounded-full")}
                style={{
                  top: "1.5px",
                  right: "1.5px",
                  bottom: "1.5px",
                  left: "1.5px"
                }}
              />
            </div>
          </>
        )}
        <nav className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 hover:scale-102 transition-transform">
            <Logo size={22} />
          </Link>

          <div className="hidden items-center gap-1 lg:gap-1.5 md:flex">
            {LINKS.map((l, idx) => (
              <Link
                key={l.label}
                to={l.to}
                hash={"hash" in l ? l.hash : undefined}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                activeOptions={{ exact: l.to === "/" && !("hash" in l) }}
              >
                {({ isActive }) => {
                  const isCurrentActive = isActive && (
                    ("hash" in l)
                      ? (typeof window !== "undefined" && window.location.hash === `#${l.hash}`)
                      : (typeof window !== "undefined" ? (window.location.hash === "" && l.to === "/") || (l.to !== "/") : true)
                  );

                  return (
                    <span
                      className={cn(
                        "relative group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 whitespace-nowrap lg:text-sm lg:px-4 cursor-pointer",
                        isCurrentActive
                          ? (scrolled ? "text-brand font-extrabold" : "text-white font-extrabold")
                          : (scrolled ? "text-muted-foreground hover:text-brand" : "text-slate-200 hover:text-white")
                      )}
                    >
                      {hoveredIndex === idx && (
                        <motion.span
                          layoutId="navHoverBg"
                          className={cn(
                            "absolute inset-0 rounded-full -z-10",
                            scrolled ? "bg-brand/5 border border-brand/10" : "bg-white/10 border border-white/20"
                          )}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      )}
                      <l.icon className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      <span>{l.label}</span>
                      {isCurrentActive && (
                        <motion.span
                          layoutId="activeUnderline"
                          className={cn(
                            "absolute bottom-[-1px] left-2 right-2 h-[2px] rounded-full",
                            scrolled
                              ? "bg-gradient-to-r from-violet-600 to-blue-500 shadow-[0_1px_8px_rgba(99,102,241,0.5)]"
                              : "bg-gradient-to-r from-white to-slate-200 shadow-[0_1px_8px_rgba(255,255,255,0.6)]"
                          )}
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </span>
                  );
                }}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full font-bold px-4 py-2 transition-all duration-200",
                scrolled
                  ? "text-foreground hover:bg-accent/50"
                  : "text-slate-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:shadow-brand/20 hover:scale-[1.03] transition-all duration-200 border-0 px-5 py-2 group">
              <Link to="/signup" className="flex items-center gap-1.5">
                <span>Register</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 hover:bg-accent md:hidden transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-t border-border/60 mt-2 md:hidden"
          >
            <div className="space-y-1.5 px-2 py-4">
              {LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  hash={"hash" in l ? l.hash : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-base font-bold text-muted-foreground hover:bg-brand/5 hover:text-brand transition-all group"
                >
                  <l.icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground/60 group-hover:text-brand" />
                  <span>{l.label}</span>
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 mt-3">
                <Button asChild variant="outline" className="rounded-2xl font-bold py-2.5">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild className="rounded-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 py-2.5 shadow-md group">
                  <Link to="/signup" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5">
                    <span>Register</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </header>
  );
}
