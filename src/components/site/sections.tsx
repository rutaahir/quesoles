import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Cpu,
  Gauge,
  MonitorPlay,
  Play,
  QrCode,
  ShieldCheck,
  Timer,
  Users,
  Clock,
  Volume2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useInView, useScroll, useTransform, useReducedMotion, AnimatePresence, motion as m } from "motion/react";
import { SectionHeader } from "./section-header";
import { Button } from "@/components/ui/button";
import { TicketScene3D } from "@/components/quesole/ticket-scene-3d";
import { HeroBackground } from "@/components/quesole/hero-background";
import { DemoReelModal } from "@/components/quesole/demo-reel";
import { CountUp, EASE, FlipNumber, Magnetic, Reveal, TiltCard, motion } from "@/components/quesole/motion";
import { HOURLY_VOLUME, PLANS, WEEKLY_TREND } from "@/lib/quesole/seed";
import { cn } from "@/lib/utils";
import photoHealthcare from "@/assets/photo-healthcare.jpg";
import photoBanking from "@/assets/photo-banking.jpg";
import photoGovernment from "@/assets/photo-government.jpg";
import photoRetail from "@/assets/photo-retail.jpg";
import heroVideo from "@/assets/quesols.mp4";

type Tone = "plain" | "pearl" | "ice" | "ink";

const TONE_BG: Record<Tone, string> = {
  plain: "",
  pearl: "",
  ice: "",
  ink: "bg-ink text-foreground",
};

export function Section({
  id,
  className,
  children,
  eyebrow,
  title,
  lead,
  tone = "plain",
  align = "left",
  wide = false,
}: {
  id?: string;
  className?: string;
  children?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  lead?: string;
  tone?: Tone;
  align?: "left" | "center";
  wide?: boolean;
}) {
  const ink = tone === "ink";
  return (
    <section id={id} className={cn("relative z-10 w-full overflow-hidden", TONE_BG[tone])}>
      <div
        className={cn(
          "mx-auto w-full px-5 py-20 lg:px-8 lg:py-28",
          wide ? "max-w-[88rem]" : "max-w-7xl",
          className,
        )}
      >
        {eyebrow || title ? (
          <Reveal className={cn("mb-12 max-w-3xl", align === "center" && "mx-auto text-center")}>
            {eyebrow ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  ink
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-border bg-surface text-primary",
                )}
              >
                {eyebrow}
              </span>
            ) : null}
            {title ? (
              <h2
                className={cn(
                  "mt-5 font-display text-[2.5rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem] text-foreground",
                )}
              >
                {title}
              </h2>
            ) : null}
            {lead ? (
              <p
                className={cn(
                  "mt-5 text-lg leading-relaxed text-muted-foreground",
                )}
              >
                {lead}
              </p>
            ) : null}
          </Reveal>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/* ------------------------------- 01 HERO ------------------------------- */

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, 180]);

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: EASE, delay },
  });

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
      videoRef.current.play().catch((err) => {
        console.error("Video autoplay failed:", err);
      });
    }
  }, []);

  return (
    <section id="hero-section" ref={ref} className="relative isolate flex h-screen min-h-[600px] flex-col justify-center overflow-hidden pt-16 lg:pt-20">
      {/* Background Video - Full Width with true CSS masking */}
      <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover video-mask"
        />
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 pb-14 lg:grid-cols-[58fr_42fr] lg:gap-14 lg:px-8">
        {/* Left Column: Copy floating above running background video */}
        <m.div
          style={{ y: textY }}
          className="flex flex-col items-start text-left max-w-2xl"
        >
          <m.span
            {...enter(0)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm"
          >
            <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-coral" />
            Smart Queue Management. Better Experinace.
          </m.span>

          <h1 className="mt-6 font-display text-[3.25rem] font-bold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-[4.75rem] text-foreground">
            <m.span {...enter(0.15)} className="inline-block">
              The Queue,{" "}
            </m.span>{" "}
            <m.span {...enter(0.23)} className="inline-block text-gradient">
              Reimagined.
            </m.span>
          </h1>

          <m.p
            {...enter(0.35)}
            className="mt-6 text-lg leading-relaxed text-muted-foreground"
          >
            Smart queuing made flexible—generate tokens online or offline through QR, displays, WhatsApp or digital tickets, and intelligently route customers across services and operators.
          </m.p>

          <m.div {...enter(0.6)} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <m.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.6 }}
              >
                <Button asChild size="lg" variant="brand" className="group shadow-md">
                  <Link to="/pricing">
                    Check All Plans
                    <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-[3px]" />
                  </Link>
                </Button>
              </m.div>
            </Magnetic>
            <Button size="lg" variant="glass" className="shadow-sm" onClick={() => setDemoOpen(true)}>
              <Play className="h-4 w-4 fill-current" /> Watch 60-second Demo
            </Button>
          </m.div>

          <m.ul
            {...enter(0.9)}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            {["Minimal Hardware required", "Instant setup", "99.9% SLA uptime"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald" /> {t}
              </li>
            ))}
          </m.ul>

          <m.dl
            {...enter(1.05)}
            className="mt-8 grid max-w-lg grid-cols-3 gap-3"
          >
            <HeroStat label="Served today" value={1248} />
            <HeroStat label="Avg wait" value={6.7} decimals={1} suffix=" min" />
            <HeroStat label="Active branches" value={32} />
          </m.dl>
        </m.div>

        {/* Empty spacing column to show the background video clearly on the right on desktop */}
        <div className="hidden lg:block h-[30rem]" />
      </div>

      <ScrollCue />
      <DemoReelModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

