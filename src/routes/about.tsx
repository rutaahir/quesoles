import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { FloatingContact } from "@/components/site/floating-contact";
import { Reveal, Magnetic, motion, EASE } from "@/components/quesole/motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Layers, QrCode, Users, Cpu, ShieldCheck, HelpCircle } from "lucide-react";
import photoHealthcare from "@/assets/photo-healthcare.jpg";
import photoBanking from "@/assets/photo-banking.jpg";
import photoGovernment from "@/assets/photo-government.jpg";
import photoRetail from "@/assets/photo-retail.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About QUESOLS — Intelligent Queue Management" },
      {
        name: "description",
        content:
          "Learn about QUESOLS, a flexible and intelligent queue management solution designed to manage customer flow across multiple branches and desks without complex hardware.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
        {/* Dynamic Abstract Background Gradient */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-3xl opacity-20 bg-[radial-gradient(circle,var(--violet)_0%,transparent_70%)]" />
          <div className="absolute top-[600px] left-0 h-[450px] w-[450px] rounded-full blur-3xl opacity-15 bg-[radial-gradient(circle,var(--blue)_0%,transparent_70%)]" />
        </div>

        {/* Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-5 lg:px-8 mb-10 text-center"
        >
          <div className="max-w-4xl mx-auto space-y-5">
            <motion.span
              variants={itemVariants}
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-brand shadow-sm"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Smart Queue Management
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-[4.5rem] text-foreground"
            >
              Designed Around <br />
              <span className="text-gradient">Your Business.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto"
            >
              QUESOLS is a flexible, intelligent queue management solution designed to help businesses manage customer flow efficiently across multiple branches, services and operators—without depending on expensive or excessive hardware.
            </motion.p>
          </div>
        </motion.section>

        {/* Core Description Grid */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 mb-16">
          <div className="rounded-[2.5rem] border border-border/60 bg-surface/40 p-8 backdrop-blur-md lg:p-12 shadow-[var(--shadow-lift)]">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <Reveal>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                  Ideal for bank branches, clinics, service centres, retail stores, and government customer-facing hubs.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Whether you operate a bank, hospital, government office, showroom, service centre, retail outlet or any customer-facing business, QUESOLS provides multiple ways to generate, manage and serve customer tokens based on your operational requirements.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Zero hardware dependency (Kiosk, Tablet or QR-only options)",
                    "Supports single counters up to large branch networks",
                    "Configure token allocation rules on a per-branch basis",
                    "Adaptable system maps to the way your business operates",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs font-semibold text-foreground/80">
                      <CheckCircle2 className="h-4.5 w-4.5 text-brand shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.2} className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border shadow-md">
                <img
                  src={photoRetail}
                  alt="A modern customer service counter running QUESOLS queue management"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-103"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Alternating Feature Showcases */}
        <section id="features" className="mx-auto max-w-7xl px-5 lg:px-8 space-y-24 mb-24">
          
          {/* Feature 1: QR & Kiosk Generation */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            <Reveal className="lg:order-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-600 mb-4">
                <QrCode className="h-5 w-5" />
              </span>
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Flexible Token Generation
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Customers can generate tokens through a <strong className="text-foreground">simple QR code</strong>, an <strong className="text-foreground">interactive display or kiosk</strong>, or through other digital channels configured as part of the selected plan.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A QR-based token can be delivered in the most convenient format for the customer—such as a digital token image, WhatsApp message or other supported notification channel. This allows businesses to offer a modern queue experience while keeping hardware requirements to a minimum.
              </p>
            </Reveal>
            
            <Reveal delay={0.15} className="lg:order-1 relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border shadow-md">
              <img
                src={photoHealthcare}
                alt="Patient scanning a queue QR code in a clinic"
                className="h-full w-full object-cover hover:scale-103 transition-transform duration-700"
              />
            </Reveal>
          </div>

          {/* Feature 2: Intelligent Routing */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            <Reveal>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 mb-4">
                <Cpu className="h-5 w-5" />
              </span>
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Intelligent Service Routing
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Once a token is generated, QUESOLS intelligently manages the queue according to the <strong className="text-foreground">services configured by the branch administrator</strong>.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Each service can be mapped to specific operators, counters or service desks, allowing customers to be directed to the appropriate person automatically. This helps eliminate unnecessary waiting, improves staff utilization and ensures that customers reach the right service point without confusion.
              </p>
            </Reveal>
            
            <Reveal delay={0.15} className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border shadow-md">
              <img
                src={photoBanking}
                alt="Service desk routing bank customers to appropriate desks"
                className="h-full w-full object-cover hover:scale-103 transition-transform duration-700"
              />
            </Reveal>
          </div>

          {/* Feature 3: Appointments */}
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            <Reveal className="lg:order-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 mb-4">
                <Users className="h-5 w-5" />
              </span>
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Online Appointments & Bookings
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                QUESOLS also supports <strong className="text-foreground">online appointment and token booking</strong>, allowing customers to access a dedicated booking URL or scan a QR code from anywhere.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Customers can select their preferred <strong className="text-foreground">branch or location, service, date and available time slot</strong> according to the business configuration. Once the booking is completed, they can receive confirmation through supported communication channels such as email or SMS.
              </p>
            </Reveal>
            
            <Reveal delay={0.15} className="lg:order-1 relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border shadow-md">
              <img
                src={photoGovernment}
                alt="Booking online queue tickets from a phone"
                className="h-full w-full object-cover hover:scale-103 transition-transform duration-700"
              />
            </Reveal>
          </div>
        </section>

        {/* Scalability Grid Section */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-brand uppercase tracking-wider">Multi-Location Scaling</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
              Centralized Control, Local Config
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              For businesses operating across multiple locations, QUESOLS provides centralized control while allowing each branch to maintain its own services, operators, counters, token rules and operational requirements.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layers,
                title: "Plan-Based Model",
                desc: "Select the number of branches, services, operators, and display units you actually need, helping you avoid unnecessary hardware investment.",
              },
              {
                icon: ShieldCheck,
                title: "Scales With You",
                desc: "As the business grows, additional branches, services, operators or display modules can be configured and added dynamically with a click.",
              },
              {
                icon: HelpCircle,
                title: "Adaptable Architecture",
                desc: "From a simple QR-based token system to a complete interactive kiosk, digital display, and online appointment booking ecosystem.",
              },
            ].map((item, idx) => (
              <Reveal key={item.title} delay={idx * 0.08} className="h-full">
                <div className="rounded-3xl border border-border bg-surface/50 p-6 shadow-sm hover:border-brand/30 hover:bg-brand/5 transition-all duration-300 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h4 className="mt-4 font-display text-lg font-bold text-foreground">{item.title}</h4>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="mx-auto max-w-5xl px-5 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-violet-600 to-blue-600 px-8 py-16 text-center text-white shadow-xl">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
              
              <h3 className="relative font-display text-2xl sm:text-4xl font-extrabold tracking-tight">
                Reduce waiting times, improve staff efficiency, and deliver a smoother customer experience.
              </h3>
              <p className="relative mx-auto mt-4 max-w-xl text-xs sm:text-sm text-white/90">
                Configure your queue stack using only the technology and hardware you actually need. Spin up your branch queue in under five minutes.
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
