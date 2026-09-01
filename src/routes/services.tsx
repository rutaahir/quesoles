import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { FloatingContact } from "@/components/site/floating-contact";
import { Reveal, Magnetic, motion, EASE } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, QrCode, ClipboardList, Send, UtensilsCrossed, Globe, Sparkles } from "lucide-react";
import photoHealthcare from "@/assets/photo-healthcare.jpg";
import photoBanking from "@/assets/photo-banking.jpg";
import photoGovernment from "@/assets/photo-government.jpg";
import photoRetail from "@/assets/photo-retail.jpg";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Queuing Services & Configurations — QUESOLS" },
      {
        name: "description",
        content:
          "Explore the 5 queuing service configurations offered by QUESOLS. From basic onsite QR walk-ins to complex multi-branch KOT integrations and online booking flows.",
      },
    ],
  }),
  component: ServicesPage,
});

const SERVICE_CONFIGS = [
  {
    num: "01",
    title: "Basic QR Walk-In Queue",
    setup: "Onsite + Only QR Code + Single/Multiple Operator",
    icon: QrCode,
    badgeColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    desc: "A simplified onsite entry point. Customers scan a single QR code at the door to join the queue. Support for single or multiple desk operators handling a single flow. Ideal for check-ups, pickups, or fast-track collection desks.",
    features: [
      "No kiosk or ticket printer needed",
      "Live queue tracking on customer phones",
      "Multiple counters can draw from the same QR queue",
      "Instant setup in under 5 minutes"
    ]
  },
  {
    num: "02",
    title: "Multi-Service QR Routing Flow",
    setup: "Onsite + Only QR Code + Multi-Services + Multi-Operator",
    icon: ClipboardList,
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    desc: "Enable customers to choose from multiple services upon scanning. The system dynamically routes tickets to specialized operators at different desks, distributing loads and balancing waiting times automatically.",
    features: [
      "Smart branch service configuration",
      "Dynamic routing based on service type selected",
      "Operator console to call next based on skill groups",
      "Detailed queue wait stats per service"
    ]
  },
  {
    num: "03",
    title: "Omnichannel SMS & WhatsApp Queue",
    setup: "Onsite + QR Code / Screen Ticket Generation + Multi-Services + Multi-Operator",
    icon: Send,
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    desc: "Generate queue numbers directly to customer smartphones. Supports onsite code screens that trigger digital tickets via SMS or WhatsApp, keeping visitors updated without requiring them to wait in physical lobbies.",
    features: [
      "No paper ticket waste",
      "Real-time text updates as queue progresses",
      "Remote lounge waiting enabled",
      "Multi-service capability and automated operator call-ups"
    ]
  },
  {
    num: "04",
    title: "KOT Integrated Food Court Queue",
    setup: "Onsite + QR / Screen Ticket + Kitchen Order Ticket (KOT) + Multi-Service + Multi-Operator",
    icon: UtensilsCrossed,
    badgeColor: "bg-coral/10 text-coral border-coral/20",
    desc: "Perfect for restaurants, quick service cafes, and food courts. Scan QR codes or kiosks to trigger order tokens with Kitchen Order Tickets (KOT) printed or dispatched to preparation stations automatically.",
    features: [
      "Simultaneous queue token & food KOT print",
      "Order status notification (Preparing / Ready)",
      "Multi-station routing (Kitchen, Coffee, Dessert)",
      "Operator dispatch console for counter collections"
    ]
  },
  {
    num: "05",
    title: "Enterprise Multi-Branch Booking",
    setup: "Online + Multi-Locations + Multi-Services + Multi-Operators",
    icon: Globe,
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    desc: "The complete digital appointment suite. Customers book slots remotely across multiple branches. Configure location schedules, service options, and operator desks from a central admin portal.",
    features: [
      "Dedicated portal URL per company",
      "Calendar appointment slot allocation with OTP validation",
      "Centralized multi-branch control dashboard",
      "Automated SMS/Email confirmations and reminders"
    ]
  }
];

function ServicesPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <SiteNav />

      <main className="relative pt-24 pb-12">
        {/* Abstract Background Design */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-[20%] h-[600px] w-[600px] rounded-full blur-3xl opacity-15 bg-[radial-gradient(circle,var(--violet)_0%,transparent_70%)]" />
          <div className="absolute bottom-[200px] right-[10%] h-[500px] w-[500px] rounded-full blur-3xl opacity-20 bg-[radial-gradient(circle,var(--blue)_0%,transparent_70%)]" />
        </div>

        {/* Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-5 lg:px-8 mb-12 text-center"
        >
          <div className="max-w-4xl mx-auto space-y-5">
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-brand shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Service Architecture
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-[4.5rem] text-foreground"
            >
              Queuing Workflows <br />
              <span className="text-gradient">For Every Flow.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto"
            >
              Explore our five pre-engineered queuing service configurations. Select or combine structures to match the specific operational constraints of your branches and operators.
            </motion.p>
          </div>
        </motion.section>

        {/* Service Configurations Cards List */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 space-y-8 mb-20">
          {SERVICE_CONFIGS.map((config, idx) => {
            const IconComp = config.icon;
            return (
              <Reveal key={config.title} delay={idx * 0.05}>
                <div className="group rounded-[2.5rem] border border-border/60 bg-surface/40 hover:border-brand/40 hover:bg-brand/5 p-6 backdrop-blur-md lg:p-10 shadow-sm hover:shadow-[0_16px_36px_-12px_rgba(99,102,241,0.08)] transition-all duration-300">
                  <div className="grid gap-8 lg:grid-cols-[1fr_1.8fr] items-start">
                    
                    {/* Left Column: Heading and Badges */}
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black text-brand tracking-widest">
                          CONFIG {config.num}
                        </span>
                        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide leading-none", config.badgeColor)}>
                          {config.title.split(" ")[0]}
                        </span>
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-extrabold text-foreground tracking-tight leading-snug group-hover:text-brand transition-colors">
                        {config.title}
                      </h3>

                      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/90 px-3.5 py-2 text-[10px] font-semibold text-muted-foreground shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
                        <span>{config.setup}</span>
                      </div>

                      <div className="mt-6 hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                        <IconComp className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Right Column: Description and Detailed Feature points */}
                    <div className="space-y-6 lg:border-l lg:border-border/60 lg:pl-10">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {config.desc}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {config.features.map((feat) => (
                          <div key={feat} className="flex items-start gap-2.5 text-xs font-semibold text-foreground/80">
                            <CheckCircle2 className="h-4.5 w-4.5 text-brand shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </Reveal>
            );
          })}
        </section>

        {/* Dynamic Visual Section: Photos Grid */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">Operational Visualizer</span>
            <h2 className="mt-2 font-display text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Hardware-Light Branch Orchestration
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              See QUESOLS services deployed in multiple sectors. Adaptable interfaces render natively across smartphones, tablets, TVs, and printing kiosk nodes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { img: photoHealthcare, title: "Healthcare Clinics", desc: "Patient self-checkins via QR" },
              { img: photoBanking, title: "Finance & Banks", desc: "Multi-service operator desks" },
              { img: photoGovernment, title: "Municipal Offices", desc: "Centralized town hall routing" },
              { img: photoRetail, title: "Food Courts & Cafes", desc: "Order token & kitchen KOT prints" },
            ].map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.08}>
                <div className="relative overflow-hidden rounded-3xl border border-border group/photo shadow-sm">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-750 group-hover/photo:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end text-white" />
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 text-white z-10 pointer-events-none">
                    <h4 className="font-display text-base font-bold tracking-tight">{item.title}</h4>
                    <p className="text-[10px] text-white/80 mt-1">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mx-auto max-w-5xl px-5 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-16 text-center text-white shadow-xl">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
              
              <h3 className="relative font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
                Ready to configure your branch queue?
              </h3>
              <p className="relative mx-auto mt-4 max-w-xl text-xs sm:text-sm text-white/90">
                Setup QR codes, select operating desks, and coordinate your first live customer ticket in under five minutes.
              </p>
              
              <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="rounded-full font-extrabold bg-white hover:bg-slate-100 text-violet-950 transition-colors shadow-md border-0 px-6 py-2.5">
                  <Link to="/signup" className="text-violet-950 font-extrabold">Start Free Registration</Link>
                </Button>
                <Button asChild size="lg" className="rounded-full font-extrabold border border-white/30 bg-white/10 hover:bg-white/20 text-white transition-all shadow-md px-6 py-2.5">
                  <Link to="/" className="text-white font-extrabold">Back to Home</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
