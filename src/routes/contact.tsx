import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { FloatingContact } from "@/components/site/floating-contact";
import { Reveal, motion, EASE } from "@/components/quesole/motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/quesole/store";
import { Mail, Phone, MapPin, Send, RefreshCw, Sparkles, AlertCircle, CheckCircle2, ChevronDown, Clock, ShieldCheck, Headphones, Building2, Zap, Heart, ArrowRight } from "lucide-react";
import contactIllustration from "@/assets/contact-illustration.jpg";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — QUESOLS" },
      {
        name: "description",
        content:
          "Have questions about QUESOLS intelligent queue systems? Get in touch with our team in Ahmedabad, India for custom solutions, pricing, and system integrations.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Integration / Pricing Inquiry",
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
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.subject.trim()) newErrors.subject = "Subject selection is required";
    if (!formData.message.trim()) newErrors.message = "Message is required";

    if (!captchaInput.trim()) {
      newErrors.captcha = "Security code is required";
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
      await apiFetch("/api/contact/", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setIsSuccess(true);
      toast.success("Thank you! Your message was submitted successfully.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "Integration / Pricing Inquiry",
        message: "",
      });
      setCaptchaInput("");
      generateNewCaptcha();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit inquiry. Please try again.");
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
    <div className="min-h-screen bg-[#fafafd] dark:bg-[#080710] font-sans overflow-x-hidden transition-colors duration-300">
      <SiteNav />

      <main className="relative pt-28 pb-16">
        {/* Decorative Blurred Background Vectors */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="absolute top-[8%] right-[10%] h-[600px] w-[600px] rounded-full blur-[100px] opacity-[0.08] bg-[radial-gradient(circle,#8b5cf6_0%,transparent_70%)]" />
          <div className="absolute bottom-[15%] left-[5%] h-[700px] w-[700px] rounded-full blur-[120px] opacity-[0.06] bg-[radial-gradient(circle,#3b82f6_0%,transparent_70%)]" />
        </div>

        {/* Hero Section Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-7xl px-5 lg:px-8 mb-12"
        >
          <div className="grid gap-8 md:grid-cols-[58fr_42fr] items-center">
            {/* Left side texts */}
            <div className="space-y-5 text-left">
              <motion.span
                variants={itemVariants}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-950/20 px-3.5 py-1 text-[10px] font-bold text-brand uppercase tracking-widest shadow-sm"
              >
                <Heart className="h-3 w-3 fill-current" />
                WE'RE HERE TO HELP
              </motion.span>

              <motion.h1
                variants={itemVariants}
                className="font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.040em] sm:text-5xl lg:text-[4.2rem] text-slate-900 dark:text-white"
              >
                Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 font-extrabold">Connect.</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 max-w-xl"
              >
                Have a question about our intelligent queue solutions or need a customized enterprise package? Reach out to our system architects.
              </motion.p>

              {/* Three Pill Badges */}
              <motion.div variants={itemVariants} className="flex flex-wrap gap-2.5 pt-1">
                {[
                  { icon: Zap, text: "Fast Response" },
                  { icon: ShieldCheck, text: "Secure & Private" },
                  { icon: Headphones, text: "Expert Support" },
                ].map((tag) => (
                  <span key={tag.text} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                    <tag.icon className="h-3.5 w-3.5 text-brand" />
                    {tag.text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right side floating illustration */}
            <motion.div
              variants={itemVariants}
              className="hidden md:flex justify-center items-center relative"
            >
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-full max-w-[340px] aspect-square rounded-[2rem] overflow-hidden bg-transparent"
              >
                <img
                  src={contactIllustration}
                  alt="Contact Page Illustration"
                  className="w-full h-full object-contain filter drop-shadow-xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        {/* Form and Info Layout */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8 mb-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] items-start">
            
            {/* Left Side: Contact Information & Visual Map */}
            <div className="space-y-6">
              <Reveal delay={0.05}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <a
                    href="mailto:hello@quesols.com"
                    className="group flex flex-col justify-between p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 hover:border-brand/40 hover:bg-brand/5 shadow-sm transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-brand group-hover:bg-brand group-hover:text-white transition-all">
                        <Mail className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400/60 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="mt-8">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">Email Us</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">hello@quesols.com</span>
                    </div>
                  </a>

                  <a
                    href="tel:+917043884422"
                    className="group flex flex-col justify-between p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 hover:border-brand/40 hover:bg-brand/5 shadow-sm transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-brand group-hover:bg-brand group-hover:text-white transition-all">
                        <Phone className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400/60 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="mt-8">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">Call Us</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">+91 7043884422</span>
                    </div>
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="p-6 rounded-[2rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 shadow-sm relative overflow-hidden group">
                  {/* Subtle City Outline Graphic Background */}
                  <div className="absolute right-4 bottom-0 h-16 w-32 opacity-[0.06] dark:opacity-[0.08] pointer-events-none transition-all group-hover:opacity-[0.09]" aria-hidden>
                    <svg viewBox="0 0 100 50" fill="currentColor" className="w-full h-full text-brand">
                      <rect x="5" y="20" width="10" height="30" />
                      <rect x="20" y="5" width="15" height="45" />
                      <rect x="40" y="15" width="12" height="35" />
                      <rect x="58" y="25" width="8" height="25" />
                      <rect x="70" y="10" width="14" height="40" />
                      <rect x="88" y="30" width="8" height="20" />
                    </svg>
                  </div>
                  
                  <div className="flex gap-4 relative z-10">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-brand">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block">Headquarters</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">QUESOLS Technologies</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-sm">
                        Mithakhali Six Roads, Ahmedabad, Gujarat, India - 380006
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Map block */}
              <Reveal delay={0.15}>
                <div className="overflow-hidden rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 shadow-md aspect-video w-full bg-white relative group">
                  <div className="absolute top-4 left-4 z-10">
                    <a
                      href="https://maps.google.com/?q=Mithakhali+Six+Roads,+Ahmedabad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/95 px-4.5 py-2 text-xs font-semibold text-slate-700 hover:text-brand shadow-md transition-all"
                    >
                      Open in Google Maps
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                  <iframe
                    title="QUESOLS Office Location Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3671.6979148011246!2d72.56214531102738!3d23.034870916053805!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e848aba8b2e3b%3A0x633519d1e4df6a9b!2sMithakhali%20Six%20Rd%2C%20Ahmedabad%2C%20Gujarat!5e0!3m2!1sen!2sin!4v1714562412891!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="grayscale opacity-90 contrast-125 group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              </Reveal>
            </div>

            {/* Right Side: Form Block */}
            <Reveal delay={0.1}>
              <div className="rounded-[2.5rem] border border-violet-500/10 dark:border-violet-500/20 bg-white/80 dark:bg-slate-900/50 p-8 backdrop-blur-md shadow-[0_16px_36px_rgba(99,102,241,0.04)] transition-all duration-300">
                
                {isSuccess ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-10 w-10 animate-bounce" />
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-slate-800 dark:text-slate-100">Message Dispatched!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Thank you for contacting us. A QUESOLS representative has received your details and will get back to you shortly.
                    </p>
                    <Button onClick={() => setIsSuccess(false)} variant="outline" className="rounded-full mt-4">
                      Submit Another Inquiry
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Header inside Form */}
                    <div className="flex gap-4 items-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-brand">
                        <Send className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display text-base font-extrabold text-slate-800 dark:text-slate-200">Send us a Message</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">We typically respond to inquiries within 12 business hours.</p>
                      </div>
                    </div>

                    {/* Grid Inputs */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label htmlFor="name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
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
                        <label htmlFor="email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="john@example.com"
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
                        <label htmlFor="phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
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

                      <div className="space-y-1 relative">
                        <label htmlFor="subject" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Subject *</label>
                        <div className="relative">
                          <select
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/60 pl-4 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all cursor-pointer appearance-none"
                          >
                            <option value="Integration / Pricing Inquiry">Integration / Pricing Inquiry</option>
                            <option value="General Support">General Support</option>
                            <option value="Partnership Query">Partnership Query</option>
                            <option value="Custom Deployment">Custom Deployment</option>
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                        </div>
                        {errors.subject && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {errors.subject}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Message Box */}
                    <div className="space-y-1">
                      <label htmlFor="message" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Your Message *</label>
                      <div className="relative">
                        <textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Write details of your business requirements..."
                          rows={4}
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
                      <span>{isSubmitting ? "Submitting..." : "Send Inquiry"}</span>
                      <Send className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </form>
                )}

              </div>
            </Reveal>

          </div>
        </section>

        {/* Bottom Horizontal Proposition Cards Banner */}
        <section className="mx-auto max-w-7xl px-5 lg:px-8">
          <Reveal delay={0.2}>
            <div className="rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/50 p-6 lg:p-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 shadow-sm backdrop-blur-md">
              {[
                {
                  icon: Clock,
                  title: "Fast Response",
                  body: "We reply within 12 business hours.",
                },
                {
                  icon: ShieldCheck,
                  title: "Secure & Confidential",
                  body: "Your information is 100% safe with us.",
                },
                {
                  icon: Headphones,
                  title: "Expert Support",
                  body: "Get help from our solution architects.",
                },
                {
                  icon: Building2,
                  title: "Enterprise Ready",
                  body: "Scalable solutions for your business.",
                },
              ].map((prop) => (
                <div key={prop.title} className="flex gap-4 items-start text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 text-brand">
                    <prop.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">{prop.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{prop.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
