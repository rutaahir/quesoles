import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { FloatingContact } from "@/components/site/floating-contact";
import {
  AlertIntelligence,
  AnalyticsSection,
  CommandCentre,
  FinalCta,
  Hero,
  HowItWorks,
  LiveQueueDemo,
  MethodsSection,
  PricingBlock,
  ProblemSection,
  ScrollControlledBackground,
  TrustSection,
  UseCases,
} from "@/components/site/sections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quesole — Turn waiting into a smarter experience" },
      {
        name: "description",
        content:
          "Quesole orchestrates walk-in queues, multi-desk routing, Now Serving display boards and remote appointments across every branch, in real time.",
      },
      { property: "og:title", content: "Quesole — Queue orchestration for every branch" },
      {
        property: "og:description",
        content:
          "Four queuing methods, live dashboards and real-time alerts for healthcare, banking, government and retail service teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        <Hero />
        <ScrollControlledBackground />
        <ProblemSection />
        <HowItWorks />
        <LiveQueueDemo />
        <MethodsSection />
        <CommandCentre />
        <AnalyticsSection />
        <AlertIntelligence />
        <UseCases />
        <PricingBlock compact />
        <TrustSection />
        <FinalCta />
      </main>
      <SiteFooter />
      <FloatingContact />
    </div>
  );
}
