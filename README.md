# Queue Flow

project name : Quesole
Lovable Build Prompt — Queuing Solutions SaaS Platform (FRONTEND-ONLY PHASE)

Copy everything below into Lovable as your project prompt.

⚠️ SCOPE FOR THIS PHASE: FRONTEND ONLY This build is frontend-only. Do NOT set up Supabase, a real database, real authentication, real Edge Functions, or real backend persistence in this phase. Every screen, role, and workflow must still be fully click-through-able and visually complete — but powered entirely by realistic mock/seed data, local component state, and simulated real-time updates (e.g. setInterval/timers/randomized mock events), not a live backend. Structure the code so a real backend (Supabase or otherwise) can be wired in later without a rewrite: isolate all data access behind a clean mock "data service" / "api" layer (e.g. src/lib/mock-data/*, src/services/*) so those files are the only place that will need to change when a real backend is added.

Build Queuing Solutions — a premium, multi-tenant SaaS platform for queue and appointment management that feels like it belongs in the same league as Linear, Stripe, and Notion. This is not a basic admin panel. Every screen should feel designed, not assembled — intentional whitespace, a confident color story, motion that explains what just happened instead of just decorating it, and a level of polish that makes a first-time visitor think "whoever built this cares about craft."

Product Vision

Queuing Solutions lets companies with one or many branches digitize their customer queues and appointments. Companies subscribe to a plan, register branches, assign staff, and run four different queuing methods depending on what each branch needs — a walk-in QR ticket, a multi-desk service queue, a live "now serving" display board, or a fully remote appointment booking flow. Everything is monitored in real time through role-based dashboards, alerts, and reports.

For this phase, build it as a genuinely working, fully interactive frontend prototype — not a static mockup. Every role should be able to click through their entire workflow end to end using realistic mock data, simulated login/session state, and simulated real-time updates that behave exactly like a live system would (numbers ticking, tokens advancing, alerts firing) — just without a real backend behind them yet.

Design Language

Aesthetic: Modern SaaS elegance — think soft gradients meeting crisp glassmorphism, generous rounded corners, layered depth via subtle shadows, and confident typographic hierarchy. Avoid generic Bootstrap-looking UI at all costs.

Color theme: A refined primary palette built around a deep indigo/violet-to-teal gradient as the brand anchor, with a warm accent (amber or coral) reserved for calls-to-action and live/urgent states. Full light and dark mode, both equally polished, with a smooth theme-toggle transition rather than an instant flash.

Typography: A distinctive modern sans-serif pairing — one confident display face for headings, one highly legible workhorse face for body/UI text. Real type scale, real line-height discipline, no cramped text.

Spacing & layout discipline: Every section respects a consistent spacing rhythm. No wasted dead space, but nothing ever feels cramped either — this is the difference between amateur and professional layout. Use a real grid system, consistent gutters, and align everything to it. Dashboards should feel information-dense yet calm, never cluttered.

Iconography & imagery: Consistent icon set (Lucide-style), custom illustrated empty states, and a hero section built around a tasteful 3D visual — an abstract animated queue/ticket/flow visualization (Spline or Three.js) that subtly reacts to cursor movement. Use short looping ambient motion graphics or a lightweight autoplay video in the marketing hero to show the live-queue concept in action, always muted and elegantly framed, never gimmicky.

Motion & Interaction

This product should move with intention:

Scroll-driven storytelling on the marketing/landing page: sections fade and rise into view, feature cards stagger in, the hero's 3D element parallaxes gently against scroll, and a sticky progress indicator or animated nav accents the current section.

Micro-interactions everywhere: buttons with tactile hover/press feedback, form fields that animate their focus state, toggle switches with satisfying spring motion, success states that celebrate briefly (a confetti burst or checkmark morph on completed actions like "ticket served" or "company approved") without ever feeling childish.

Page and state transitions: route changes cross-fade/slide smoothly, modals and drawers spring open rather than snap, skeleton loaders (not blank spinners) hold the shape of the content that's coming.

Live data feels alive: queue counters animate number changes with a smooth count-up/count-down, live dashboard tiles pulse subtly when a value updates (driven by a mock real-time simulator), and the "Now Serving" display board animates the number change like a departures board flipping.

Use a motion library (Framer Motion or equivalent) consistently — the same easing curves and durations across the whole app so nothing feels mismatched.

Responsiveness

Every single screen — marketing pages, every dashboard, every form, the live display board, the kiosk screen — must be flawless at mobile, tablet, laptop, and large-desktop breakpoints. No horizontal scroll, no overlapping elements, no orphaned buttons. Navigation collapses gracefully into a refined mobile menu. Tables become readable stacked cards on small screens instead of shrinking into unreadable text. Touch targets are properly sized on mobile. Treat mobile-first as the baseline, not an afterthought.

Tech Foundation (Frontend-Only Phase)

Frontend: React + TypeScript, Tailwind CSS, a motion library for animation, a charting library for analytics (real interactive charts driven by mock data, not static images).

Data layer (no real backend in this phase): All data — companies, branches, staff, queues, tokens, appointments, alerts, reports — lives in a well-structured mock data layer (typed TypeScript fixtures/seed files) plus in-memory/local React state (Context, Zustand, or similar) for anything the user creates or edits during a session. Do NOT wire up Supabase or any other real backend, real database, real auth provider, or real Edge Functions in this phase.

Simulated authentication: Build fully designed login, password-reset, and OTP screens with real-feeling client-side validation and transitions, but back them with a mock auth layer — a simple role-switcher/fake session (e.g. stored in local component state or localStorage purely for demo continuity) that lets a reviewer instantly experience the app as any of the five roles below. No real credential verification, no real OTP delivery — simulate the OTP flow with a fake code (shown on-screen or auto-accepted) after a short delay.

Simulated real-time: Recreate the feel of Supabase Realtime with local simulation — timers/intervals that advance mock queue tokens, update counters, and occasionally fire mock alerts, so every live element (dashboards, the display board, the customer tracking page) genuinely feels alive without a live backend.

File/asset handling: Use static placeholder assets and client-side-only file previews (e.g. URL.createObjectURL) for anything that would eventually be an upload (company logos, QR codes, exported reports) — no real storage backend.

Multi-tenant isolation (simulated): Structure the mock data layer so that switching the "current company" or "current branch" in the role-switcher correctly filters everything the UI shows — replicating what real Row-Level Security would enforce later, purely at the mock-data-layer level for now.

Build this as a real, deployable, production-shaped frontend — proper environment config, proper route guards based on the simulated session/role, proper loading/error/empty states everywhere (even though "error" states will need to be triggerable via mock toggles since there's no real backend to fail), not just the happy path.

Roles to Support

Platform Super Admin — owns the whole platform: approves company sign-ups, defines subscription packages and feature limits, views platform-wide analytics, reviews upgrade requests, manages global settings.

Company Admin — manages their company: branches, staff, subscription/billing, a consolidated multi-branch live dashboard, alerts, and reports.

Branch Admin / Operator — configures a single branch: desks, services, QR codes, the live display board, printer settings, appointment slots; runs day-to-day operations.

Desk / Counter Staff — serves customers: calls the next ticket, marks tickets served, adds notes, transfers tickets.

End Customer — the public, no-login user who scans a QR code or books an appointment online.

Core Modules & Screens to Build

Marketing site: a genuinely impressive landing page (hero with the 3D visual, feature showcase, how-it-works section, pricing table comparing plan tiers, testimonials/social proof section, animated footer), plus a pricing page and a multi-step company sign-up wizard with plan selection (submission simulated with a success state — no real account created).

Authentication: elegant login and password-reset screens for staff/admins, and a passwordless OTP flow for public customers booking appointments — all simulated as described above, with a lightweight role-switcher for demo purposes so any reviewer can jump into any role instantly.

Platform Super Admin console: dashboard with platform KPIs, a company approval queue, package/plan editor, upgrade-request inbox, platform-wide audit log — all backed by mock data, with actions (approve, edit plan, etc.) updating local state so the UI genuinely reflects the change.

Company Admin console: a real-time-feeling multi-branch dashboard (live queue length, tokens served, average wait time, operator status per branch, drill-down into any branch), branch management, staff/user management with role invites (simulated), subscription & billing page with usage meters and mock invoices, company branding settings, an alert-rules builder, and a reports/analytics section with exportable trend charts and peak-hour heatmaps (mock CSV/PDF export can be a real client-side-generated file from mock data).

Branch Admin / Operator console: branch dashboard, queue-method configuration (toggle and configure the four methods below), desk & service manager, QR code generator with live preview (a real client-generated QR code pointing to a demo route is fine), live-display-board layout settings, appointment slot scheduler, and branch-level reports.

The four queuing methods, fully working end to end on mock data:

Method 1: a public QR-landing page where a customer joins a single queue with name/contact/message and receives a token, plus an operator console that calls and serves tickets in order (queue state lives in local/mock state and updates live in the UI).

Method 2: multi-desk service-based queuing — the customer picks a service and is auto-routed to the right desk's queue (mock routing logic).

Method 3: everything in Method 2 plus a gorgeous full-screen live "Now Serving" display board meant to run on a TV/tablet at the branch, animating token changes driven by the mock real-time simulator.

Method 4: a fully remote appointment-booking portal — pick a location, verify by simulated OTP, choose a service and time slot, get a confirmation with reschedule/cancel options (all against mock slot data).

Live token tracking page for customers — a beautiful, calm real-time-feeling page showing their position in line and estimated wait, updating live via the mock simulator without a page refresh.

KOT kiosk screen — a large-touch-target, tablet-friendly interface for walk-in customers to select a service and trigger a (simulated) printed token, visually distinct from the rest of the admin UI (bold, simple, fast).

Notifications & alerts — an in-app notification center with unread badges, and a trigger-rule builder for conditions like long wait time, SLA breach, no operator online, or a device going offline — alerts can be triggered by the mock simulator so the flow feels real.

Reports & analytics — operational KPIs, staff performance, branch comparison, and exportable CSV/PDF reports (client-side generated from mock data), all rendered with genuinely nice, animated, real-data-feeling charts.

The Bar You're Building To

Every list should be sortable and filterable without feeling heavy. Every empty state should be a small moment of delight, not a blank page. Every long-running action should have a proper loading state (simulate realistic delay/latency even though there's no real network call, so the UX will translate directly once a backend is attached). Every success and error should be communicated through a well-designed toast, not a browser alert. Every table, card, and dashboard tile should breathe — properly padded, properly aligned, nothing touching the edge of its container by accident, nothing bunched together out of laziness.

This should look and feel like a product a company would happily pay for — visually striking on first impression, and effortless to actually use once you're inside it every day — and it should be built cleanly enough that wiring in a real backend later is a data-layer swap, not a redesign.

🚀 ULTIMATE LOVABLE MASTER PROMPT QUEUING SOLUTIONS — NEXT-GENERATION 3D / IMMERSIVE SAAS PLATFORM (FRONTEND-ONLY PHASE)

You are not being asked to create another generic SaaS dashboard. You are being asked to create a premium, immersive, visually unforgettable, production-quality frontend experience for Queuing Solutions — fully interactive, fully mock-data-driven, with no real backend in this phase.

Think like a combination of: Principal Product Designer Creative Director 3D Experience Designer Motion Designer UX Architect Senior Frontend Engineer SaaS Product Architect Visual Storyteller with decades of experience creating products for world-class technology companies.

The objective is simple: Make users stop and say: "WOW. This doesn't look like a normal SaaS application."

The product must feel: Premium + Intelligent + Human + Fast + Futuristic + Trustworthy + Elegant + Immersive

Do NOT make it look like: a Bootstrap dashboard a generic Tailwind template a standard admin panel a collection of cards a basic CRUD application a website filled with gradients and shadows an AI-generated template

Instead, create an original visual language for Queuing Solutions.

01 — FIRST PRINCIPLE

The entire website should tell a visual story. The user should feel like they are moving through a living digital environment.

Instead of: Hero → Cards → Features → Pricing

create: Problem → Human experience → Transformation → Live queue → Intelligent orchestration → Real-time control → Business intelligence → Enterprise platform

Every section should visually evolve into the next. The website should feel alive.

02 — VERY IMPORTANT: LIGHT THEME ONLY

Create a premium light-first visual identity. DO NOT use a traditional dark SaaS theme.

The primary visual environment should be: warm white, soft ivory, pearl, very light blue, extremely subtle lavender, soft indigo, muted violet, gentle cyan, controlled coral/orange accents

Use dark colors only for text and contrast.

Avoid: black backgrounds, neon cyberpunk, excessive purple, overly saturated gradients, aggressive glowing UI

The visual feeling should be: Apple-level cleanliness + modern SaaS intelligence + futuristic spatial design.

03 — CREATE A UNIQUE COLOR SYSTEM

Do not simply use: purple + white. Create a sophisticated layered palette.

Primary: Soft Indigo Secondary: Elegant Violet Supporting: Ice Blue Accent: Warm Coral / Amber Success: Fresh Emerald Warning: Soft Amber Background: Warm Pearl / Ivory Surface: Pure White

Use gradients extremely carefully. Gradients should feel like light passing through glass, not colorful backgrounds.

04 — THE WEBSITE MUST HAVE VISUAL DEPTH

The entire application should have multiple depth layers.

Layer 1: Background atmosphere Layer 2: Ambient floating shapes Layer 3: 3D objects Layer 4: Content Layer 5: Interactive UI Layer 6: Foreground micro-elements

This creates a spatial feeling. The user should feel that elements exist at different distances from them.

05 — "4D" EXPERIENCE

When I say 4D, do not interpret this literally as a scientific 4D object. Interpret it as: 3D space + time + interaction + movement.

Every important visual should change over time. Examples: objects rotate slowly; queue tokens travel through space; cards move according to scroll position; numbers transform; lines connect dynamically; dashboards react to simulated live events; particles respond to cursor movement; charts draw themselves; appointment slots morph when selected; queue tokens move forward; status indicators breathe; transitions connect one state to another.

The interface should feel temporal, not static.

06 — HERO SECTION MUST BE EXTRAORDINARY

Do NOT create a normal SaaS hero with: Headline, Subheading, Button, Dashboard screenshot. Instead create an immersive hero.

Hero concept: "The Queue, Reimagined."

Left: Large editorial headline. Example: Turn waiting into a smarter experience. Supporting text: One intelligent platform for queues, appointments, branches, customers and real-time operations. Buttons: Start Free / Explore the Experience

Right / Center: A large interactive 3D queue ecosystem — floating digital tickets, translucent queue capsules, branch nodes, service counters, glowing connection paths, floating customer avatars, digital token numbers, small dashboard panels, animated queue lines.

The objects should continuously move. When the cursor moves, the scene subtly reacts. When scrolling, the scene transforms. When hovering a token, it comes forward. When clicking, the queue path changes.

07 — USE REALISTIC 3D OBJECTS

Do NOT use only abstract blobs. Create realistic 3D concepts such as: Digital Ticket, Queue Token (premium glass/acrylic token with a number), Service Counter, Smartphone (showing live queue position), Digital Display (NOW SERVING A104), Appointment Calendar, Branch Network (miniature 3D buildings connected together), Kiosk, Operator Desk.

Use: Three.js, React Three Fiber, Drei, Spline, Lottie, SVG animation — where appropriate. Do not load everything at once.

08 — REALISTIC PHOTOGRAPHY

This is extremely important. Do NOT fill the website with random stock photos. Use high-quality realistic human photography showing actual service environments: Healthcare, Banking, Government, Retail, Corporate, Education, Telecom, Airport/Travel.

Images should feel authentic, premium, natural, professionally photographed, diverse, modern, human. Avoid cheesy corporate stock photography. If an image looks obviously like stock photography, replace it.

09 — USE REAL PRODUCT VIDEOS

Where visually useful, incorporate short premium videos: Hero — a 10–15 second cinematic video showing customer enters → scans QR → receives token → checks phone → approaches counter → service completed. Queue section — short realistic video of a modern service center. Appointment section — phone booking experience. Enterprise section — multi-branch operations.

Videos should be muted by default, autoplay where appropriate, looped, optimized, lazy-loaded, responsive, and replaced by poster images on slow connections. Never allow video to make the website slow.

10 — SCROLL STORYTELLING

Do not simply reveal cards when scrolling. Create cinematic scroll sequences: Scene 1 — A customer is waiting. Scene 2 — The environment becomes chaotic. Scene 3 — A digital token appears. Scene 4 — The token enters a queue. Scene 5 — The queue becomes organized. Scene 6 — A service counter activates. Scene 7 — The customer receives notification. Scene 8 — The queue completes. Scene 9 — The dashboard appears.

This should feel like a short interactive product film. Use GSAP ScrollTrigger, Framer Motion / Motion, React Three Fiber, CSS transforms, Lottie — where appropriate.

11 — UNIQUE ANIMATION LANGUAGE

Create a consistent motion system. Every animation should have a purpose. Use: Magnetic buttons, magnetic CTA, 3D tilt, depth hover, morphing, liquid transitions, number transitions, token transitions (queue numbers slide like physical ticket systems), flip animations (Now Serving numbers flip like airport departure boards), path animation, particle movement, soft floating, scroll velocity reactions.

12 — DO NOT OVER-ANIMATE

This is critical. Premium animation is NOT: bouncing everything, rotating everything, endless particles, flashing gradients, excessive blur, constant movement.

Use: 80% calm + 20% magic. The interface should feel alive without becoming distracting.

13 — LANDING PAGE STRUCTURE

Create a world-class landing page with these sections (all driven by mock/demo data):

SECTION 01 — IMMERSIVE HERO: 3D queue ecosystem. Headline: The smarter way to manage every queue. Subheading. CTA. Secondary CTA. Floating live queue metrics (e.g. 1,248 Customers Served Today / Average Wait 06:42 / 32 Active Branches) animating continuously via the mock simulator.

SECTION 02 — HUMAN PROBLEM: realistic photography showing crowded reception, customer checking phone, waiting line, staff handling multiple customers, then transitioning into an organized digital environment. Headline: Waiting shouldn't feel like waiting.

SECTION 03 — THE TRANSFORMATION: cinematic before/after sequence (Before: physical queue. After: digital queue), scroll-driven.

SECTION 04 — HOW IT WORKS: interactive 3D journey — Customer joins → Digital token appears → Queue moves → Customer gets notified → Service begins. Each step animates into the next.

SECTION 05 — LIVE QUEUE: interactive queue simulation. NOW SERVING A104, then A105/A106/A107. Tokens move naturally. Show "7 people ahead", "Estimated wait 18 min", "Counter 03". Allow the user to interact with the demo (mock-data driven).

SECTION 06 — QR EXPERIENCE: realistic smartphone in 3D showing Scan QR → Select Service → Get Token → Track Queue → Get Notified. The phone rotates slightly as the user scrolls.

SECTION 07 — APPOINTMENTS: floating 3D calendar; slots animate; selecting a slot (e.g. 10:30 AM) smoothly expands/highlights; show "Appointment Confirmed" with a subtle success animation.

SECTION 08 — MULTI-BRANCH COMMAND CENTER: beautiful 3D map-like visualization with branches as floating nodes (e.g. Ahmedabad, Surat, Mumbai, Rajkot, Delhi). Connections animate. Selecting a branch updates the dashboard (mock data).

SECTION 09 — REAL-TIME OPERATIONS: realistic operational dashboard showing live queue/desks/staff/appointments/alerts with subtle live animations from the mock simulator.

SECTION 10 — OPERATOR EXPERIENCE: large "CALL NEXT" button, Current A104, Next A105/A106/A107. Clicking Call Next moves A104 to Completed and A105 becomes Current, animating beautifully in local state.

SECTION 11 — LIVE DISPLAY BOARD: large-screen visual, NOW SERVING A105, COUNTER 03, numbers flip airport-board style.

SECTION 12 — ANALYTICS: animated data visualization — charts draw themselves, respond to hover, update numbers, show tooltips, animate when filters change (mock dataset). Do not use boring chart libraries without customization.

SECTION 13 — ALERT INTELLIGENCE: "Queue wait time exceeded 15 minutes" → Alert detected → Operator notified → Queue optimized → Wait time reduced, animated to communicate the product value visually.

SECTION 14 — ENTERPRISE SCALE: sophisticated network visualization — Company → Branches → Services → Desks → Customers, with thousands of tiny data points moving subtly to communicate scalability.

SECTION 15 — REALISTIC USE CASES: high-quality real photography cards for Healthcare, Banking, Government, Retail, Telecom, Education, Corporate Services, each with a subtle 3D hover effect.

SECTION 16 — PRICING: elegant floating pricing modules, Monthly/Annual toggle with smoothly morphing prices, recommended plan rises slightly, feature comparison expands elegantly, CTA buttons use subtle magnetic effects.

SECTION 17 — TRUST: security, reliability, uptime, enterprise, privacy — visualized with tasteful 3D objects (e.g. a 3D glass shield protecting data). Do NOT use cliché lock icons everywhere.

SECTION 18 — FINAL CTA: immersive final scene — a 3D queue transforms into a smooth flowing line. Headline: Ready to make waiting smarter? CTA: Start Your Free Trial. Secondary: Book a Demo.

SECTION 19 — FOOTER: elegant and compact, with Product / Solutions / Resources / Company / Legal / Social sections and a subtle animated background line pattern. Do not make the footer unnecessarily tall.

14 — APPLICATION DASHBOARD EXPERIENCE

The authenticated (simulated-session) application must continue the same visual language. Do NOT create a completely different generic dashboard. Use clean light surfaces, subtle glass panels, soft shadows, sophisticated typography, animated KPI numbers, interactive charts, 3D micro-elements, subtle background motion — but maintain high information density.

15 — SUPER ADMIN DASHBOARD

Make it feel like a mission control center. Top: animated KPI metrics. Middle: live company activity. Main: interactive platform visualization. Side: alerts. Bottom: recent activity. Use realistic simulated live data (mock generator).

16 — COMPANY DASHBOARD

Show Branches, Active Queues, Customers Today, Appointments, Average Wait, Service Time, Alerts, Staff Status. Use animated transitions, all mock-data driven.

17 — BRANCH DASHBOARD

Show desk status, queue status, appointments, current token, next tokens, staff status. Use a visual operational map rather than only cards.

18 — OPERATOR CONSOLE

This must be the fastest and easiest screen in the entire product. Operator should understand everything within one second. Large "CALL NEXT" button; secondary actions: Recall, Skip, Transfer, Hold, Complete. Current token should dominate visually. Use keyboard shortcuts. Use animations as feedback, not decoration.

19 — CUSTOMER TOKEN PAGE

This page must be beautiful on mobile. Huge "A104", then "7 people ahead", "Estimated wait 18 min", "Counter 03". Create a visual queue progress path — the token moves along the path as the mock simulator advances the queue.

20 — MOBILE EXPERIENCE

Do NOT simply shrink desktop. Redesign mobile layouts intentionally so it feels like a premium mobile application — bottom navigation, swipe interactions, bottom sheets, touch gestures, large touch targets, sticky actions, compact cards. Customer QR flow must be extremely simple.

21 — REALISTIC MOCK DATA

Never use John Doe / Company 1 / Branch 1 / Lorem ipsum. Use believable examples: Apollo Care Center, Ahmedabad Central Branch, Surat Customer Service Hub, Axis Business Center, CityCare Hospital, and realistic names, times, token numbers, branch locations, services, waiting times, appointment slots. Since there is no backend in this phase, this mock data IS the entire data layer — invest real care in making it feel alive and comprehensive across every role and screen.

22 — MICRO-INTERACTIONS

Every important interaction should have feedback: button clicked → subtle compression; form submitted → progress state; success → elegant confirmation; delete → confirmation animation; save → checkmark morph; notification → slide + fade; toggle → spring transition; dropdown → smooth expansion; card hover → depth shift; chart filter → animated transition.

23 — PAGE TRANSITIONS

Do not hard-cut between pages. Use a consistent transition system: fade + slide, shared element transition, blur-to-focus, morphing container, depth transition. Keep transitions short.

24 — 3D PERFORMANCE

3D is important, but performance is more important. Use lazy loading, level of detail, compressed textures, optimized models, WebP/AVIF, reduced particle counts on mobile, fallback images, reduced-motion mode. On low-powered devices, gracefully reduce 3D complexity. Never sacrifice usability.

25 — REAL IMAGE STRATEGY

For each major marketing section ask: Would a real photograph communicate this better than an illustration? If yes, use photography. Would a 3D object communicate this better? If yes, use 3D. Would a short video communicate this better? If yes, use video. Do NOT use the same visual technique everywhere — that variation is what makes the website feel professionally art-directed.

26 — VISUAL ART DIRECTION

Photography: natural light, real environments, real people, cinematic depth of field, authentic expressions. 3D: soft materials, glass, frosted acrylic, brushed metal, modern architectural surfaces, soft shadows, realistic lighting. Avoid cartoonish 3D.

27 — BACKGROUND DESIGN

Do not leave every section as a plain white rectangle. Create subtle environmental layers: soft radial light, flowing lines, faint grid, floating particles, blurred shapes, light gradients, subtle noise texture — but keep them extremely subtle. Content must always remain the focus.

28 — SCROLL PROGRESS

Use subtle scroll progress indicators where useful. Sections should feel connected — when a user moves from Queue to Appointment, the visual language should transition naturally.

29 — CURSOR INTERACTION

On desktop, create tasteful cursor interactions: 3D objects respond, buttons become magnetic, images slightly distort, cards tilt, links reveal underline animation, interactive objects follow cursor depth. Do NOT create a giant annoying custom cursor everywhere.

30 — ACCESSIBILITY

Respect prefers-reduced-motion. When enabled: disable heavy 3D, reduce parallax, remove excessive movement, keep functional transitions. Accessibility must never be sacrificed for visual effects.

31 — RESPONSIVE 3D

Desktop: full 3D experience. Tablet: reduced 3D complexity. Mobile: simplified 3D scenes / animated illustrations. Very small screens: static high-quality fallback visuals. Never allow overflow, clipped models, horizontal scrolling, unreadable text, or broken animations.

32 — NO GIANT SPACING

This is mandatory. Do not make every section min-height: 100vh unless there is a real storytelling reason. Do not use giant padding simply to make the website look expensive. Use intentional compact luxury — rich but efficient.

33 — NO GENERIC COMPONENTS

Do not simply generate Card / Card / Card / Card. Instead vary visual composition: editorial layouts, overlapping visuals, asymmetric sections, full-width scenes, split-screen storytelling, floating elements, interactive diagrams, timelines, immersive sections — while maintaining alignment and usability.

34 — VISUAL HIERARCHY

Every screen should have ONE obvious primary action. The eye should naturally move: primary headline → important information → primary action → supporting information. Do not make everything visually loud.

35 — USER FRIENDLINESS

Beautiful does not mean complicated. Every workflow should be obvious. Customer: Scan → Select → Get Token → Track → Get Served. Operator: Open → Call Next → Serve → Complete. Admin: Configure → Monitor → Analyze. Never force users through unnecessary screens.

36 — DESIGN THE FULL SCREEN SET AS ONE PRODUCT

Use the full screen/module specification above as the page/module foundation (marketing, customer experience, Super Admin, Company Admin, Branch Admin, Operator, Kiosk, Display Board). Do not redesign every screen independently — create a single visual system and evolve it consistently across all of them, all running on the shared mock data layer.

37 — IMPORTANT INTERACTION PRINCIPLE

Every animation should answer at least one question: Why is this moving? Possible reasons: showing state change, showing hierarchy, guiding attention, confirming an action, explaining a workflow, creating spatial depth, communicating live (simulated) data. If an animation has no purpose, remove it.

38 — TECHNOLOGY (Frontend-Only)

Use modern production-quality frontend technology: React, TypeScript, Vite, Tailwind, shadcn/ui, Framer Motion / Motion, GSAP where scroll choreography is required, Three.js, React Three Fiber, Drei, Lottie, Recharts / custom SVG visualization, and a lightweight state manager (React Context or Zustand) for the mock data layer. Do NOT add Supabase, any database client, any real auth SDK, or any backend service in this phase. Use libraries selectively — do not add libraries simply because they are trendy.

39 — CODE QUALITY

Create reusable components, reusable animation primitives, reusable 3D components, reusable sections, design tokens, consistent naming, clean folder structure, responsive utilities, accessible components. Keep the mock data layer isolated and well-typed so it is easy to swap for a real backend later. Do not duplicate code.

40 — ANIMATION DESIGN TOKENS

Create a global animation system: Micro: 100–180ms Normal: 200–350ms Emphasis: 400–700ms Cinematic: 800–1500ms Use consistent easing (ease-out, spring, smooth cubic-bezier). Do not use random animation timings.

41 — LOADING EXPERIENCE

Never show a blank page. Use beautiful skeleton states, with a short artificial delay on mock "data fetches" so the loading UX feels real and will translate directly once a real backend is connected. For 3D sections, show an optimized poster image first, then load the 3D scene. For videos, show a poster image, then load the video.

42 — IMAGE / VIDEO OPTIMIZATION

Every visual asset must be optimized: WebP, AVIF, compressed MP4/WebM, responsive images, lazy loading, preload only critical assets. Do not destroy Core Web Vitals for visual effects.

43 — SEO

Marketing pages must include semantic HTML, metadata, Open Graph, Twitter cards, structured headings, accessible image alt text, optimized loading.

44 — FINAL VISUAL QUALITY CHECK

Before considering a page complete, ask: Does this look like a $1M SaaS product? Does it look different from normal AI-generated websites? Is the visual hierarchy excellent? Are animations purposeful? Are 3D elements realistic? Are photographs authentic? Are videos used where useful? Is the light theme beautiful? Is the interface comfortable for long usage? Is the mobile experience equally polished? Is there unnecessary empty space? Is there unnecessary visual noise? Does the page feel alive? If the answer to any is NO: REDESIGN IT.

45 — MOST IMPORTANT FINAL DIRECTIVE

Do not interpret this prompt as "Add some animations to a dashboard." Interpret it as: "Create an entirely new visual experience for a next-generation queue management platform — as a complete, polished, mock-data-driven frontend, ready for a real backend to be connected in a later phase."

I want the final frontend to have: realistic photography, cinematic videos, interactive 3D, scroll-driven storytelling, depth, motion, micro-interactions, real-time-feeling visualizations powered by mock data, a premium light theme, exceptional UX, and enterprise-grade information architecture.

The result should feel like a product from the next generation of SaaS, not a website assembled from existing UI components — and it should be built cleanly enough that adding real authentication and a real database later is purely a data-layer integration, not a rebuild.

FINAL COMMAND TO LOVABLE

Before writing code, first think through the entire visual system. Do not start by generating random pages. First establish: Design language, Typography, Color system, Spacing system, Motion system, 3D visual language, Photography direction, Video direction, Component system, Responsive rules, and the mock data layer/schema (companies, branches, staff, queues, tokens, appointments, alerts, reports) that every screen will read from.

Then build the experience, frontend-only, fully interactive, backend-ready.

The first impression must be extraordinary. The second impression must be usability. The third impression must be trust.

And after several minutes of using the application, the user should think: "This is not just queue management. This is a completely new way of experiencing service operations."

Build something genuinely memorable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bbdea65-a3a5-48b8-8d98-e7d396f13078).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
# quesoles