function ScrollCue() {
  return (
    <div className="pointer-events-none flex justify-center pb-6">
      <div className="relative h-10 w-px overflow-hidden bg-border">
        <motion.span
          className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"
          animate={{ y: [-4, 36], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  decimals = 0,
  suffix = "",
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setV(value);
    const id = setInterval(() => {
      setV((prev) => {
        const jitter = decimals ? (Math.random() - 0.45) * 0.6 : Math.round(Math.random() * 3);
        return Math.max(0, +(prev + jitter).toFixed(decimals));
      });
    }, 3500);
    return () => clearInterval(id);
  }, [decimals, inView, value]);

  return (
    <div ref={ref} className="panel px-4 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold sm:text-2xl">
        <CountUp value={v} decimals={decimals} suffix={suffix} duration={1.5} />
      </dd>
    </div>
  );
}

/* ----------------------------- 02 PROBLEM ------------------------------ */
/* Composition: full-bleed cinematic editorial spread, text over the image. */

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1.02]);

  return (
    <section ref={ref} id="about" className="relative isolate min-h-[85vh] overflow-hidden">
      <m.img
        style={{ y: imgY, scale }}
        src={photoGovernment}
        alt="A crowded government service hall with people waiting in rows of chairs"
        width={1920}
        height={1280}
        loading="lazy"
        className="absolute inset-0 -z-20 h-full w-full object-cover [filter:saturate(0.9)_contrast(1.02)]"
      />
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "linear-gradient(100deg, oklch(0.19 0.02 280 / 0.88) 0%, oklch(0.19 0.02 280 / 0.75) 45%, oklch(0.19 0.02 280 / 0.4) 100%)",
        }}
      />

      <div className="mx-auto flex min-h-[85vh] w-full max-w-7xl flex-col justify-center px-5 py-20 lg:px-8">
        <Reveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Smart Queues. Happy People.
          </span>
          <h2 className="mt-6 font-display text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.5rem]">
            Waiting shouldn't
            <br />
            feel like <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 font-extrabold">waiting.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-slate-200">
            A crowded hall, an unclear line, a customer refreshing nothing. Most service delay isn't
            capacity — it's the absence of orchestration.
          </p>
        </Reveal>

        {/* Buttons Row */}
        <Reveal delay={0.1}>
          <div className="relative mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg" className="rounded-full font-bold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0 shadow-lg px-6 py-2.5 flex items-center gap-2 group transition-all cursor-pointer">
              <a href="#services">
                <span>Explore Solutions</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
            <Button size="lg" className="rounded-full font-bold border border-white/20 bg-white/10 hover:bg-white/20 text-white shadow-sm px-6 py-2.5 flex items-center gap-2 transition-all cursor-pointer" onClick={() => setDemoOpen(true)}>
              <Play className="h-4 w-4 fill-white" /> Watch Demo
            </Button>
          </div>
        </Reveal>

        {/* Inline Tags Row */}
        <Reveal delay={0.15}>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-white/90">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Real-time Analytics
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Smart Notifications
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald shrink-0" /> Multi-Branch Ready
            </div>
          </div>
        </Reveal>

        {/* Horizontal Glassmorphic Card (4 columns) */}
        <m.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
              },
            },
          }}
          className="mt-12 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md p-6 lg:p-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 shadow-2xl"
        >
          {[
            {
              icon: Users,
              title: "Reduce Wait Time",
              body: "Optimize flow and serve more customers.",
              colorClass: "bg-violet-500/20 text-violet-400",
            },
            {
              icon: Activity,
              title: "Real-time Insights",
              body: "Make data-driven decisions instantly.",
              colorClass: "bg-blue-500/20 text-blue-400",
            },
            {
              icon: BellRing,
              title: "Smart Alerts",
              body: "Notify customers and staff in real-time.",
              colorClass: "bg-pink-500/20 text-pink-400",
            },
            {
              icon: ShieldCheck,
              title: "Secure & Reliable",
              body: "Enterprise-grade security. 99.9% uptime.",
              colorClass: "bg-emerald-500/20 text-emerald-400",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <m.div
                key={item.title}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.96 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { type: "spring", stiffness: 220, damping: 20 },
                  },
                }}
                className="group relative flex items-center justify-between gap-4 p-2 hover:bg-white/5 rounded-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-inner", item.colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-display text-sm font-bold text-white tracking-tight">{item.title}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-300 mt-0.5">{item.body}</p>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </m.div>
            );
          })}
        </m.div>

      </div>
      <DemoReelModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

/* ---------------------------- 03 HOW IT WORKS -------------------------- */
/* Composition: diagonal connected path, steps at staggered offsets/sizes. */

