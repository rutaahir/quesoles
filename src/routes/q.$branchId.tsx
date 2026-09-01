import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MapPin, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/site/logo";
import { useQuesole, waitingOf } from "@/lib/quesole/store";
import { motion } from "@/components/quesole/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/q/$branchId")({
  head: () => ({
    meta: [
      { title: "Join the queue — Quesole" },
      {
        name: "description",
        content: "Scan, pick your service and get a live token with your position and wait time.",
      },
      { property: "og:title", content: "Join the queue with Quesole" },
      { property: "og:description", content: "Get a digital token and track your place in line." },
    ],
  }),
  component: JoinQueue,
});

function JoinQueue() {
  const { branchId } = Route.useParams();
  const { state, actions } = useQuesole();
  const navigate = useNavigate();

  const branch = state.branches.find(
    (b) => String(b.id) === String(branchId) || b.slug === branchId
  );
  const branchServices = state.services.filter(
    (s) => String(s.branchId) === String(branch?.id ?? branchId)
  );

  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));

  const [serviceId, setServiceId] = useState("");
  const activeServiceId = serviceId || branchServices[0]?.id || "";

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Geofence states
  const isGeofenceRequired = Boolean(
    branch &&
    branch.method >= 1 &&
    branch.method <= 3 &&
    branch.geofenceEnabled &&
    branch.geoLat !== undefined &&
    branch.geoLng !== undefined
  );

  const [geoStatus, setGeoStatus] = useState<"checking" | "passed" | "blocked" | "denied" | "bypassed">(
    isGeofenceRequired ? "checking" : "bypassed"
  );
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);

  // Verify location on load if required
  const verifyLocation = async () => {
    if (!branch || !isGeofenceRequired) {
      setGeoStatus("bypassed");
      return;
    }

    if (!navigator.geolocation) {
      setGeoErrorMessage("Geolocation is not supported by your browser.");
      setGeoStatus("denied");
      return;
    }

    setGeoStatus("checking");
    setGeoErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setDetectedCoords({ lat, lng });

        try {
          const res = await fetch(`http://${window.location.hostname}:8000/api/public/verify-location/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branch_id: branch.id, lat, lng })
          });
          const data = await res.json();
          if (data.is_within_geofence) {
            setDistanceMeters(data.distance_meters);
            setGeoStatus("passed");
          } else {
            setDistanceMeters(data.distance_meters);
            setGeoStatus("blocked");
          }
        } catch {
          // If verify API network error, default to client-side Haversine check as fallback
          if (branch.geoLat !== undefined && branch.geoLng !== undefined) {
            const R = 6371000;
            const dLat = ((branch.geoLat - lat) * Math.PI) / 180;
            const dLng = ((branch.geoLng - lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((branch.geoLat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = Math.round(R * c);
            setDistanceMeters(dist);
            setGeoStatus(dist <= (branch.geofenceRadiusMeters ?? 200) ? "passed" : "blocked");
          } else {
            setGeoStatus("passed");
          }
        }
      },
      (err) => {
        setGeoErrorMessage(err.message || "Location permission denied or unavailable.");
        setGeoStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Trigger geofence check on branch load
  useState(() => {
    if (isGeofenceRequired) {
      verifyLocation();
    }
  });

  if (state.branches.length === 0) {
    return (
      <div className="ambient flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium text-muted-foreground">Loading queue information…</p>
        </div>
      </div>
    );
  }

  if (!branch) throw notFound();

  const noServiceMode = Boolean(
    company &&
    state.companyAllocations.find(
      (a) => String(a.companyId) === String(company.id) && a.component_key === "services"
    )?.purchased_qty === 0
  );

  const waiting = waitingOf(state, branch.id).filter(
    (t) => noServiceMode || !activeServiceId || t.serviceId === activeServiceId,
  ).length;
  const hasMultipleServices = !noServiceMode && branchServices.length > 1;
  const valid = name.trim().length > 1 && contact.trim().length > 5 && (noServiceMode || activeServiceId || !hasMultipleServices);

  async function join() {
    if (!branch) return;
    setBusy(true);
    try {
      // Send API request with user_lat and user_lng for server-side verification and checkin distance logging
      const res = await fetch(`http://${window.location.hostname}:8000/api/public/join/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: branch.id,
          service_id: noServiceMode ? undefined : activeServiceId,
          customer_name: name.trim(),
          customer_phone: contact.trim(),
          customer_email: email.trim() || undefined,
          message: note.trim(),
          lat: detectedCoords?.lat,
          lng: detectedCoords?.lng,
          consent: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join queue");
      }

      toast.success("You're in the queue!");
      void navigate({ to: "/t/$ticketId", params: { ticketId: String(data.id) } });
    } catch (err: any) {
      toast.error(err.message || "Failed to join queue");
    } finally {
      setBusy(false);
    }
  }

  const brandColor = company?.brandColors?.primary || "#6366F1";

  return (
    <div className="ambient min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-lg">
        {/* Rebuilt Clean Top Branding Bar */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-7 w-auto object-contain" />
            ) : (
              <Logo size={26} />
            )}
            <div>
              <span className="font-display text-base font-bold text-foreground">
                {company?.name || "Quesole"}
              </span>
              {company?.tagline && (
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{company.tagline}</p>
              )}
            </div>
          </Link>

          {(company?.supportPhone || company?.supportEmail) && (
            <div className="text-right text-[11px] text-muted-foreground font-medium">
              <div>Need Help?</div>
              <a href={`tel:${company.supportPhone}`} className="text-brand hover:underline font-bold">
                {company.supportPhone || company.supportEmail}
              </a>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="panel overflow-hidden"
        >
          {/* Header Gradient Card */}
          <div
            className="px-6 py-6 text-white"
            style={{ backgroundColor: brandColor }}
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-85">
              <QrCode className="h-3.5 w-3.5" /> Walk-in queue
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold">{branch.name}</h1>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs opacity-90">
              <MapPin className="h-3.5 w-3.5" /> {branch.address}, {branch.city}
            </p>
          </div>

          {/* Slim Support Contact Sub-Bar */}
          {(company?.supportPhone || company?.supportEmail) && (
            <div className="bg-accent/40 px-6 py-2 border-b border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Branch Support Line:</span>
              <span className="font-medium text-foreground">
                {company.supportPhone && `📞 ${company.supportPhone}`}
                {company.supportPhone && company.supportEmail && " · "}
                {company.supportEmail && `✉️ ${company.supportEmail}`}
              </span>
            </div>
          )}

          <div className="p-6">
            {/* GEOFENCE GATE STATES */}

            {/* 1. Checking Location */}
            {geoStatus === "checking" && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="mx-auto h-9 w-9 animate-spin text-brand" />
                <h3 className="font-display text-lg font-bold text-foreground">Confirming you're at {branch.name}…</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Please allow location access on your phone to confirm physical presence at this branch.
                </p>
                <p className="text-[10px] text-muted-foreground">
                  🔒 We only use your location to confirm you're at the branch.
                </p>
              </div>
            )}

            {/* 2. Blocked: Outside Geofence Radius */}
            {geoStatus === "blocked" && (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/15 text-coral text-2xl font-bold">
                  📍
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">You need to be at {branch.name}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  You appear to be about <strong className="text-foreground">{distanceMeters ?? "several"} meters</strong> away. Scan the QR code when you arrive at the branch.
                </p>
                <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                  <Button variant="brand" onClick={verifyLocation}>
                    🔄 Try again
                  </Button>
                  {company?.supportPhone && (
                    <a href={`tel:${company.supportPhone}`} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                      Contact branch support ({company.supportPhone})
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* 3. Denied / Unavailable Location Permission */}
            {geoStatus === "denied" && (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 text-2xl font-bold">
                  ⚠️
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">Location Access Required</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {geoErrorMessage || "We need your location to confirm you're at the branch before you can join this queue."}
                </p>
                <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                  <Button variant="brand" onClick={verifyLocation}>
                    📍 Allow location & retry
                  </Button>
                  {company?.supportPhone && (
                    <p className="text-[11px] text-muted-foreground">
                      Stuck? Contact reception or call <strong className="text-foreground">{company.supportPhone}</strong>.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 4. Form Unlocked (Passed or Bypassed) */}
            {(geoStatus === "passed" || geoStatus === "bypassed") && (
              <div className="grid gap-5">
                <div className="rounded-2xl bg-accent/50 px-4 py-3 text-sm flex items-center justify-between">
                  <span>
                    <span className="font-semibold">{waiting} people</span> currently waiting
                  </span>
                  <span className="text-xs text-muted-foreground">{branch.openHours}</span>
                </div>

                {hasMultipleServices ? (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      Select Service *
                    </Label>
                    <div className="grid gap-2">
                      {branchServices.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setServiceId(s.id)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-3.5 text-left transition-all text-sm font-medium",
                            activeServiceId === s.id
                              ? "border-primary bg-brand/10 text-brand ring-1 ring-primary"
                              : "border-border hover:border-primary/40 bg-surface text-foreground"
                          )}
                        >
                          <span className="font-bold">{s.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ~{s.avgMinutes || 15}m per visitor
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Your Name *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="contact" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Mobile Number *
                  </Label>
                  <Input
                    id="contact"
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="h-11 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">We'll send live ticket updates to this number.</p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Email Address (Optional)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="note" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Note for Staff (Optional)
                  </Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Briefly state your purpose or requirements…"
                    className="min-h-[70px] rounded-xl text-xs"
                  />
                </div>

                <Button
                  size="lg"
                  variant="brand"
                  disabled={!valid || busy}
                  onClick={join}
                  className="h-12 rounded-xl text-sm font-bold shadow-lg"
                >
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Get My Token
                </Button>

                <p className="text-center text-[10px] text-muted-foreground">
                  🔒 Location & mobile details are used only for queue management and position updates.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
