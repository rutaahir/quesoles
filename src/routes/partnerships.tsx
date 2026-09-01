import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { FloatingContact } from "@/components/site/floating-contact";
import { Reveal, motion, EASE } from "@/components/quesole/motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/quesole/store";
import { Handshake, User, Mail, Phone, Building2, MessageSquare, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, Award, Globe2, Code, ShieldCheck, Heart } from "lucide-react";
import partnershipsIllustration from "@/assets/partnerships-illustration.jpg";

export const Route = createFileRoute("/partnerships")({
  head: () => ({
    meta: [
      { title: "Partner Program — QUESOLS" },
      {
        name: "description",
        content:
          "Collaborate with QUESOLS. Partner with us to deploy intelligent queue orchestration, scale operations, and access co-marketing resources.",
      },
    ],
  }),
  component: PartnershipsPage,
});

function PartnershipsPage() {
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    partner_type: "Technology Partner",
    message: "",
  });

  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Captcha Generator
  const generateNewCaptcha = () => {
    setIsRefreshing(true);
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
    setTimeout(() => setIsRefreshing(false), 300);
  };

  useEffect(() => {
    generateNewCaptcha();
  }, []);

  // Form Field Changers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Field Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    
    if (!formData.email.trim()) {
      newErrors.email = "Business email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid business email address";
    }

    if (!formData.company_name.trim()) newErrors.company_name = "Company name is required";
    if (!formData.partner_type.trim()) newErrors.partner_type = "Partnership type is required";
    if (!formData.message.trim()) newErrors.message = "Collaboration proposal details are required";

    if (!captchaInput.trim()) {
      newErrors.captcha = "Security verification is required";
    } else if (captchaInput.trim().toUpperCase() !== captchaCode) {
      newErrors.captcha = "Code is incorrect";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please resolve form errors before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/partnership-request/", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setIsSuccess(true);
      toast.success("Proposal submitted! Our partnership team will connect soon.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        company_name: "",
        partner_type: "Technology Partner",
        message: "",
      });
      setCaptchaInput("");
      generateNewCaptcha();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grid Stagger Variables
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-[#fafafd] dark:bg-[#080710] font-sans overflow-x-hidden transition-colors duration-300">
      <SiteNav />

      {/* Page Entry Wrapper with Refresh Load Animation */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative pt-28 pb-16"
      >
        {/* Decorative Blurred Background Vectors */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="absolute top-[5%] right-[8%] h-[550px] w-[550px] rounded-full blur-[110px] opacity-[0.07] bg-[radial-gradient(circle,#8b5cf6_0%,transparent_70%)]" />
          <div className="absolute bottom-[20%] left-[5%] h-[650px] w-[650px] rounded-full blur-[130px] opacity-[0.06] bg-[radial-gradient(circle,#3b82f6_0%,transparent_70%)]" />
        </div>

        {/* Hero Section Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-5 lg:px-8 mb-12"
        >
          <div className="grid gap-10 md:grid-cols-[58fr_42fr] items-center">
            {/* Left side text walkthrough */}
            <div className="space-y-5 text-left">
              <motion.span
                variants={itemVariants}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 px-3.5 py-1 text-[10px] font-bold text-brand uppercase tracking-widest shadow-sm"
              >
                <Handshake className="h-3.5 w-3.5 text-brand" />
                QUESOLS ALLIANCES
              </motion.span>

              <motion.h1
                variants={itemVariants}
                className="font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.040em] sm:text-5xl lg:text-[4.2rem] text-slate-900 dark:text-white"
              >
                Grow with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 font-extrabold">QUESOLS.</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 max-w-xl"
              >
                Partner with us to deploy intelligent virtual queue orchestration systems, expand your product suite, and build modern customer flow solutions.
              </motion.p>

              {/* Partnership Tracks Description */}
              <motion.div variants={itemVariants} className="space-y-4 pt-2">
                {[
                  {
                    title: "Technology Partnerships",
                    body: "Integrate QUESOLS core queue services with CRM, analytics packages, SMS/WhatsApp gateways, or proprietary hardware consoles.",
                  },
                  {
                    title: "Resellers & Distributors",
                    body: "Represent QUESOLS locally in your region, utilizing specialized sandboxes, pricing margins, and comprehensive onboarding blueprints.",
                  },
                  {
                    title: "Consultants & Integrators",
                    body: "Help enterprise bank branches, medical clinics, and retail storefronts architect customer flows with high security compliance.",
                  },
                ].map((track, idx) => (
                  <div key={track.title} className="flex gap-3.5 items-start text-left">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-brand mt-0.5">
                      <Award className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
                        {track.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-lg">
                        {track.body}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right side floating partnerships puzzle illustration */}
            <motion.div
              variants={itemVariants}
              className="hidden md:flex justify-center items-center relative"
            >
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="w-full max-w-[420px] aspect-square rounded-[2rem] overflow-hidden bg-transparent"
              >
                <img
                  src={partnershipsIllustration}
                  alt="QUESOLS Partnerships Alliance Illustration"
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Partnership Form & Program Benefits Section */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 mb-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Left Column: Partnership Perks */}
            <div className="space-y-6">
              <Reveal delay={0.05}>
                <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 p-6 lg:p-8 text-left shadow-sm backdrop-blur-md">
                  <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Partner Support Ecosystem</h3>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Revenue Sharing Plans",
                        desc: "Enjoy recurring commission incentives on referred customer plan subscriptions and customized enterprise packages.",
                      },
                      {
                        title: "Sandbox Environment",
                        desc: "Get sandbox tenant instances to run integration test benches, API connections, and mock operator calls.",
                      },
                      {
                        title: "Joint Marketing Support",
                        desc: "Access localized customer collateral brochures, case studies, and co-branded onboarding blueprints.",
                      },
                    ].map((perk) => (
                      <div key={perk.title} className="flex gap-3 items-start">
                        <Award className="h-4.5 w-4.5 text-brand shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{perk.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{perk.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 p-6 lg:p-8 text-left shadow-sm backdrop-blur-md group">
                  <h3 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Technical Documents</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Read our queue routing mapping system specs and core branch integration configurations.
                  </p>
                  <Button asChild size="sm" className="rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold group-hover:scale-102 transition-transform border-0">
                    <Link to="/services">Explore Queue Services</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Partnership Application Form */}
            <Reveal delay={0.1}>
              <div className="rounded-[2.5rem] border border-violet-500/10 dark:border-violet-500/20 bg-white/80 dark:bg-slate-900/50 p-8 backdrop-blur-md shadow-[0_16px_36px_rgba(99,102,241,0.04)] transition-all duration-300">
                
                {isSuccess ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-10 w-10 animate-bounce" />
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-slate-800 dark:text-slate-100">Proposal Dispatched!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Thank you for submitting your partnership application. A QUESOLS alliances manager has received your details and will connect shortly to schedule an initial discovery call.
                    </p>
                    <Button onClick={() => setIsSuccess(false)} variant="outline" className="rounded-full mt-4">
                      Submit Another Proposal
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Header inside Form */}
                    <div className="flex gap-4 items-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-brand">
                        <Handshake className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-200">Become a Partner</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Let's build intelligent customer journeys together.</p>
                      </div>
                    </div>

                    {/* Grid Inputs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor="name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          Full Name *
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                        {errors.name && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.name}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          Business Email *
                        </label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="partner@company.com"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                        {errors.email && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor="phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+91 99999 99999"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="company_name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          Company / Organization *
                        </label>
                        <input
                          id="company_name"
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleChange}
                          placeholder="Acme Corp"
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                        {errors.company_name && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.company_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 relative">
                      <label htmlFor="partner_type" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Partnership Type *</label>
                      <div className="relative">
                        <select
                          id="partner_type"
                          name="partner_type"
                          value={formData.partner_type}
                          onChange={handleChange}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 pl-4 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer appearance-none"
                        >
                          <option value="Technology Partner">Technology Partner</option>
                          <option value="Reseller / Distributor">Reseller / Distributor</option>
                          <option value="System Integrator">System Integrator</option>
                          <option value="Strategic Alliance">Strategic Alliance</option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                      </div>
                      {errors.partner_type && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.partner_type}
                        </span>
                      )}
                    </div>

                    {/* Proposal textarea */}
                    <div className="space-y-1">
                      <label htmlFor="message" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-slate-400" />
                        Collaboration Proposal *
                      </label>
                      <div className="relative">
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Describe how QUESOLS maps to your software stack or client deployment blueprints..."
                          rows={3}
                          maxLength={1000}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none"
                        />
                        <span className="absolute bottom-2.5 right-3.5 text-[9px] text-slate-400/85 font-mono">
                          {formData.message.length} / 1000
                        </span>
                      </div>
                      {errors.message && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.message}
                        </span>
                      )}
                    </div>

                    {/* Captcha Security Check */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-1">
                      <label htmlFor="captchaInput" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                        Security Verification *
                      </label>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-950/30 text-brand px-6 py-2.5 select-none font-mono text-base font-bold tracking-[0.25em] overflow-hidden border border-violet-500/10 min-w-[120px] shadow-sm">
                          <span className={`transition-all duration-300 ${isRefreshing ? "opacity-0 scale-75 blur-sm" : "opacity-100 scale-100 blur-none"} select-none`}>
                            {captchaCode.split("").join(" ")}
                          </span>
                        </div>

                        <Button
                          type="button"
                          onClick={generateNewCaptcha}
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                          <RefreshCw className={`h-4.5 w-4.5 text-slate-400 ${isRefreshing ? "animate-spin" : ""}`} />
                        </Button>

                        <input
                          id="captchaInput"
                          type="text"
                          name="captcha"
                          maxLength={4}
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                          placeholder="Enter the code shown"
                          className="flex-1 min-w-[150px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
                        />
                      </div>

                      {errors.captcha && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {errors.captcha}
                        </span>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-2xl font-bold bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 text-white py-3 shadow-md flex items-center justify-center gap-2 group transition-all mt-2 cursor-pointer border-0"
                    >
                      <Handshake className="h-4 w-4" />
                      <span>{isSubmitting ? "Submitting Proposal..." : "Submit Proposal"}</span>
                    </Button>
                  </form>
                )}

              </div>
            </Reveal>

          </div>
        </section>

        {/* Bottom Horizontal Value Banner */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal delay={0.2}>
            <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 p-6 lg:p-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 shadow-sm backdrop-blur-md">
              {[
                {
                  icon: Award,
                  title: "Shared Revenue",
                  body: "Competitive commissions on client plans.",
                },
                {
                  icon: Globe2,
                  title: "Co-Marketing Support",
                  body: "Access tailored brochures and assets.",
                },
                {
                  icon: Code,
                  title: "Developer Sandbox",
                  body: "Dedicated test keys and webhook endpoints.",
                },
                {
                  icon: ShieldCheck,
                  title: "Partner Managers",
                  body: "Priority onboarding blueprints and compliance.",
                },
              ].map((perk) => (
                <div key={perk.title} className="flex gap-4 items-start text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-brand">
                    <perk.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">{perk.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{perk.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </motion.main>

      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