const STEPS = [
  {
    icon: QrCode,
    title: "Customer joins",
    body: "A QR scan, a kiosk tap or an online booking — no app, no login, no paper roll.",
    beat: "Token A118 issued",
  },
  {
    icon: Cpu,
    title: "Quesole routes",
    body: "The service picked decides the desk. Load balances itself across counters automatically.",
    beat: "Routed to Counter 02",
  },
  {
    icon: MonitorPlay,
    title: "Everyone sees the same truth",
    body: "The customer's phone, the display board and the operator console all move together.",
    beat: "Now serving A118",
  },
  {
    icon: Gauge,
    title: "Operations self-correct",
    body: "Wait breaches raise alerts before the queue collapses, not after the day ends.",
    beat: "Wait held at 6m",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((v) => (v + 1) % STEPS.length), 4200);
    return () => clearInterval(id);
  }, []);

  const offsets = ["lg:mt-0", "lg:mt-16", "lg:mt-6", "lg:mt-24"];

  return (
    <Section
      id="how-it-works-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="How it works"
        title={["One journey,", "orchestrated {end to end}."]}
        lead="Follow a single customer from the door to served — the path draws itself as you scroll."
      />
      <div className="relative">
        {/* animated flowing diagonal path */}
        <svg
          viewBox="0 0 1000 300"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-10 hidden h-[300px] w-full lg:block"
          aria-hidden
        >
          <defs>
            <linearGradient id="qsPath" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="50%" stopColor="var(--violet)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="oklch(0.72 0.12 215)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <motion.path
            d="M60 40 C 260 40, 240 170, 430 170 S 620 90, 760 240"
            fill="none"
            stroke="url(#qsPath)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 1.8, ease: EASE }}
          />
          <motion.path
            d="M60 40 C 260 40, 240 170, 430 170 S 620 90, 760 240"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="6 14"
            strokeOpacity="0.5"
            animate={{ strokeDashoffset: [0, -80] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className={cn(offsets[i])}>
              <Reveal delay={i * 0.1}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className={cn(
                    "w-full rounded-[2rem] border p-6 text-left backdrop-blur transition-all duration-[400ms]",
                    i % 2 === 0 ? "lg:scale-[1.04]" : "lg:scale-95",
                    active === i
                      ? "bg-brand text-primary-foreground border-transparent shadow-[var(--shadow-lift)]"
                      : "border-border/70 bg-surface/55 hover:bg-surface",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-[400ms]",
                        active === i ? "bg-white text-primary" : "bg-accent text-primary",
                      )}
                    >
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className={cn("font-mono text-xs font-semibold transition-colors duration-[400ms]", active === i ? "text-white/80" : "text-muted-foreground")}>
                      STEP 0{i + 1}
                    </span>
                  </div>
                  <h3 className={cn("mt-4 font-display text-xl font-bold leading-tight transition-colors duration-[400ms]", active === i ? "text-white" : "text-foreground")}>{s.title}</h3>
                  <p className={cn("mt-2 text-sm leading-relaxed transition-colors duration-[400ms]", active === i ? "text-white/80" : "text-muted-foreground")}>{s.body}</p>
                  <motion.div
                    animate={{ opacity: active === i ? 1 : 0.45 }}
                    className={cn(
                      "mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] font-semibold transition-colors duration-[400ms]",
                      active === i
                        ? "bg-white/18 text-white border border-white/10 backdrop-blur-sm"
                        : "bg-accent/70 text-primary"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                    {s.beat}
                  </motion.div>
                </button>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* --------------------------- 04 LIVE QUEUE DEMO ------------------------ */
/* Composition: dark display-board panel — the "live" moment on the page. */

export function LiveQueueDemo() {
  const [current, setCurrent] = useState(152);
  const [queue, setQueue] = useState([153, 154, 155, 156, 157, 158, 159]);
  const [served, setServed] = useState(157);
  const [isAuto, setIsAuto] = useState(true);
  const [showRipple, setShowRipple] = useState(false);
  const [showStatFlash, setShowStatFlash] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  // Auto-simulation interval
  useEffect(() => {
    if (!isAuto) return;

    const interval = setInterval(() => {
      setQueue((q) => {
        const nextVal = q[0] ?? (current + 1);
        setCurrent(nextVal);
        setServed((s) => s + 1);

        if (!reduce) {
          setShowRipple(true);
          setTimeout(() => setShowRipple(false), 850);
          setShowStatFlash(true);
          setTimeout(() => setShowStatFlash(false), 850);
        }

        const nextQueue = q.slice(1);
        // Keep queue refilled
        if (nextQueue.length < 4) {
          const lastVal = nextQueue[nextQueue.length - 1] ?? nextVal;
          return [...nextQueue, lastVal + 1, lastVal + 2, lastVal + 3, lastVal + 4];
        }
        return nextQueue;
      });
    }, 5800);

    return () => clearInterval(interval);
  }, [isAuto, current, reduce]);

  // Handle manual Call Next
  const handleCallNext = () => {
    setIsAuto(false);

    setQueue((q) => {
      const nextVal = q[0] ?? (current + 1);
      setCurrent(nextVal);
      setServed((s) => s + 1);

      if (!reduce) {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 850);
        setShowStatFlash(true);
        setTimeout(() => setShowStatFlash(false), 850);
      }

      const nextQueue = q.slice(1);
      if (nextQueue.length < 4) {
        const lastVal = nextQueue[nextQueue.length - 1] ?? nextVal;
        return [...nextQueue, lastVal + 1, lastVal + 2, lastVal + 3, lastVal + 4];
      }
      return nextQueue;
    });

    resetAutoTimer();
  };

  // Handle manual Join Queue
  const handleJoinQueue = () => {
    setIsAuto(false);

    setQueue((q) => {
      const lastVal = q[q.length - 1] ?? current;
      return [...q, lastVal + 1];
    });

    resetAutoTimer();
  };

  const resetAutoTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    // Resume auto-simulation after 8 seconds of inactivity
    timeoutRef.current = window.setTimeout(() => {
      setIsAuto(true);
      timeoutRef.current = null;
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Section tone="pearl" id="live-demo">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_2.75fr] items-start">
        {/* Left Column: Heading and Main Controls */}
        <Reveal className="flex flex-col justify-between h-full max-w-xl">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Live queue
            </span>
            <h2 className="font-display text-[2.75rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[4rem] [text-shadow:_0_1px_2px_oklch(0_0_0_/_3%)]">
              Live queue.
              <br />
              <span className="text-gradient font-extrabold">Smarter flow.</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-md">
              Real-time queue management that keeps every branch, counter and customer in sync.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button
              variant="default"
              onClick={handleCallNext}
              className="bg-brand hover:bg-brand/90 text-primary-foreground font-semibold flex items-center gap-2 rounded-2xl px-5 py-6 shadow-md transition-all duration-300 active:scale-95"
            >
              <Volume2 className="h-4 w-4" />
              Call next
            </Button>
            <Button
              variant="outline"
              onClick={handleJoinQueue}
              className="border-border bg-white/70 hover:bg-white text-foreground font-semibold flex items-center gap-2 rounded-2xl px-5 py-6 shadow-sm transition-all duration-300 active:scale-95"
            >
              <Users className="h-4 w-4 text-primary" />
              Join queue
            </Button>
          </div>
        </Reveal>

        {/* Right Column: Staggered Stats Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <DashStatCard
            label="Served today"
            value={served}
            icon={CheckCircle2}
            colorClass="bg-violet/10 text-violet"
            subBadge={
              <span className="text-emerald flex items-center gap-1 font-semibold">
                ↑ 18% vs yesterday
              </span>
            }
            badgeColorClass="bg-emerald/10"
            flashActive={showStatFlash}
          />
          <DashStatCard
            label="People ahead"
            value={queue.length}
            icon={Users}
            colorClass="bg-emerald/10 text-emerald"
            subBadge="Across all counters"
          />
          <DashStatCard
            label="Estimated wait"
            value={queue.length * 2}
            suffix=" min"
            icon={Timer}
            colorClass="bg-sky/10 text-sky"
            subBadge="Average wait time"
          />
          <DashStatCard
            label="Avg service time"
            value={6}
            suffix=" min"
            icon={Clock}
            colorClass="bg-coral/10 text-coral"
            subBadge="Across all services"
          />
        </div>
      </div>

      {/* Bottom Panel Row: Active Branch Console & Image visualizer */}
      <div className="grid gap-6 md:grid-cols-[1.6fr_1.4fr] mt-8 items-stretch">
        {/* Branch Console Panel */}
        <Reveal delay={0.08}>
          <div className="rounded-[2.5rem] border border-white/12 dark:border-white/5 bg-[oklch(0.985_0.006_75_/_0.48)] dark:bg-[oklch(0.19_0.02_280_/_0.48)] backdrop-blur-md p-6 shadow-[0_8px_32px_-12px_oklch(0.4_0.05_285_/_0.06)] flex flex-col justify-between h-full">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/5 px-2.5 py-1 text-[10px] font-bold text-emerald shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                  System running smoothly
                </span>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                  Ahmedabad Central Branch · OPD Consultation
                </p>
                <p className="mt-0.5 text-sm font-semibold text-muted-foreground">Counter 03 · Kavya Trivedi</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleCallNext}
                  className="bg-brand text-xs px-3 py-4 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  Call next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleJoinQueue}
                  className="bg-white/70 hover:bg-white text-xs px-3 py-4 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  Join queue
                </Button>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-[1fr_1.3fr] sm:items-center mt-6 pt-6 border-t border-border/50">
              {/* OLED Now Serving Frame */}
              <div
                className={cn(
                  "rounded-3xl border border-border bg-surface/60 px-6 py-7 text-center transition-all duration-[600ms] relative overflow-hidden flex flex-col justify-center min-h-[170px]",
                  showRipple
                    ? "shadow-[0_0_55px_oklch(0.62_0.17_300_/_0.4)] border-primary/40 bg-surface/85"
                    : "shadow-[0_8px_30px_oklch(0_0_0_/_3%)]"
                )}
              >
                {showRipple && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0.6 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="absolute inset-0 rounded-3xl border-2 border-primary/50 pointer-events-none"
                  />
                )}
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-coral leading-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse shrink-0" />
                  Now serving
                </div>
                <div className="mt-3 font-display text-5xl sm:text-6xl font-extrabold text-foreground leading-none">
                  <FlipNumber value={`A${current}`} />
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground/80 leading-none">
                  <Users className="h-3.5 w-3.5" />
                  Serving · Counter 03
                </div>
              </div>

              {/* Upcoming Staggered List */}
              <div className="relative">
                <ul className="grid gap-2">
                  <AnimatePresence mode="popLayout">
                    {queue.slice(0, 4).map((n, i) => {
                      const isUpNext = i === 0;
                      return (
                        <motion.li
                          key={n}
                          layout={!reduce}
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1 - i * 0.18, x: 0 }}
                          exit={{ opacity: 0, x: -24, scale: 0.95 }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className={cn(
                            "flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-[400ms]",
                            isUpNext
                              ? "border border-primary/30 bg-surface/90 shadow-sm ring-1 ring-primary/8"
                              : "border border-border/50 bg-surface/30"
                          )}
                        >
                          <span className={cn(
                            "font-mono text-sm font-bold tabular-nums",
                            isUpNext ? "text-gradient" : "text-foreground"
                          )}>
                            A{n}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isUpNext ? "Up next" : `${i + 1} ahead`} · Counter 0{(i % 3) + 1}
                          </span>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Lobby Visualization Panel */}
        <Reveal delay={0.16}>
          <div className="rounded-[2.5rem] border border-white/12 dark:border-white/5 overflow-hidden relative shadow-[0_8px_32px_-12px_oklch(0.4_0.05_285_/_0.06)] h-full min-h-[360px] group flex flex-col justify-end p-4">
            <img
              src="/qs.jpg"
              alt="Lobby queue layout visualization"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8000ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none" />

            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/45 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse shrink-0" />
              Live
            </span>

            {/* Frosted Glass Footer Bar */}
            <div className="rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md px-4 py-3 grid grid-cols-4 gap-2 relative z-10 w-full">
              {[
                { title: "Multiple", sub: "Counters >" },
                { title: "Real-time", sub: "Updates >" },
                { title: "Smart", sub: "Routing >" },
                { title: "Better", sub: "Experience >" }
              ].map((item, idx) => (
                <div key={idx} className="text-center group-hover:translate-y-0 transition-transform cursor-pointer">
                  <span className="text-[10px] font-bold text-white/85 flex flex-col justify-center items-center leading-tight hover:text-white transition-colors tracking-wide">
                    <span>{item.title}</span>
                    <span className="text-white/60">{item.sub}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

interface DashStatCardProps {
  label: string;
  value: number;
  suffix?: string;
  subBadge: React.ReactNode;
  icon: typeof Users;
  colorClass?: string;
  badgeColorClass?: string;
  flashActive?: boolean;
}

function DashStatCard({
  label,
  value,
  suffix = "",
  subBadge,
  icon: Icon,
  colorClass = "bg-primary/8 text-primary",
  badgeColorClass = "bg-accent text-muted-foreground/80",
  flashActive = false,
}: DashStatCardProps) {
  const reduce = useReducedMotion();
  return (
    <Reveal>
      <div
        className={cn(
          "rounded-3xl border border-white/12 dark:border-white/5 bg-[oklch(0.985_0.006_75_/_0.48)] dark:bg-[oklch(0.19_0.02_280_/_0.48)] backdrop-blur-md p-5 flex flex-col justify-between h-[165px] transition-all duration-[600ms]",
          flashActive
            ? "border-emerald/45 bg-emerald/6 shadow-[0_0_24px_oklch(0.65_0.15_150_/_0.15)]"
            : "shadow-[0_8px_32px_-12px_oklch(0.4_0.05_285_/_0.06)]"
        )}
      >
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="mt-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/80 leading-none">
            {label}
          </div>
          <div className="mt-2.5 font-display text-3xl font-extrabold text-foreground leading-none">
            <CountUp value={value} suffix={suffix} />
          </div>
        </div>
        <div className="mt-3">
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide leading-none", badgeColorClass)}>
            {subBadge}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function MiniStat() {
  return null; // Obsolete, cleaned up in favor of DashStatCard
}

/* --------------------------- 05 THE FOUR METHODS ----------------------- */
/* Composition: one featured method + three alternating full-width rows.   */

const METHODS = [
  {
    n: "Method 01",
    title: "QR walk-in queue",
    body: "One queue, one scan. The customer submits name, contact and a note, and gets a live token page that updates as the line moves.",
    to: "/q/b_axis_rajkot",
    cta: "Try the QR flow",
    icon: QrCode,
  },
  {
    n: "Method 02",
    title: "Multi-desk service routing",
    body: "The service chosen decides the desk. Counters specialise, and the queue balances itself.",
    to: "/q/b_axis_bkc",
    cta: "Pick a service",
    icon: Cpu,
  },
  {
    n: "Method 03",
    title: "Now Serving display board",
    body: "A full-screen board for the TV in the hall, with airport-style flips on every token change.",
    to: "/display/b_amd_central",
    cta: "Open display board",
    icon: MonitorPlay,
  },
  {
    n: "Method 04",
    title: "Remote appointments",
    body: "Location, OTP, service, slot, confirmation — booked from the sofa, honoured at the branch.",
    to: "/book",
    cta: "Book an appointment",
    icon: CalendarCheck,
  },
] as const;

export function MethodsSection() {
  const featured = METHODS[0];
  const rest = METHODS.slice(1);

  return (
    <Section
      id="services"
      tone="ice"
      wide
    >
      <SectionHeader
        eyebrow="Four queuing methods"
        title={["Configure each branch", "for how it {actually works}."]}
        lead="Branches aren't identical. A two-counter city office and a diagnostics centre need different mechanics — Quesole ships all four."
      />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* featured */}
        <Reveal>
          <TiltCard className="relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border border-primary/25 bg-brand p-8 text-primary-foreground shadow-[var(--shadow-lift)] lg:p-10">
            <div
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl"
              style={{ background: "color-mix(in oklab, white 30%, transparent)" }}
              aria-hidden
            />
            <div className="relative">
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                {featured.n} · most used
              </span>
              <h3 className="mt-4 font-display text-3xl font-bold leading-tight lg:text-4xl">
                {featured.title}
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed opacity-85">{featured.body}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Scan", "Fill 3 fields", "Live token", "Called"].map((s, i) => (
                  <motion.span
                    key={s}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 3, delay: i * 0.6, repeat: Infinity }}
                    className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>
            <Link
              to={featured.to as "/"}
              className="group relative mt-10 inline-flex items-center gap-2 text-sm font-bold"
            >
              {featured.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </TiltCard>
        </Reveal>

        {/* secondary rows */}
        <div className="grid gap-4">
          {rest.map((mth, i) => (
            <Reveal key={mth.title} delay={0.08 + i * 0.08}>
              <Link
                to={mth.to as "/"}
                className={cn(
                  "group flex items-start gap-5 rounded-[2rem] border border-border bg-gradient-to-br from-surface via-surface/95 to-primary/8 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:to-primary/14 hover:shadow-[var(--shadow-lift)]",
                  i % 2 === 1 && "lg:ml-8",
                )}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-brand group-hover:text-primary-foreground">
                  <mth.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-[11px] font-semibold text-primary">{mth.n}</span>
                  <h3 className="mt-1 font-display text-xl font-bold">{mth.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{mth.body}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {mth.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------- 06 MULTI-BRANCH CENTRE ---------------------- */

const NODES = [
  { id: "amd", name: "Ahmedabad Central", x: 22, y: 30, waiting: 14, wait: 7.3, desks: 3 },
  { id: "srt", name: "Surat Hub", x: 46, y: 58, waiting: 9, wait: 5.2, desks: 4 },
  { id: "mum", name: "Mumbai West", x: 30, y: 74, waiting: 4, wait: 11.6, desks: 2 },
  { id: "rjt", name: "Rajkot City", x: 66, y: 24, waiting: 6, wait: 4.0, desks: 1 },
  { id: "del", name: "Delhi North", x: 78, y: 62, waiting: 21, wait: 16.7, desks: 3 },
];

const BRANCH_CHARTS: Record<string, { hour: string; tickets: number }[]> = {
  amd: [
    { hour: "9a", tickets: 12 },
    { hour: "11a", tickets: 28 },
    { hour: "1p", tickets: 18 },
    { hour: "3p", tickets: 32 },
    { hour: "5p", tickets: 14 },
  ],
  srt: [
    { hour: "9a", tickets: 8 },
    { hour: "11a", tickets: 19 },
    { hour: "1p", tickets: 12 },
    { hour: "3p", tickets: 24 },
    { hour: "5p", tickets: 10 },
  ],
  mum: [
    { hour: "9a", tickets: 5 },
    { hour: "11a", tickets: 15 },
    { hour: "1p", tickets: 9 },
    { hour: "3p", tickets: 22 },
    { hour: "5p", tickets: 8 },
  ],
  rjt: [
    { hour: "9a", tickets: 3 },
    { hour: "11a", tickets: 8 },
    { hour: "1p", tickets: 4 },
    { hour: "3p", tickets: 12 },
    { hour: "5p", tickets: 5 },
  ],
  del: [
    { hour: "9a", tickets: 22 },
    { hour: "11a", tickets: 45 },
    { hour: "1p", tickets: 30 },
    { hour: "3p", tickets: 52 },
    { hour: "5p", tickets: 26 },
  ],
};

export function CommandCentre() {
  const [active, setActive] = useState("amd");
  const [isAuto, setIsAuto] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const nodeIds = useMemo(() => NODES.map((n) => n.id), []);

  useEffect(() => {
    if (!isAuto) return;

    const interval = setInterval(() => {
      setActive((currentActive) => {
        const idx = nodeIds.indexOf(currentActive);
        const nextIdx = (idx + 1) % nodeIds.length;
        return nodeIds[nextIdx]!;
      });
    }, 3800);

    return () => clearInterval(interval);
  }, [isAuto, nodeIds]);

  const handleNodeClick = (id: string) => {
    setActive(id);
    setIsAuto(false);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsAuto(true);
      timeoutRef.current = null;
    }, 7000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const node = NODES.find((n) => n.id === active) ?? NODES[0]!;

  return (
    <Section
      tone="ink"
      wide
    >
      <SectionHeader
        eyebrow="Command centre"
        title={["Every branch on {one canvas}."]}
        lead="Select a node to drill into a branch. In the product this is your company dashboard, updating continuously."
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <div className="panel-ink relative aspect-[4/3] overflow-hidden p-4 sm:aspect-[16/9]">
            <div className="absolute inset-0 grid-faint opacity-25" aria-hidden />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
              {NODES.filter((n) => n.id !== "amd").map((n) => (
                <motion.line
                  key={n.id}
                  x1={NODES[0]!.x}
                  y1={NODES[0]!.y}
                  x2={n.x}
                  y2={n.y}
                  stroke="currentColor"
                  className={cn(
                    "transition-all duration-[500ms]",
                    active === n.id ? "text-coral" : "text-primary/25"
                  )}
                  strokeWidth={active === n.id ? "0.65" : "0.35"}
                  strokeDasharray={active === n.id ? "none" : "1.5 2"}
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: EASE }}
                />
              ))}
            </svg>
            {NODES.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNodeClick(n.id)}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                aria-label={n.name}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-[500ms]",
                    active === n.id
                      ? cn(!reduce && "scale-105", "border-transparent bg-brand text-primary-foreground shadow-[0_0_36px_-6px_oklch(0.62_0.17_300_/_0.5)]")
                      : "border-border/60 bg-surface/50 text-muted-foreground hover:border-border hover:bg-surface/85 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors duration-[500ms]",
                      active === n.id ? "animate-breathe bg-coral" : "bg-muted-foreground/60",
                    )}
                  />
                  <span className="hidden sm:inline">{n.name}</span>
                  <span className="sm:hidden">{n.id.toUpperCase()}</span>
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <motion.div key={node.id} className="panel-ink h-full p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Building2 className="h-4 w-4" /> Branch snapshot
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold text-foreground">{node.name}</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Cell label="Waiting" value={<CountUp value={node.waiting} />} />
              <Cell label="Avg wait" value={<CountUp value={node.wait} decimals={1} suffix=" min" />} />
              <Cell label="Desks open" value={<><CountUp value={node.desks} /> / 4</>} />
              <Cell label="Served today" value={<CountUp value={node.waiting * 17} />} />
            </div>
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(BRANCH_CHARTS[node.id as keyof typeof BRANCH_CHARTS] ?? BRANCH_CHARTS["amd"]) as any[]}>
                  <defs>
                    <linearGradient id="qsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="var(--violet)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="oklch(0.8 0.1 300)"
                    strokeWidth={2}
                    fill="url(#qsArea)"
                    isAnimationActive={!reduce}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Button asChild variant="glass" className="mt-4 w-full">
              <Link to="/app">Open the live dashboard</Link>
            </Button>
          </motion.div>
        </Reveal>
      </div>
    </Section>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-surface/50 backdrop-blur-sm px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}

/* ----------------------------- 07 ANALYTICS ---------------------------- */
/* Composition: oversized chart + supporting stat rail beside it.          */

const ANALYTICS_STATS = [
  { label: "Peak hour", value: "11:00–12:00", note: "38% of the day's tokens" },
  { label: "Avg handling time", value: "4m 12s", note: "down 22% since rollout" },
  { label: "SLA breaches", value: "3", note: "this week, all resolved" },
];

export function AnalyticsSection() {
  const [range, setRange] = useState<"week" | "hours">("hours");

  return (
    <Section
      id="analytics-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="Business intelligence"
        title={["Peak hours, staff performance,", "{branch comparison}."]}
        lead="Charts that answer operational questions: when does the queue break, and which desk keeps it together?"
      />
      <div className="grid gap-6 lg:grid-cols-[2.1fr_1fr]">
        <Reveal>
          <div className="panel p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-bold">
                  {range === "hours" ? "Ticket volume by hour" : "Served vs appointments this week"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Apollo Care Center · all branches · simulated dataset
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1">
                {(["hours", "week"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                      range === r
                        ? "bg-surface shadow-[var(--shadow-soft)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r === "hours" ? "By hour" : "By day"}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              key={range}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 h-[26rem] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                {range === "hours" ? (
                  <BarChart data={HOURLY_VOLUME}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    />
                    <Bar dataKey="tickets" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={WEEKLY_TREND}>
                    <defs>
                      <linearGradient id="qsServed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="qsAppt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--coral)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    />
                    <Area type="monotone" dataKey="served" stroke="var(--primary)" strokeWidth={2} fill="url(#qsServed)" />
                    <Area type="monotone" dataKey="appointments" stroke="var(--coral)" strokeWidth={2} fill="url(#qsAppt)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          </div>
        </Reveal>

        <div className="grid content-start gap-4">
          {ANALYTICS_STATS.map((s, i) => (
            <Reveal key={s.label} delay={0.08 + i * 0.08}>
              <div className="rounded-3xl border border-border bg-surface/80 p-6 backdrop-blur">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 font-display text-3xl font-bold text-gradient">{s.value}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.note}</p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={0.32}>
            <div className="rounded-3xl border border-primary/25 bg-accent/60 p-6">
              <p className="text-sm leading-relaxed text-foreground/80">
                Every chart is filtered by company, branch, desk and service — and exports straight
                into the weekly operations review.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------ 08 ALERTS ------------------------------ */
/* Composition: horizontal escalation timeline with flowing connectors.    */

const ALERT_FLOW = [
  { title: "Threshold slips", body: "Wait time crosses 15 min at Counter 03.", tone: "amber" },
  { title: "Alert raised", body: "Branch admin is pinged in-app and by email.", tone: "coral" },
  { title: "Action taken", body: "Counter 04 opened, queue re-balanced instantly.", tone: "primary" },
  { title: "Resolved", body: "Wait back to 6m 10s, breach logged for SLA.", tone: "emerald" },
] as const;

const TONE_DOT: Record<string, string> = {
  amber: "bg-amber",
  coral: "bg-coral",
  primary: "bg-violet",
  emerald: "bg-emerald",
};

const TONE_CARD_GRADIENT: Record<string, string> = {
  amber: "from-surface via-surface to-amber/12 border-amber/20 shadow-[0_8px_30px_rgb(245_158_11_/_4%)]",
  coral: "from-surface via-surface to-coral/12 border-coral/20 shadow-[0_8px_30px_rgb(244_63_94_/_4%)]",
  primary: "from-surface via-surface to-violet/12 border-violet/20 shadow-[0_8px_30px_rgb(139_92_246_/_4%)]",
  emerald: "from-surface via-surface to-emerald/12 border-emerald/20 shadow-[0_8px_30px_rgb(16_185_129_/_4%)]",
};
export function AlertIntelligence() {
  const [step, setStep] = useState(0);
  const activeIndex = step - 1;
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (ALERT_FLOW.length + 1)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <Section
      id="alert-intelligence-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="Alert intelligence"
        title={["The queue tells you", "before it {breaks}."]}
        lead="Rules watch wait time, queue length, operator presence and device health — and escalate the moment a threshold slips."
      />
      <div className="relative">
        {/* flowing horizontal rail */}
        <div className="absolute left-0 right-0 top-[0.85rem] hidden h-px lg:block" aria-hidden>
          <div className="h-full w-full bg-border/60" />
          <motion.div
            className="absolute top-0 h-px w-40"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--coral), transparent)",
            }}
            animate={{ left: ["-10%", "100%"] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <ol className="grid gap-6 lg:grid-cols-4 lg:gap-8">
          {ALERT_FLOW.map((a, i) => {
            const on = i < step || step === 0;
            return (
              <li key={a.title} className="relative">
                <Reveal delay={i * 0.09}>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-500",
                        on ? cn(TONE_DOT[a.tone], "text-white") : "bg-border/60 text-muted-foreground",
                      )}
                    >
                      {i + 1}
                      {i < step && i === step - 1 ? (
                        <motion.span
                          className={cn("absolute inset-0 rounded-full", TONE_DOT[a.tone])}
                          animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        />
                      ) : null}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80">
                      {`0${i + 1} / 04`}
                    </span>
                  </div>
                  <motion.div
                    animate={{ y: activeIndex === i ? 0 : 6 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className={cn(
                      "rounded-[2rem] border mt-5 p-6 backdrop-blur-sm transition-all duration-[400ms]",
                      activeIndex === i
                        ? "bg-brand text-primary-foreground border-transparent shadow-[var(--shadow-lift)]"
                        : "border-border/50 bg-surface/40 opacity-45"
                    )}
                  >
                    <h3 className={cn("font-display text-lg font-bold transition-colors duration-[400ms]", activeIndex === i ? "text-white" : "text-foreground")}>
                      {a.title}
                    </h3>
                    <p className={cn("mt-2 text-sm leading-relaxed transition-colors duration-[400ms]", activeIndex === i ? "text-white/80" : "text-muted-foreground")}>
                      {a.body}
                    </p>
                  </motion.div>
                </Reveal>
                {i < ALERT_FLOW.length - 1 ? (
                  <ArrowRight className="absolute -right-6 top-[9.5rem] hidden h-4 w-4 text-muted-foreground/40 lg:block" />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Rules you build, not tickets you file",
              body: "Combine a metric, a threshold and a channel. Enable per company, override per branch.",
            },
            {
              icon: BellRing,
              title: "Notification centre with unread state",
              body: "Alerts land in-app first with severity colouring, so nothing important gets buried.",
            },
            {
              icon: CalendarCheck,
              title: "SLA reporting built in",
              body: "Every breach is logged, so the weekly review argues from data instead of memory.",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div className="flex gap-4 border-l border-border/60 pl-5">
                <div className="min-w-0">
                  <f.icon className="h-5 w-5 text-coral" />
                  <h4 className="mt-3 font-display text-base font-bold text-foreground">{f.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------- 09 USE CASES ----------------------------- */
const USE_CASES = [
  {
    img: photoHealthcare,
    title: "Healthcare",
    body: "OPD, diagnostics, pharmacy and billing queues that never collide — one patient, one visible journey through four departments.",
    stat: "38% shorter OPD waits",
    span: "lg:col-span-7",
    h: "h-[30rem]",
  },
  {
    img: photoBanking,
    title: "Banking",
    body: "Advisory appointments running alongside walk-in cash counters, without either blocking the other.",
    stat: "2.4× advisor utilisation",
    span: "lg:col-span-5",
    h: "h-[30rem]",
  },
  {
    img: photoGovernment,
    title: "Government",
    body: "Document verification halls with a fair, visible order that nobody has to argue about.",
    stat: "Zero paper tokens",
    span: "lg:col-span-5",
    h: "h-[26rem]",
  },
  {
    img: photoRetail,
    title: "Telecom & retail",
    body: "Service desks that route by request type, not by luck — activation, billing and repairs each land where they should.",
    stat: "91% first-desk resolution",
    span: "lg:col-span-7",
    h: "h-[26rem]",
  },
];

export function UseCases() {
  return (
    <Section
      id="use-cases-section"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="In the wild"
        title={["Built for rooms", "full of {real people}."]}
        lead="Wherever a counter meets a queue, Quesole gives both sides the same clarity."
      />
      <div className="grid gap-5 lg:grid-cols-12">
        {USE_CASES.map((u, i) => (
          <Reveal key={u.title} delay={i * 0.08} className={u.span}>
            <article
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border border-border shadow-[var(--shadow-soft)]",
                u.h,
              )}
            >
              <img
                src={u.img}
                alt={`${u.title} service environment`}
                width={1600}
                height={1200}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07] [filter:saturate(0.85)_contrast(1.06)]"
              />
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(0deg, oklch(0.16 0.04 280 / 0.92) 0%, oklch(0.18 0.05 285 / 0.45) 42%, transparent 78%)",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 backdrop-blur">
                  {u.stat}
                </span>
                <h3 className="mt-4 font-display text-3xl font-bold text-white">{u.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70 opacity-0 transition-all duration-500 group-hover:opacity-100 lg:translate-y-2 lg:group-hover:translate-y-0">
                  {u.body}
                </p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ----------------------------- 10 PRICING ------------------------------ */

export function PricingBlock({ compact = false }: { compact?: boolean }) {
  const [annual, setAnnual] = useState(false);

  return (
    <Section
      tone="ice"
    >
      <SectionHeader
        align="center"
        eyebrow="Pricing"
        title={
          compact
            ? ["Plans that {scale}", "with your branch count."]
            : ["Straightforward plans,", "no {counter tax}."]
        }
        lead="Every plan includes the customer token page, live simulation of your operation and unlimited customers."
      />
      <Reveal className="mb-12 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5">
          {(["monthly", "annual"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setAnnual(k === "annual")}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                (k === "annual") === annual
                  ? "bg-brand text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "monthly" ? "Monthly" : "Annual · save 2 months"}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.07}>
            <div
              className={cn(
                "relative flex h-full flex-col rounded-[1.75rem] p-7 transition-transform duration-300",
                p.recommended
                  ? "border border-primary/40 bg-surface shadow-[0_36px_90px_-40px_oklch(0.53_0.17_283_/_0.75)] lg:-mt-6 lg:scale-[1.05] lg:p-9"
                  : "border border-border bg-surface/75 shadow-[var(--shadow-soft)] backdrop-blur",
              )}
              style={
                p.recommended
                  ? {
                    backgroundImage:
                      "radial-gradient(120% 60% at 50% 0%, color-mix(in oklab, var(--violet) 9%, transparent), transparent 60%), linear-gradient(var(--surface), var(--surface))",
                  }
                  : undefined
              }
            >
              {p.recommended ? (
                <div
                  className="pointer-events-none absolute -inset-[3px] -z-10 rounded-[1.85rem] opacity-30 blur-[18px]"
                  style={{ background: "var(--gradient-brand)" }}
                  aria-hidden
                />
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                {p.recommended ? (
                  <span className="rounded-full bg-coral px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-coral-foreground">
                    Recommended
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-6 flex items-end gap-1.5">
                <motion.span
                  key={annual ? "a" : "m"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "font-display font-bold",
                    p.recommended ? "text-5xl text-gradient" : "text-4xl",
                  )}
                >
                  ₹{(annual ? p.annual : p.monthly).toLocaleString("en-IN")}
                </motion.span>
                <span className="pb-1.5 text-sm text-muted-foreground">
                  /{annual ? "year" : "month"}
                </span>
              </div>
              <ul className="mt-7 grid gap-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grow" />
              <Button asChild variant={p.recommended ? "brand" : "outline"} size="lg">
                <Link to="/signup">Choose {p.name}</Link>
              </Button>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------- 11 TRUST + CTA ---------------------------- */

const TRUST = [
  { title: "99.98% uptime", body: "Display boards and kiosks keep serving through network blips." },
  { title: "Scoped access", body: "Five roles, each seeing exactly their company, branch or desk." },
  { title: "Full audit trail", body: "Every approval, plan change and configuration edit is logged." },
  { title: "Privacy first", body: "Customer contact data is collected for one visit, not forever." },
];

export function TrustSection() {
  return (
    <Section
      id="partnerships"
      tone="pearl"
      wide
    >
      <SectionHeader
        eyebrow="Trust"
        title={["Multi-tenant by {architecture},", "not by convention."]}
        lead="Company and branch scoping is enforced in the data layer, so one tenant can never see another's queue."
      />
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        {/* illustrated architecture backdrop */}
        <Reveal>
          <div className="relative aspect-square w-full max-w-lg [perspective:1100px]">
            <div
              className="absolute inset-0 rounded-full blur-3xl"
              aria-hidden
              style={{
                background:
                  "radial-gradient(circle, color-mix(in oklab, var(--violet) 30%, transparent), transparent 65%)",
                opacity: 0.35,
              }}
            />
            <div className="absolute inset-0 [transform:rotateX(52deg)_rotateZ(-38deg)] [transform-style:preserve-3d]">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-[14%] rounded-3xl border border-primary/25 bg-surface/70 backdrop-blur"
                  style={{ boxShadow: "var(--shadow-lift)" }}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.14, ease: EASE }}
                  animate={{ translateZ: [i * 70, i * 70 + 14, i * 70] }}
                >
                  <div className="grid-faint h-full w-full rounded-3xl opacity-60" />
                </motion.div>
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center">
              <motion.div
                className="grid h-24 w-24 place-items-center rounded-3xl bg-brand text-primary-foreground shadow-[var(--shadow-lift)]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <ShieldCheck className="h-10 w-10" />
              </motion.div>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {TRUST.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.07}>
              <div className="h-full rounded-3xl border border-border bg-surface/80 p-6 backdrop-blur">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-display text-lg font-bold">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <Section id="contact" className="pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-brand px-6 py-20 text-center text-primary-foreground sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-25" aria-hidden>
            <svg viewBox="0 0 600 200" className="h-full w-full">
              {[0, 1, 2, 3].map((i) => (
                <motion.path
                  key={i}
                  d={`M0 ${60 + i * 30} C 150 ${20 + i * 30}, 300 ${110 + i * 20}, 600 ${50 + i * 26}`}
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, delay: i * 0.12, ease: EASE }}
                />
              ))}
            </svg>
          </div>
          <h2 className="relative font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            Ready to make waiting smarter?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base opacity-90 sm:text-lg">
            Spin up a branch, print a QR code and watch your first token move — in under five minutes.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Button asChild size="lg" variant="coral">
                <Link to="/signup">Start your free trial</Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="glass">
              <Link to="/app">Book a demo walkthrough</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

export { ScrollControlledBackground } from "./scroll-controlled-background";
export { SectionHeader } from "./section-header";
