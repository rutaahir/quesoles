import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Eye, EyeOff, Layers, Monitor, Pencil, Plus, QrCode, Sparkles, UserPlus, Users, MoreVertical, Globe, AlertTriangle, X, Sunrise, Sun, Sunset, Calendar, Filter, Bell, Building2, Clock, Phone, Mail, Radio, Briefcase, User, Info, Settings, MessageSquare, MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuesole, calculateBranchReadiness, branchStats, isNoServiceMode, apiFetch, planOf } from "@/lib/quesole/store";
import { cn } from "@/lib/utils";

const tabVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 }
};

const transition = {
  duration: 0.3,
  ease: "easeInOut"
};

export function BranchDesksServicesManager({ 
  branchId, 
  onBack,
  renderPlanUsageView
}: { 
  branchId: string; 
  onBack?: () => void;
  renderPlanUsageView?: (companyId: string, company: any) => React.ReactNode;
}) {
  const { state, actions, session, refresh } = useQuesole();
  const isBranchAdmin = session?.role === "branch_admin";
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "desks" | "staff" | "kiosks" | "online_booking" | "kot">("overview");
  const [searchServicesQuery, setSearchServicesQuery] = useState("");
  const [searchDesksQuery, setSearchDesksQuery] = useState("");
  const [searchStaffQuery, setSearchStaffQuery] = useState("");
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSetupExpanded, setIsSetupExpanded] = useState<boolean | null>(null);

  // Add Kiosk Form State
  const [isAddKioskModalOpen, setIsAddKioskModalOpen] = useState(false);
  const [newKioskName, setNewKioskName] = useState("");
  const [newKioskPin, setNewKioskPin] = useState("");
  const [isCreatingKiosk, setIsCreatingKiosk] = useState(false);

  const branch = state.branches.find((b) => String(b.id) === String(branchId));
  const company = state.companies.find((c) => String(c.id) === String(branch?.companyId));
  const companyId = company?.id || "";
  const isMethod4Unlocked = planOf(company?.plan ?? "starter").methods.includes(4) || branch?.channel_type === "ONLINE_ONLY" || branch?.channel_type === "HYBRID";

  useEffect(() => {
    if (branch?.channel_type === "ONLINE_ONLY" && ["desks", "staff", "kiosks"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [branch?.channel_type, activeTab]);

  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);
  const [kioskPin, setKioskPin] = useState("");
  const [kioskPinConfirm, setKioskPinConfirm] = useState("");
  const [kioskTimeout, setKioskTimeout] = useState(branch?.kioskIdleTimeoutSeconds || 8);
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);

  const handleSaveKioskPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kioskPin !== kioskPinConfirm) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }
    if (kioskPin.length < 4) {
      toast.error("Kiosk access password must be at least 4 characters long.");
      return;
    }
    setIsSavingKioskPin(true);
    try {
      if ((actions as any).setBranchKioskSettings) {
        await (actions as any).setBranchKioskSettings(branchId, {
          password: kioskPin,
          idleTimeoutSeconds: kioskTimeout,
        });
      } else {
        await actions.updateBranchDetails(branchId, {
          ...branch,
          name: branch?.name || "",
          city: branch?.city || "",
          kioskPasswordHash: kioskPin,
          kioskIdleTimeoutSeconds: kioskTimeout,
        } as any);
      }
      toast.success("Kiosk access password and idle timeout saved successfully!");
      setIsKioskModalOpen(false);
      setKioskPin("");
      setKioskPinConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save kiosk settings.");
    } finally {
      setIsSavingKioskPin(false);
    }
  };

  // Filter branch desks, services, staff
  const branchDesks = useMemo(() => {
    return state.desks.filter((d) => String(d.branchId) === String(branchId));
  }, [state.desks, branchId]);

  const branchServices = useMemo(() => {
    return state.services.filter((s) => String(s.branchId) === String(branchId));
  }, [state.services, branchId]);

  const branchStaff = useMemo(() => {
    return state.staff.filter((s) => String(s.branchId) === String(branchId));
  }, [state.staff, branchId]);

  const branchKiosks = useMemo(() => {
    return state.kiosks.filter((k) => String(k.branch) === String(branchId));
  }, [state.kiosks, branchId]);

  // Auto-initialize new kiosk form fields on open
  useEffect(() => {
    if (isAddKioskModalOpen) {
      setNewKioskName(`Kiosk ${branchKiosks.length + 1}`);
      setNewKioskPin(Math.floor(1000 + Math.random() * 9000).toString());
    }
  }, [isAddKioskModalOpen, branchKiosks.length]);

  const handleCreateKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKioskName.trim()) {
      toast.error("Kiosk name is required.");
      return;
    }
    if (newKioskPin.length !== 4) {
      toast.error("Kiosk PIN must be exactly 4 digits.");
      return;
    }
    setIsCreatingKiosk(true);
    try {
      await apiFetch("/api/kot/kiosks/", {
        method: "POST",
        body: JSON.stringify({
          kiosk_identifier: newKioskName.trim(),
          pin: newKioskPin,
          branch: branchId
        })
      });
      toast.success("Kiosk created successfully!");
      setIsAddKioskModalOpen(false);
      setNewKioskName("");
      setNewKioskPin("");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create kiosk.");
    } finally {
      setIsCreatingKiosk(false);
    }
  };

  // Compute branch-scoped usage and purchased plan allocations
  const branchAllocations = state.companyAllocations.filter((a) => String(a.branch_id) === String(branchId));
  const companyWideAllocations = state.companyAllocations.filter((a) => !a.branch_id && String(a.companyId) === String(companyId));

  const getPurchasedQty = (key: string, defaultQty: number) => {
    const brAlloc = branchAllocations.find((a) => a.component_key === key);
    if (brAlloc) return brAlloc.purchased_qty;
    const compAlloc = companyWideAllocations.find((a) => a.component_key === key);
    return compAlloc ? compAlloc.purchased_qty : defaultQty;
  };

  const purchasedDesks = getPurchasedQty("operator_screens", 3);
  const usedDesks = branchDesks.length;
  const isDeskLimitReached = usedDesks >= purchasedDesks;

  const purchasedServices = getPurchasedQty("services", 1);
  const usedServices = branchServices.length;
  const isServiceLimitReached = usedServices >= purchasedServices;

  const noService = isNoServiceMode(companyId, state.companyAllocations);
  const purchasedKiosks = getPurchasedQty("paper_roll_screens", 0);
  const purchasedQRs = getPurchasedQty("printed_qr", 0);
  const showServicesTab = branch?.mode === "SERVICE_BASED" && !noService;
  const isSingleQueue = branch?.mode === "NON_SERVICE_BASED" || noService;

  // Add modals & Add-on upsell state
  const [isAddDeskModalOpen, setIsAddDeskModalOpen] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [newDeskActive, setNewDeskActive] = useState(true);
  const [newDeskOnlineBooking, setNewDeskOnlineBooking] = useState(false);
  const [newDeskServices, setNewDeskServices] = useState<string[]>([]);
  const [newDeskStaffId, setNewDeskStaffId] = useState<string | null>(null);
  const [isCreatingDesk, setIsCreatingDesk] = useState(false);

  // Edit branch state
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchCity, setEditBranchCity] = useState("");
  const [editBranchHours, setEditBranchHours] = useState("");
  const [editBranchPhone, setEditBranchPhone] = useState("");
  const [editBranchEmail, setEditBranchEmail] = useState("");

  // Edit desk modal state
  const [editingDesk, setEditingDesk] = useState<any | null>(null);
  const [editDeskName, setEditDeskName] = useState("");
  const [editDeskActive, setEditDeskActive] = useState(true);
  const [editDeskOnlineBooking, setEditDeskOnlineBooking] = useState(false);
  const [editDeskServices, setEditDeskServices] = useState<string[]>([]);
  const [editDeskStaffId, setEditDeskStaffId] = useState<string | null>(null);
  const [isSavingDesk, setIsSavingDesk] = useState(false);

  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrefix, setNewServicePrefix] = useState("A");
  const [newServiceAvgMinutes, setNewServiceAvgMinutes] = useState(15);
  const [isCreatingService, setIsCreatingService] = useState(false);

  // Edit Service modal state
  const [editingService, setEditingService] = useState<any | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServicePrefix, setEditServicePrefix] = useState("");
  const [editServiceAvgMinutes, setEditServiceAvgMinutes] = useState(15);

  // Two-Step Staff creation wizard state
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState<1 | 2>(1);
  const [newStaffFirstName, setNewStaffFirstName] = useState("");
  const [newStaffLastName, setNewStaffLastName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("Staff123!");
  const [showPassword, setShowPassword] = useState(false);
  const [newStaffRole, setNewStaffRole] = useState<"desk_staff" | "branch_admin">("desk_staff");

  // Step 2 Desk Assignment Options
  const [deskOption, setDeskOption] = useState<"existing" | "new">("existing");
  const [selectedExistingDeskId, setSelectedExistingDeskId] = useState<string | null>(null);

  // Option B Inline Desk Creation fields
  const [inlineDeskName, setInlineDeskName] = useState("");
  const [inlineDeskActive, setInlineDeskActive] = useState(true);
  const [inlineDeskServices, setInlineDeskServices] = useState<string[]>([]);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);

  // Staff edit state
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editStaffFirstName, setEditStaffFirstName] = useState("");
  const [editStaffLastName, setEditStaffLastName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRole, setEditStaffRole] = useState<"desk_staff" | "branch_admin">("desk_staff");
  const [editStaffDeskId, setEditStaffDeskId] = useState<string | null>(null);
  const [isSavingStaff, setIsSavingStaff] = useState(false);

  const [upsellModalCompKey, setUpsellModalCompKey] = useState<string | null>(null);

  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  if (!branch || !company) {
    return (
      <div className="panel p-8 text-center text-muted-foreground">
        Branch or company information not found.
      </div>
    );
  }

  // Pre-checked modal openers
  const handleOpenAddDesk = () => {
    if (isDeskLimitReached) {
      setUpsellModalCompKey("operator_screens");
    } else {
      setNewDeskName("");
      setNewDeskActive(true);
      setNewDeskOnlineBooking(false);
      setNewDeskServices(branchServices.map((s) => s.id));
      setNewDeskStaffId(null);
      setIsAddDeskModalOpen(true);
    }
  };

  const handleOpenAddService = () => {
    if (isServiceLimitReached) {
      setUpsellModalCompKey("services");
    } else {
      setNewServiceName("");
      setNewServicePrefix(String.fromCharCode(65 + branchServices.length % 26));
      setIsAddServiceModalOpen(true);
    }
  };

  const handleOpenAddStaff = () => {
    setAddStaffStep(1);
    setNewStaffFirstName("");
    setNewStaffLastName("");
    setNewStaffEmail("");
    setNewStaffPassword("Staff123!");
    setShowPassword(false);
    setNewStaffRole("desk_staff");

    const hasDesks = branchDesks.length > 0 && branchDesks[0] !== undefined;
    setDeskOption(hasDesks ? "existing" : "new");
    setSelectedExistingDeskId(hasDesks ? branchDesks[0]!.id : null);
    setInlineDeskName("");
    setInlineDeskActive(true);
    setInlineDeskServices(branchServices.map((s) => s.id));

    setIsAddStaffModalOpen(true);
  };

  const handleCreateDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskName.trim()) return;
    setIsCreatingDesk(true);
    try {
      const deskId = await actions.createDesk({ branchId: branch.id, name: newDeskName.trim() });
      await actions.updateDesk(deskId, {
        name: newDeskName.trim(),
        label: newDeskName.trim(),
        isActive: newDeskActive,
        serviceIds: newDeskServices,
        assignedStaffId: newDeskStaffId,
        isOnlineBookingDesk: newDeskOnlineBooking,
      });
      toast.success(`Desk "${newDeskName}" created successfully!`);
      setIsAddDeskModalOpen(false);
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("reached") || err.message.toLowerCase().includes("allocate"))) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-xs leading-normal">{err.message}</span>
            <span className="text-[10px] text-muted-foreground leading-normal">
              You can upgrade your subscription limits in the Billing tab of the Company Admin Console.
            </span>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(err.message || "Failed to create desk.");
      }
    } finally {
      setIsCreatingDesk(false);
    }
  };

  const handleOpenEditDesk = (desk: any) => {
    const deskServicesIds = state.deskServices
      .filter((ds) => ds.deskId === desk.id)
      .map((ds) => ds.serviceId);

    const currentAssignedStaff = branchStaff.find((st, index) => {
      if (st.deskId) return String(st.deskId) === String(desk.id);
      const deskIndex = branchDesks.findIndex((bd) => bd.id === desk.id);
      return index === deskIndex;
    });

    setEditingDesk(desk);
    setEditDeskName(desk.label || desk.name || "");
    setEditDeskActive(desk.isActive ?? true);
    setEditDeskOnlineBooking(desk.isOnlineBookingDesk ?? false);
    setEditDeskServices(deskServicesIds);
    setEditDeskStaffId(currentAssignedStaff ? currentAssignedStaff.id : null);
  };

  const handleSaveDesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesk || !editDeskName.trim()) return;
    setIsSavingDesk(true);
    try {
      await actions.updateDesk(editingDesk.id, {
        name: editDeskName.trim(),
        label: editDeskName.trim(),
        isActive: editDeskActive,
        serviceIds: editDeskServices,
        assignedStaffId: editDeskStaffId,
        isOnlineBookingDesk: editDeskOnlineBooking,
      });
      toast.success(`Desk "${editDeskName}" saved successfully!`);
      setEditingDesk(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update desk.");
    } finally {
      setIsSavingDesk(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setIsCreatingService(true);
    try {
      await actions.createService({
        branchId: branch.id,
        name: newServiceName.trim(),
        prefix: newServicePrefix.trim().toUpperCase() || "A",
        estServiceMinutes: Number(newServiceAvgMinutes) || 15,
      });
      toast.success(`Service "${newServiceName}" created successfully!`);
      setIsAddServiceModalOpen(false);
      setNewServiceName("");
      setNewServicePrefix("A");
      setNewServiceAvgMinutes(15);
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("reached") || err.message.toLowerCase().includes("allocate"))) {
        toast.error(
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-xs leading-normal">{err.message}</span>
            <span className="text-[10px] text-muted-foreground leading-normal">
              You can upgrade your subscription limits in the Billing tab of the Company Admin Console.
            </span>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.error(err.message || "Failed to create service.");
      }
    } finally {
      setIsCreatingService(false);
    }
  };

  const handleOpenEditService = (s: any) => {
    setEditingService(s);
    setEditServiceName(s.name);
    setEditServicePrefix(s.prefix);
    setEditServiceAvgMinutes(s.avgMinutes || 15);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editServiceName.trim()) return;
    try {
      await apiFetch(`/api/services/${editingService.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editServiceName.trim(),
          prefix: editServicePrefix.trim().toUpperCase() || "A",
          est_service_minutes: Number(editServiceAvgMinutes) || 15,
        }),
      });
      toast.success(`Service "${editServiceName}" updated successfully!`);
      setEditingService(null);
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service.");
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service category? All counter routing configurations for this service will be removed.")) {
      return;
    }
    try {
      await apiFetch(`/api/services/${serviceId}/`, { method: "DELETE" });
      toast.success("Service category deleted successfully!");
      await refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service category.");
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailStr = newStaffEmail.trim();
    if (!emailStr || !newStaffFirstName.trim() || !newStaffLastName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      toast.error("Please enter a valid login email address.");
      return;
    }

    const isDuplicate = state.staff.some((st) => st.email.toLowerCase() === emailStr.toLowerCase());
    if (isDuplicate) {
      toast.error(`A staff user with email "${emailStr}" already exists.`);
      return;
    }

    if (newStaffPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    // Branch Admin submit from Step 1
    if (newStaffRole === "branch_admin") {
      setIsCreatingStaff(true);
      try {
        await actions.createBranchStaff({
          branchId: branch.id,
          email: emailStr,
          password: newStaffPassword.trim() || "Staff123!",
          firstName: newStaffFirstName.trim(),
          lastName: newStaffLastName.trim(),
          role: "branch_admin",
        });
        toast.success(`Branch Admin "${emailStr}" created successfully!`);
        setIsAddStaffModalOpen(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to create Branch Admin.");
      } finally {
        setIsCreatingStaff(false);
      }
      return;
    }

    // If step 1 for Desk Operator, advance to Step 2
    if (addStaffStep === 1) {
      setAddStaffStep(2);
      return;
    }

    // Step 2 Submission for Desk Operator
    setIsCreatingStaff(true);
    try {
      let targetDeskId: string | null = null;
      let targetServices: string[] = [];

      if (deskOption === "existing") {
        if (!selectedExistingDeskId) {
          toast.error("Please select an existing desk to assign this operator.");
          setIsCreatingStaff(false);
          return;
        }
        targetDeskId = selectedExistingDeskId;
        targetServices = state.deskServices
          .filter((ds) => ds.deskId === targetDeskId)
          .map((ds) => ds.serviceId);
      } else {
        // Option B: Create new desk
        if (!inlineDeskName.trim()) {
          toast.error("Please enter a Desk Name for the new desk.");
          setIsCreatingStaff(false);
          return;
        }
        if (isDeskLimitReached) {
          setUpsellModalCompKey("operator_screens");
          setIsCreatingStaff(false);
          return;
        }

        const createdDeskId = await actions.createDesk({
          branchId: branch.id,
          name: inlineDeskName.trim(),
        });

        await actions.updateDesk(createdDeskId, {
          name: inlineDeskName.trim(),
          label: inlineDeskName.trim(),
          isActive: inlineDeskActive,
          serviceIds: inlineDeskServices,
        });

        targetDeskId = createdDeskId;
        targetServices = inlineDeskServices;
      }

      // Create staff account
      const res = await actions.createBranchStaff({
        branchId: branch.id,
        email: emailStr,
        password: newStaffPassword.trim() || "Staff123!",
        firstName: newStaffFirstName.trim(),
        lastName: newStaffLastName.trim(),
        role: "desk_staff",
      });

      const newUserId = res?.id || state.staff.find((st) => st.email.toLowerCase() === emailStr.toLowerCase())?.id;

      if (targetDeskId && newUserId) {
        await actions.updateDesk(targetDeskId, { assignedStaffId: newUserId });
        await actions.updateUserServices(newUserId, targetServices);
      }

      const assignedDeskLabel = branchDesks.find((d) => d.id === targetDeskId)?.label || inlineDeskName.trim() || "assigned desk";
      toast.success(`Desk Operator "${emailStr}" created & assigned to ${assignedDeskLabel}!`);
      setIsAddStaffModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create staff account.");
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleOpenEditStaff = (st: any) => {
    const nameParts = (st.name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const assignedDesk = branchDesks.find((d) =>
      state.staff.some((s) => s.id === st.id && s.deskId === d.id)
    );

    setEditingStaff(st);
    setEditStaffFirstName(firstName);
    setEditStaffLastName(lastName);
    setEditStaffEmail(st.email || "");
    setEditStaffRole(st.role === "branch_admin" ? "branch_admin" : "desk_staff");
    setEditStaffDeskId(assignedDesk ? assignedDesk.id : null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editStaffEmail.trim()) return;
    setIsSavingStaff(true);
    try {
      await actions.updateBranchStaff(editingStaff.id, {
        firstName: editStaffFirstName.trim(),
        lastName: editStaffLastName.trim(),
        email: editStaffEmail.trim(),
        role: editStaffRole,
        deskId: editStaffDeskId,
      });

      if (editStaffRole === "desk_staff" && editStaffDeskId) {
        await actions.updateDesk(editStaffDeskId, { assignedStaffId: editingStaff.id });
        const deskServices = state.deskServices
          .filter((ds) => ds.deskId === editStaffDeskId)
          .map((ds) => ds.serviceId);
        await actions.updateUserServices(editingStaff.id, deskServices);
      } else if (editingStaff.deskId) {
        await actions.updateDesk(editingStaff.deskId, { assignedStaffId: null });
        await actions.updateUserServices(editingStaff.id, []);
      }

      toast.success(`Staff user "${editStaffEmail}" updated successfully!`);
      setEditingStaff(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff user.");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleOpenEditBranch = () => {
    setEditBranchName(branch.name || "");
    setEditBranchAddress(branch.address || "");
    setEditBranchCity(branch.city || "");
    setEditBranchHours(branch.operating_hours_summary || "");
    setEditBranchPhone(branch.phone || company.contact_phone || "");
    setEditBranchEmail(branch.email || company.contact_email || "");
    setIsEditingBranch(true);
  };

  const handleSaveBranch = async () => {
    try {
      await actions.updateBranchDetails(branch.id, {
        name: editBranchName.trim(),
        address: editBranchAddress.trim(),
        city: editBranchCity.trim(),
        operating_hours_summary: editBranchHours.trim(),
        phone: editBranchPhone.trim(),
        email: editBranchEmail.trim(),
      });
      toast.success("Branch details updated successfully!");
      setIsEditingBranch(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update branch details.");
    }
  };

  const readinessGlobal = calculateBranchReadiness(branch, state);
  const isSetupCompleteGlobal = readinessGlobal.score === 100;

  return (
    <div className="grid gap-6 pb-16">
      {/* Top Navigation Row (Mockup Style) */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2 z-10 relative">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-full h-8 w-8 flex items-center justify-center p-0 shadow-sm transition-all shrink-0"
              title="Back to Branches"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-border/40 px-3 py-1.5 rounded-full text-xs font-bold text-foreground select-none">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {branch.name}
            <Check className="h-3.5 w-3.5 text-emerald-500 ml-0.5" />
          </span>
        </div>

        {/* Notifications and Profile User Avatar on the Right */}
        <div className="flex items-center gap-4">
          <button className="relative h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-border/40 flex items-center justify-center text-foreground hover:bg-accent transition-all">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black shadow-md border border-white">
              2
            </span>
          </button>
          
          <div className="flex items-center gap-2.5 p-1 px-2.5 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl border border-border/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0 select-none">
              {session?.name ? session.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "US"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black text-foreground leading-none">{session?.name || "User"}</div>
              <div className="text-[9px] text-muted-foreground mt-1 leading-none font-bold uppercase tracking-wider">
                {session?.role === "company_admin" ? "Company Admin" : "Branch Admin"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Title & Action Buttons Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 relative">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
            Branch Operations & Staff Setup
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Configure services, desks, staff, kiosks and queue settings to ensure smooth and efficient branch operations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {purchasedQRs > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="h-8 gap-1.5 text-xs font-bold border-border/80 bg-white dark:bg-slate-900 shadow-sm"
            >
              <QrCode className="h-3.5 w-3.5" /> Branch QR & Links
            </Button>
          )}
          <Button
            variant="brand"
            size="sm"
            onClick={() => window.open(`/display/${branch.id}`, "_blank")}
            className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10"
          >
            <Layers className="h-3.5 w-3.5" /> Open Live Display
          </Button>
        </div>
      </div>

      {/* Navigation tab bar */}
      <div className="flex items-center gap-6 border-b border-border/40 pb-px w-full overflow-x-auto z-10 relative">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
            activeTab === "overview"
              ? "border-primary text-primary font-black"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-brand animate-pulse" /> Overview
          {(() => {
            const activeMethodsCount = (branch?.enabledMethods || []).length;
            return activeMethodsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-primary/10 text-primary border border-primary/20">
                {activeMethodsCount}
              </span>
            );
          })()}
        </button>
        {showServicesTab && (
          <button
            onClick={() => setActiveTab("services")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "services"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" /> Services
          </button>
        )}
        {branch?.channel_type !== "ONLINE_ONLY" && (
          <button
            onClick={() => setActiveTab("desks")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "desks"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Desks
          </button>
        )}
        {branch?.channel_type !== "ONLINE_ONLY" && (
          <button
            onClick={() => setActiveTab("staff")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "staff"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" /> Staff & Credentials
          </button>
        )}
        {purchasedKiosks > 0 && branch?.channel_type !== "ONLINE_ONLY" && (
          <button
            onClick={() => setActiveTab("kiosks")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "kiosks"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-3.5 w-3.5" /> Kiosks
          </button>
        )}
        {branch?.channel_type !== "ONSITE_ONLY" && (
          <button
            onClick={() => setActiveTab("online_booking")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "online_booking"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe className="h-3.5 w-3.5" /> Online Booking
          </button>
        )}
        {(session?.role === "company_admin" || session?.role === "branch_admin") && 
         (branch?.enabledMethods?.map(Number).includes(3) || branch?.enabledMethods?.map(Number).includes(4)) && (
          <button
            onClick={() => setActiveTab("kot")}
            className={cn(
              "flex items-center gap-1.5 pb-2 text-xs font-bold transition-all relative border-b-2 shrink-0",
              activeTab === "kot"
                ? "border-primary text-primary font-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" /> KOT Delivery
          </button>
        )}
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 z-10 relative">
        {/* Stat Card 1: Waiting Visitors */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center gap-4">
            <span className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Waiting Visitors</span>
              <span className="text-2xl font-black text-foreground block mt-0.5">{branchStats(state, branch.id).waiting}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Live in queue</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-indigo-500" viewBox="0 0 100 30" fill="none">
            <path d="M0 25 Q15 10 30 20 T60 10 T90 25 T100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Stat Card 2: Served Today */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center gap-4">
            <span className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Served Today</span>
              <span className="text-2xl font-black text-foreground block mt-0.5">{branchStats(state, branch.id).served}</span>
              <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">+12% vs yesterday</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-blue-500" viewBox="0 0 100 30" fill="none">
            <path d="M0 20 Q20 5 40 25 T80 15 T100 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Stat Card 3: Active Services */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center gap-4">
            <span className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Active Services</span>
              <span className="text-2xl font-black text-foreground block mt-0.5">{branchServices.length}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Across all counters</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-emerald-500" viewBox="0 0 100 30" fill="none">
            <path d="M0 25 Q20 15 40 20 T80 10 T100 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Stat Card 4: Operator Desks */}
        <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex items-center justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center gap-4">
            <span className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Monitor className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Operator Desks</span>
              <span className="text-2xl font-black text-foreground block mt-0.5">{branchDesks.length}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Active & ready</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-amber-500" viewBox="0 0 100 30" fill="none">
            <path d="M0 15 Q25 25 50 15 T100 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 z-10 relative">
          {/* Branch Setup Readiness Checklist Card */}
          {(() => {
            const readiness = calculateBranchReadiness(branch, state);
            const isSetupComplete = readiness.score === 100;
            const firstIncompleteIdx = readiness.steps.findIndex((s) => !s.done);
            
            return (
              <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-6 flex flex-col lg:flex-row justify-between gap-6 hover:shadow-medium transition-all">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-black flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Branch Setup Readiness
                    </h3>
                    <span className="font-extrabold text-xs text-primary">{readiness.score}% Complete</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r from-primary to-indigo-600")}
                      style={{ width: `${Math.max(5, readiness.score)}%` }}
                    />
                  </div>

                  {/* Grid of Steps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {readiness.steps.map((st, idx) => {
                      const isDone = st.done;
                      const isInProgress = !isDone && idx === firstIncompleteIdx;
                      
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-2xl border p-3.5 flex items-center justify-between text-xs font-bold transition-all bg-slate-50/50 dark:bg-slate-900/40",
                            isDone 
                              ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : isInProgress
                              ? "border-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "border-border text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shrink-0",
                              isDone 
                                ? "bg-emerald-500 text-white" 
                                : isInProgress
                                ? "bg-amber-500 text-white"
                                : "border border-muted-foreground/30 text-muted-foreground/60"
                            )}>
                              {isDone ? "✓" : isInProgress ? "•" : idx + 1}
                            </span>
                            <span className="truncate">{st.label}</span>
                          </div>

                          <span className={cn(
                            "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                            isDone 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : isInProgress
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
                              : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                          )}>
                            {isDone ? "Completed" : isInProgress ? "In Progress" : "Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3D Visual Floating Animation */}
                <div className="hidden lg:flex items-center justify-center w-28 shrink-0 relative">
                  <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-bounce duration-[3000ms]">
                    <Sparkles className="h-8 w-8 text-white animate-pulse" />
                    <div className="absolute -inset-2 border border-dashed border-indigo-400/40 rounded-full animate-spin duration-[6000ms]" />
                    <div className="absolute -inset-4 border border-indigo-400/20 rounded-full animate-ping opacity-30" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Active Queue Methods Section */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-6 hover:shadow-medium transition-all">
            <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4">
              <div>
                <h3 className="font-display text-sm font-black flex items-center gap-2 text-foreground">
                  <Radio className="h-4 w-4 text-primary" /> Active Queue Methods
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Delivery channels and entry methods enabled for walk-ins at this branch</p>
              </div>
              <button 
                onClick={() => {
                  toast.info("Manage queue methods and billing in the Company Admin 'Plan & Usage' section.");
                }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Manage in Plan & Usage
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* QR Scanning */}
              {(() => {
                const isQrActive = branch?.enabledMethods?.includes(1) ?? true;
                return (
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all",
                    isQrActive
                      ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02]"
                      : "border-border bg-slate-50/50 dark:bg-slate-900/40"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isQrActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                      )}>
                        {isQrActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">QR Scanning Token</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                        Customers scan branch QR posters to join the digital queue.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Kiosk Printed Token */}
              {(() => {
                const isKioskActive = branch?.enabledMethods?.includes(2) ?? false;
                return (
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all",
                    isKioskActive
                      ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02]"
                      : "border-border bg-slate-50/50 dark:bg-slate-900/40"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <Printer className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isKioskActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                      )}>
                        {isKioskActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">Kiosk (Printed Token)</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                        Prints thermal paper token tickets at physical walk-in terminals.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* SMS Delivery */}
              {(() => {
                const isSmsActive = branch?.enabledMethods?.includes(3) ?? false;
                return (
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all",
                    isSmsActive
                      ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02]"
                      : "border-border bg-slate-50/50 dark:bg-slate-900/40"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isSmsActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                      )}>
                        {isSmsActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">SMS Delivery</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                        Sends virtual check-in ticket tokens directly to customers via SMS.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* WhatsApp Delivery */}
              {(() => {
                const isWhatsappActive = branch?.enabledMethods?.includes(4) ?? false;
                return (
                  <div className={cn(
                    "rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all",
                    isWhatsappActive
                      ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/[0.02]"
                      : "border-border bg-slate-50/50 dark:bg-slate-900/40"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <MessageCircle className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isWhatsappActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground"
                      )}>
                        {isWhatsappActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-foreground">WhatsApp Delivery</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                        Sends virtual check-in ticket tokens directly to customers via WhatsApp.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Lower Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Branch Information Card */}
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex flex-col justify-between hover:shadow-medium transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-black flex items-center gap-2 text-foreground">
                    <Building2 className="h-4 w-4 text-muted-foreground/60" /> Branch Information
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenEditBranch}
                    className="h-8 gap-1.5 text-xs font-bold border-border/80"
                  >
                    <Settings className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>

                {/* Branch Building Photo */}
                <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-border/40 shadow-sm">
                  <img 
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop" 
                    alt="Corporate Center" 
                    className="h-full w-full object-cover brightness-[0.85]" 
                  />
                  {/* Company initials logo overlay */}
                  <div className="absolute bottom-4 left-4 h-12 w-12 rounded-xl bg-primary text-white flex items-center justify-center font-black font-display text-sm shadow-lg border border-white dark:border-slate-800 uppercase">
                    {company.name.substring(0, 3)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-foreground leading-none">{branch.name}</h4>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold text-primary">
                      Primary Branch
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{branch.address}, {branch.city}</p>
                </div>
              </div>

              {/* Three Columns Info Badges */}
              <div className="grid grid-cols-3 gap-2 border-t border-border/20 pt-4 mt-4">
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground/60" /> Working Hours
                  </span>
                  <span className="text-[10px] font-bold text-foreground block mt-0.5 truncate">{branch.operating_hours_summary}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground/60" /> Contact Number
                  </span>
                  <span className="text-[10px] font-bold text-foreground block mt-0.5 truncate">{branch.phone || company.contact_phone}</span>
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Mail className="h-3 w-3 text-muted-foreground/60" /> Support Email
                  </span>
                  <span className="text-[10px] font-bold text-foreground block mt-0.5 truncate">{branch.email || company.contact_email}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Today's Queue Activity */}
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 flex flex-col justify-between hover:shadow-medium transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-black flex items-center gap-2 text-foreground">
                    <Radio className="h-4 w-4 text-emerald-500 animate-pulse" /> Today's Queue Activity
                  </h3>
                  <button 
                    onClick={() => window.open(`/display/${branch.id}`, "_blank")}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View Live <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Categories Queue Rows */}
                <div className="divide-y divide-border/30">
                  {(() => {
                    const getServiceQueueData = (serviceId: string) => {
                      const waitingList = state.tickets.filter(
                        (t) => t.branchId === branch.id && t.serviceId === serviceId && (t.status === "waiting" || t.status === "hold" || t.status === "called" || t.status === "serving")
                      );
                      const waitingCount = waitingList.filter(t => t.status === "waiting" || t.status === "hold").length;
                      const avgMin = waitingCount > 0 ? waitingCount * 5 : 0;
                      const isActive = waitingList.some(t => t.status === "called" || t.status === "serving");
                      return {
                        count: waitingCount,
                        avgMin,
                        status: isActive ? "Active" : "Idle"
                      };
                    };

                    return branchServices.map((s, idx) => {
                      const queueData = getServiceQueueData(s.id);
                      const isPrepaid = s.name.toLowerCase().includes("prepaid");
                      const isPostpaid = s.name.toLowerCase().includes("postpaid");
                      const isInternet = s.name.toLowerCase().includes("internet");
                      
                      const ServiceIcon = isPrepaid ? Briefcase : isPostpaid ? User : isInternet ? Globe : Info;
                      const iconColorClass = isPrepaid 
                        ? "bg-amber-500/10 text-amber-600" 
                        : isPostpaid 
                        ? "bg-blue-500/10 text-blue-600" 
                        : isInternet 
                        ? "bg-indigo-500/10 text-indigo-600" 
                        : "bg-teal-500/10 text-teal-600";

                      return (
                        <div key={s.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3.5">
                            <span className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconColorClass)}>
                              <ServiceIcon className="h-5 w-5" />
                            </span>
                            <div>
                              <span className="text-xs font-black text-foreground block">{s.name} Counter</span>
                              <span className="text-[10px] text-muted-foreground block mt-0.5 font-semibold">
                                {queueData.count} waiting · Avg {queueData.avgMin} min
                              </span>
                            </div>
                          </div>

                          <span className={cn(
                            "text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                            queueData.status === "Active" 
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 animate-pulse" 
                              : "bg-slate-100 dark:bg-slate-800 text-muted-foreground/60"
                          )}>
                            {queueData.status}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  {branchServices.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground font-semibold">
                      No operational services defined yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Five Quick-Link Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
            
            {/* Services */}
            <div 
              onClick={() => setActiveTab("services")}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <span className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Services</span>
                  <span className="text-sm font-black text-foreground block mt-0.5">{branchServices.length}</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Active services</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Desks */}
            <div 
              onClick={() => setActiveTab("desks")}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <span className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Monitor className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Desks</span>
                  <span className="text-sm font-black text-foreground block mt-0.5">{branchDesks.length}</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Configured desks</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Staff */}
            <div 
              onClick={() => setActiveTab("staff")}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <span className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Staff</span>
                  <span className="text-sm font-black text-foreground block mt-0.5">{branchStaff.length}</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Active staff</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Kiosks */}
            <div 
              onClick={() => { if (purchasedKiosks > 0) setActiveTab("kiosks"); }}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <span className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                  <Monitor className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Kiosks</span>
                  <span className="text-sm font-black text-foreground block mt-0.5">{branchKiosks.length}</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Terminals online</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>

            {/* Booking */}
            <div 
              onClick={() => setActiveTab("online_booking")}
              className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3.5">
                <span className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5" />
                </span>
                <div>
                  <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Booking</span>
                  <span className="text-sm font-black text-foreground block mt-0.5">Enabled</span>
                  <span className="text-[9px] text-muted-foreground block mt-0.5 font-medium">Online booking active</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </div>
      )}

      {/* DESKS TAB */}
      {activeTab === "desks" && (
        <motion.div
          key="desks-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Operator Desks</h2>
              <p className="text-xs text-muted-foreground">Manage counters, operators and service routing.</p>
            </div>
            {purchasedDesks > 0 && (
              <Button
                variant={isDeskLimitReached ? "outline" : "brand"}
                onClick={handleOpenAddDesk}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                {isDeskLimitReached ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Buy More Desks
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add Desk
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Search bar & KPI Cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
            {/* Search Box */}
            <div className="lg:col-span-2 relative">
              <Input
                placeholder="Search desks..."
                value={searchDesksQuery}
                onChange={(e) => setSearchDesksQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* KPI Cards Row */}
            <div className="lg:col-span-3 grid grid-cols-4 gap-2">
              {(() => {
                const total = branchDesks.length;
                const busy = branchDesks.filter(d => (d.isActive ?? true) && state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'))).length;
                const available = branchDesks.filter(d => (d.isActive ?? true) && branchStaff.some(st => String(st.deskId) === String(d.id)) && !state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'))).length;
                const offline = total - busy - available;

                return (
                  <>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Desks</span>
                      <span className="text-base font-black text-foreground block mt-0.5">{total}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Available</span>
                      <span className="text-base font-black text-emerald-500 block mt-0.5">{available}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Busy</span>
                      <span className="text-base font-black text-amber-500 block mt-0.5">{busy}</span>
                    </div>
                    <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                      <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Offline</span>
                      <span className="text-base font-black text-muted-foreground block mt-0.5">{offline}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Desks Dense Table View */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    <th className="p-3.5 pl-5">Desk</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Assigned Services</th>
                    <th className="p-3.5">Operators</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Current Queue</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {(() => {
                    const filteredDesks = branchDesks.filter((d) =>
                      d.label.toLowerCase().includes(searchDesksQuery.toLowerCase())
                    );

                    if (filteredDesks.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-xs text-muted-foreground font-semibold">
                            No matching counter desks found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredDesks.map((d) => {
                      const deskServicesIds = state.deskServices
                        .filter((ds) => ds.deskId === d.id)
                        .map((ds) => ds.serviceId);

                      const assignedStaff = branchStaff.filter((st) => {
                        if (!st.deskId) return false;
                        return String(st.deskId) === String(d.id);
                      });

                      const isBusy = (d.isActive ?? true) && state.tickets.some(t => String(t.deskId) === String(d.id) && (t.status === 'called' || t.status === 'serving'));
                      const isAvailable = (d.isActive ?? true) && assignedStaff.length > 0 && !isBusy;
                      const statusLabel = !d.isActive ? "Offline" : isBusy ? "Busy" : isAvailable ? "Available" : "Offline";
                      const statusDotColor = !d.isActive 
                        ? "bg-slate-400" 
                        : isBusy 
                        ? "bg-amber-500" 
                        : isAvailable 
                        ? "bg-emerald-500" 
                        : "bg-slate-400";

                      // Calculate current queue count for assigned services
                      const queueCount = state.tickets.filter(t => 
                        t.branchId === branch.id && 
                        deskServicesIds.includes(t.serviceId) && 
                        (t.status === 'waiting' || t.status === 'hold')
                      ).length;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-all">
                          <td className="p-3.5 pl-5 font-black text-foreground">{d.label}</td>
                          <td className="p-3.5 text-muted-foreground font-semibold">Physical Counter</td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {branchServices.filter(s => deskServicesIds.includes(s.id)).map(s => (
                                <span key={s.id} className="inline-block rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-bold">
                                  {s.name}
                                </span>
                              ))}
                              {deskServicesIds.length === 0 && (
                                <span className="text-[10px] text-muted-foreground/60 italic font-semibold">No services routing</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {assignedStaff.map(st => (
                              <div key={st.id} className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[8px] font-black uppercase">
                                  {st.name.slice(0, 2)}
                                </span>
                                <span className="font-bold text-foreground">{st.name}</span>
                              </div>
                            ))}
                            {assignedStaff.length === 0 && (
                              <span className="text-[10px] text-amber-500 font-bold">⚠️ Unstaffed</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                              <span className={cn("inline-block h-2 w-2 rounded-full", statusDotColor)} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 font-black text-foreground tabular-nums">{queueCount} waiting</td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditDesk(d)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to completely delete ${d.label}?`)) {
                                    try {
                                      await (actions as any).deleteDesk(d.id);
                                      toast.success("Desk deleted successfully!");
                                      await refresh();
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to delete desk.");
                                    }
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* SERVICES TAB */}
      {showServicesTab && activeTab === "services" && (
        <motion.div
          key="services-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Services</h2>
              <p className="text-xs text-muted-foreground">Manage and configure service categories for this branch.</p>
            </div>
            {purchasedServices > 0 && (
              <Button
                variant={isServiceLimitReached ? "outline" : "brand"}
                onClick={handleOpenAddService}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                {isServiceLimitReached ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Buy More Services
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add Service
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Search bar & KPI Cards row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
            {/* Search Box */}
            <div className="lg:col-span-2 relative">
              <Input
                placeholder="Search services..."
                value={searchServicesQuery}
                onChange={(e) => setSearchServicesQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>

            {/* KPI Cards Row */}
            <div className="lg:col-span-3 grid grid-cols-4 gap-2">
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Total Services</span>
                <span className="text-base font-black text-foreground block mt-0.5">{branchServices.length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Active</span>
                <span className="text-base font-black text-emerald-500 block mt-0.5">{branchServices.filter(s => s.isActive !== false).length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Inactive</span>
                <span className="text-base font-black text-muted-foreground block mt-0.5">{branchServices.filter(s => s.isActive === false).length}</span>
              </div>
              <div className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 rounded-2xl p-2.5 text-center">
                <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Capacity</span>
                <span className="text-base font-black text-primary block mt-0.5">{usedServices}/{purchasedServices}</span>
              </div>
            </div>
          </div>

          {/* Service Table/Card Hybrid List */}
          <div className="space-y-2">
            {(() => {
              const filteredServices = branchServices.filter((s) =>
                s.name.toLowerCase().includes(searchServicesQuery.toLowerCase())
              );

              if (filteredServices.length === 0) {
                return (
                  <div className="py-12 text-center text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl">
                    No matching service categories found.
                  </div>
                );
              }

              return filteredServices.map((s, idx) => {
                const isExpanded = expandedServiceId === s.id;
                const assignedDeskIds = state.deskServices
                  .filter((ds) => ds.serviceId === s.id)
                  .map((ds) => ds.deskId);
                const assignedUserIds = state.userServices
                  .filter((us) => us.serviceId === s.id)
                  .map((us) => us.userId);

                const isPrepaid = s.name.toLowerCase().includes("prepaid");
                const isPostpaid = s.name.toLowerCase().includes("postpaid");
                const isInternet = s.name.toLowerCase().includes("internet");
                
                const ServiceIcon = isPrepaid ? Briefcase : isPostpaid ? User : isInternet ? Globe : Info;
                const iconColorClass = isPrepaid 
                  ? "bg-amber-500/10 text-amber-600" 
                  : isPostpaid 
                  ? "bg-blue-500/10 text-blue-600" 
                  : isInternet 
                  ? "bg-indigo-500/10 text-indigo-600" 
                  : "bg-teal-500/10 text-teal-600";

                const priority = isPrepaid ? "High" : "Medium";
                const priorityClass = priority === "High"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground";

                // Live waiting tickets
                const waitingCount = state.tickets.filter(
                  (t) => t.branchId === branch.id && t.serviceId === s.id && (t.status === "waiting" || t.status === "hold")
                ).length;

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 space-y-4 hover:border-primary hover:shadow-soft transition-all duration-200"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedServiceId(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", iconColorClass)}>
                          <ServiceIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-foreground">{s.name}</h3>
                            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                              Prefix {s.prefix}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-none">
                            {assignedDeskIds.length} counter(s) · {assignedUserIds.length} operator(s) qualified
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Avg Duration */}
                        <div className="hidden sm:block text-right">
                          <span className="text-[9px] text-muted-foreground font-semibold block leading-none">EST. TIME</span>
                          <span className="text-[11px] font-bold text-foreground block mt-1">{s.avgMinutes || 15} mins</span>
                        </div>

                        {/* Queue Type */}
                        <div className="hidden md:block text-right px-3 border-l border-border/40">
                          <span className="text-[9px] text-muted-foreground font-semibold block leading-none">QUEUE TYPE</span>
                          <span className="text-[11px] font-bold text-foreground block mt-1">Token-Based</span>
                        </div>

                        {/* Priority Pill */}
                        <span className={cn("text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full", priorityClass)}>
                          {priority}
                        </span>

                        {/* Status Toggle Button */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await actions.toggleServiceStatus(s.id, !(s.isActive ?? true));
                              toast.success("Service status updated successfully!");
                              await refresh();
                            } catch (err: any) {
                              toast.error(err.message || "Failed to update service status.");
                            }
                          }}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase transition-all flex items-center gap-1.5 border",
                            (s.isActive ?? true)
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-100 dark:bg-slate-800 border-border text-muted-foreground"
                          )}
                        >
                          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", (s.isActive ?? true) ? "bg-emerald-500" : "bg-muted-foreground")} />
                          {(s.isActive ?? true) ? "Active" : "Inactive"}
                        </button>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditService(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleDeleteService(s.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Counters / Desks assignments */}
                    {isExpanded && (
                      <div className="border-t border-border/40 pt-4 grid gap-6 md:grid-cols-2 animate-in fade-in duration-200">
                        {/* Assigned Desks Multi-select Chips */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-primary" /> Assigned Counter Desks
                          </label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {branchDesks.map((d) => {
                              const isAssigned = assignedDeskIds.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  onClick={async () => {
                                    const currentDeskServiceIds = state.deskServices
                                      .filter((ds) => ds.deskId === d.id)
                                      .map((ds) => ds.serviceId);
                                    const nextServiceIds = isAssigned
                                      ? currentDeskServiceIds.filter((id) => id !== s.id)
                                      : [...currentDeskServiceIds, s.id];
                                    try {
                                      await actions.updateDeskServices(d.id, nextServiceIds);
                                      toast.success(`Updated desk assignments for ${s.name}`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to update desk assignments");
                                    }
                                  }}
                                  className={cn(
                                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                                    isAssigned
                                      ? "border-primary/40 bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-foreground bg-slate-50/50 dark:bg-slate-900/40"
                                  )}
                                >
                                  {isAssigned && <Check className="h-3.5 w-3.5" />}
                                  {d.label}
                                </button>
                              );
                            })}
                            {branchDesks.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No counter desks created yet.</span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Qualified Staff Multi-select Chips */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" /> Qualified Staff Members
                          </label>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {branchStaff.map((st) => {
                              const isAssigned = assignedUserIds.includes(st.id);
                              return (
                                <button
                                  key={st.id}
                                  onClick={async () => {
                                    const currentUserServicesIds = state.userServices
                                      .filter((us) => us.userId === st.id)
                                      .map((us) => us.serviceId);
                                    const nextServiceIds = isAssigned
                                      ? currentUserServicesIds.filter((id) => id !== s.id)
                                      : [...currentUserServicesIds, s.id];
                                    try {
                                      await actions.updateUserServices(st.id, nextServiceIds);
                                      toast.success(`Updated qualified staff for ${s.name}`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to update staff assignments");
                                    }
                                  }}
                                  className={cn(
                                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                                    isAssigned
                                      ? "border-primary/40 bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:border-foreground bg-slate-50/50 dark:bg-slate-900/40"
                                  )}
                                >
                                  {isAssigned && <Check className="h-3.5 w-3.5" />}
                                  {st.name} ({st.email})
                                </button>
                              );
                            })}
                            {branchStaff.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No branch staff found.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </motion.div>
      )}

      {activeTab === "staff" && (
        <motion.div
          key="staff-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Staff & Credentials</h2>
              <p className="text-xs text-muted-foreground">Manage operators, roles, credentials and desk assignments.</p>
            </div>
            <Button
              variant="brand"
              size="sm"
              onClick={handleOpenAddStaff}
              className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Staff
            </Button>
          </div>

          {/* Search bar & filter row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Search staff..."
                value={searchStaffQuery}
                onChange={(e) => setSearchStaffQuery(e.target.value)}
                className="h-9 text-xs pl-8 pr-3 bg-white dark:bg-slate-900 border-border/60 shadow-soft rounded-2xl"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="flex gap-2">
              <span className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Total Staff: {branchStaff.length}
              </span>
              <span className="bg-slate-100/50 dark:bg-slate-900/40 border border-border/40 px-3 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                Active: {branchStaff.length}
              </span>
            </div>
          </div>

          {/* Staff Dense Table View */}
          <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/40 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    <th className="p-3.5 pl-5">Staff Name</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Assigned Desk</th>
                    <th className="p-3.5">Services</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Active</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {(() => {
                    const filteredStaff = branchStaff.filter((st) =>
                      st.name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
                      st.email.toLowerCase().includes(searchStaffQuery.toLowerCase())
                    );

                    if (filteredStaff.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-xs text-muted-foreground font-semibold">
                            No matching staff members found.
                          </td>
                        </tr>
                      );
                    }

                    return filteredStaff.map((st) => {
                      const assignedDesk = branchDesks.find((d) => String(d.id) === String(st.deskId));
                      const assignedServiceIds = state.userServices
                        .filter((us) => us.userId === st.id)
                        .map((us) => us.serviceId);

                      // Mock dynamic status / last active for premium dashboard look
                      const isOffline = st.name.toLowerCase().includes("vjay") || st.name.toLowerCase().includes("vijay");
                      const statusLabel = isOffline ? "Offline" : "Active";
                      const statusDot = isOffline ? "bg-slate-400" : "bg-emerald-500 animate-pulse";
                      const lastActive = isOffline ? "3 days ago" : "Active now";

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-all">
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 text-[10px] font-black uppercase shrink-0">
                                {st.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                              </span>
                              <span className="font-black text-foreground">{st.name || "Staff Member"}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-mono text-[10px]">{st.email}</td>
                          <td className="p-3.5">
                            <span className={cn(
                              "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border",
                              st.role === "branch_admin"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                            )}>
                              {st.role === "branch_admin" ? "Branch Admin" : "Operator"}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {st.role === "branch_admin" ? (
                              <span className="text-[10px] text-muted-foreground/60 italic font-semibold">Full Branch Access</span>
                            ) : assignedDesk ? (
                              <span className="font-bold text-foreground bg-accent/40 border border-border/80 rounded-lg px-2 py-0.5">
                                {assignedDesk.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-bold text-red-500 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded-lg">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {branchServices.filter(s => assignedServiceIds.includes(s.id)).map(s => (
                                <span key={s.id} className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-foreground px-2 py-0.5 text-[9px] font-semibold">
                                  {s.name}
                                </span>
                              ))}
                              {st.role !== "branch_admin" && assignedServiceIds.length === 0 && (
                                <span className="text-[9px] text-muted-foreground/50 italic font-semibold">No services mapping</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                              <span className={cn("inline-block h-2 w-2 rounded-full", statusDot)} />
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-muted-foreground font-semibold text-[10px]">{lastActive}</td>
                          <td className="p-3.5 pr-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditStaff(st)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to completely delete ${st.name}?`)) {
                                    try {
                                      await actions.removeStaff(st.id);
                                      toast.success("Staff member deleted successfully!");
                                      await refresh();
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to delete staff member.");
                                    }
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "kiosks" && (
        <motion.div
          key="kiosks-tab"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={tabVariants}
          transition={transition}
          className="space-y-4"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <h2 className="text-base font-black text-foreground">Self-Ticketing Kiosks ({branchKiosks.length})</h2>
              <p className="text-xs text-muted-foreground">Manage kiosk terminals and PIN codes.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground bg-accent/20 px-3 py-1.5 rounded-lg border border-border/40 font-bold shrink-0">
                Kiosks Allocated: {branchKiosks.filter(k => k.status === 'active').length} / {purchasedKiosks}
              </span>
              <Button
                variant="brand"
                size="sm"
                onClick={() => setIsAddKioskModalOpen(true)}
                disabled={branchKiosks.filter(k => k.status === 'active').length >= purchasedKiosks}
                className="h-8 gap-1.5 text-xs font-bold shadow-md shadow-brand/10 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add Kiosk
              </Button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Kiosks</span>
              <span className="text-base font-black text-foreground block mt-0.5">{branchKiosks.length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Online</span>
              <span className="text-base font-black text-emerald-500 block mt-0.5">{branchKiosks.filter(k => k.is_logged_in).length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Offline</span>
              <span className="text-base font-black text-muted-foreground block mt-0.5">{branchKiosks.filter(k => !k.is_logged_in).length}</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-4 text-center">
              <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest block">Tickets Today</span>
              <span className="text-base font-black text-primary block mt-0.5">
                {state.tickets.filter(t => t.branchId === branch.id && t.channel === 'kiosk').length}
              </span>
            </div>
          </div>

          {/* Kiosk Terminal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchKiosks.map((kiosk, idx) => {
              const isPinVisible = !!visiblePins[kiosk.id];
              return (
                <div
                  key={kiosk.id}
                  className="bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl p-5 hover:border-primary hover:shadow-soft transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="flex gap-4">
                    {/* Device illustration */}
                    <div className="h-24 w-16 bg-slate-50 dark:bg-slate-900/60 border border-border/40 rounded-xl flex items-center justify-center p-2 shrink-0">
                      <svg className="w-full h-full text-slate-400" viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="2" width="24" height="46" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="2"/>
                        <rect x="5" y="4" width="20" height="32" rx="1" fill="#1E293B"/>
                        <circle cx="15" cy="42" r="2.5" fill="#475569"/>
                        <rect x="7" y="6" width="16" height="12" rx="0.5" fill="url(#screenGrad)" opacity="0.8"/>
                        <rect x="9" y="20" width="12" height="1.5" rx="0.2" fill="#3B82F6"/>
                        <rect x="9" y="23" width="12" height="1.5" rx="0.2" fill="#10B981"/>
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-black text-sm text-foreground truncate">{kiosk.kiosk_identifier}</h3>
                        <span className="text-[10px] text-muted-foreground font-mono">Terminal ID: KSK-0{idx + 1}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Status</span>
                          <span className={cn(
                            "inline-flex items-center gap-1 font-bold mt-0.5",
                            kiosk.status === "active" ? "text-emerald-500" : "text-muted-foreground"
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", kiosk.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                            {kiosk.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">PIN Code</span>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                            <span>{isPinVisible ? kiosk.pin : "••••"}</span>
                            <button
                              onClick={() => setVisiblePins(prev => ({ ...prev, [kiosk.id]: !prev[kiosk.id] }))}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {isPinVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Location</span>
                          <span className="font-bold text-foreground block mt-0.5">Reception</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider block">Last Sync</span>
                          <span className="font-semibold text-muted-foreground block mt-0.5">1 min ago</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/20 mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-[8px] font-extrabold text-muted-foreground uppercase tracking-wider">Kiosk Link</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/kiosk/${branch.slug || branch.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-bold flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open</span>
                          </a>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/kiosk/${branch.slug || branch.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Kiosk URL copied to clipboard!");
                            }}
                            className="text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border/30 pt-3 mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await actions.regenerateKioskPin(kiosk.id);
                          toast.success("Kiosk PIN regenerated successfully!");
                        } catch (err: any) {
                          toast.error(err.message || "Failed to regenerate PIN.");
                        }
                      }}
                      className="h-8 text-xs font-bold"
                    >
                      Regenerate PIN
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold text-red-500 hover:bg-red-500/10 hover:text-red-500 border-border/60"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to completely delete kiosk "${kiosk.kiosk_identifier}"?`)) {
                          try {
                            await apiFetch(`/api/kot/kiosks/${kiosk.id}/`, { method: "DELETE" });
                            toast.success("Kiosk deleted successfully!");
                            await refresh();
                          } catch (err: any) {
                            toast.error(err.message || "Failed to delete kiosk.");
                          }
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {branchKiosks.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground font-semibold bg-white dark:bg-slate-900 border border-border/50 shadow-soft rounded-3xl">
                No kiosk slots provisioned. Make sure kiosks are allocated in your company plan.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "online_booking" && branch?.channel_type !== "ONSITE_ONLY" && (
        <div className="animate-in fade-in-50 duration-300">
          <OnlineBookingSettingsPanel branch={branch} company={company} />
        </div>
      )}

      {activeTab === "kot" && (session?.role === "company_admin" || session?.role === "branch_admin") && (
        <div className="animate-in fade-in-50 duration-300">
          <KotSettingsPanel branch={branch} company={company} />
        </div>
      )}

      {/* Modal: Create Staff Account & Credentials Wizard */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">Create Staff Account & Set Credentials</h3>
                  {newStaffRole === "desk_staff" && (
                    <p className="text-[11px] text-muted-foreground">
                      Step {addStaffStep} of 2 — {addStaffStep === 1 ? "Basic Info & Role" : "Desk Assignment"}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setIsAddStaffModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* STEP 1: Basic Info & Role */}
              {addStaffStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name *</Label>
                      <Input
                        value={newStaffFirstName}
                        onChange={(e) => setNewStaffFirstName(e.target.value)}
                        placeholder="e.g. Ramesh"
                        required
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name *</Label>
                      <Input
                        value={newStaffLastName}
                        onChange={(e) => setNewStaffLastName(e.target.value)}
                        placeholder="e.g. Patel"
                        required
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Login Email *</Label>
                    <Input
                      type="email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="e.g. ramesh.surat@company.com"
                      required
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Initial Password *</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="Staff123!"
                        required
                        className="h-9 text-xs rounded-xl font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Min 6 characters. Staff will use this password to log in.</p>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Role *</span>
                      {isBranchAdmin && (
                        <span className="text-[10px] text-amber-600 font-medium">Branch Admin restricted to Desk Operator</span>
                      )}
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNewStaffRole("desk_staff");
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all text-xs font-semibold flex flex-col gap-1 col-span-1",
                          newStaffRole === "desk_staff" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                        )}
                      >
                        <span className="font-bold flex items-center gap-1.5">🖥️ Desk Operator</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Operates queue calls at a counter desk. Requires desk assignment in Step 2.</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBranchAdmin}
                        onClick={() => {
                          if (!isBranchAdmin) {
                            setNewStaffRole("branch_admin");
                            setAddStaffStep(1);
                          }
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all text-xs font-semibold flex flex-col gap-1 col-span-1",
                          isBranchAdmin ? "opacity-40 cursor-not-allowed bg-muted/30 border-border" : newStaffRole === "branch_admin" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                        )}
                      >
                        <span className="font-bold flex items-center gap-1.5">🛡️ Branch Admin</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {isBranchAdmin ? "Company Admin only (Cannot create another Branch Admin)" : "Manages branch operations, desks, and staff accounts. Submits directly from Step 1."}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Desk Assignment (Desk Operator role only) */}
              {addStaffStep === 2 && newStaffRole === "desk_staff" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-brand font-medium">
                    📍 <strong>Service Qualification:</strong> Service categories for this operator are automatically derived from their assigned counter desk.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeskOption("existing")}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all text-xs font-semibold flex flex-col gap-1",
                        deskOption === "existing" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                      )}
                    >
                      <span className="font-bold flex items-center gap-1.5">Option A: Assign to Existing Desk</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Pick from current active desks in this branch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeskOption("new")}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all text-xs font-semibold flex flex-col gap-1",
                        deskOption === "new" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                      )}
                    >
                      <span className="font-bold flex items-center gap-1.5">Option B: Create a New Desk</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Configure a new desk inline for this operator</span>
                    </button>
                  </div>

                  {/* Option A: List of existing desks */}
                  {deskOption === "existing" && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {branchDesks.map((d) => {
                        const deskServiceIds = state.deskServices
                          .filter((ds) => ds.deskId === d.id)
                          .map((ds) => ds.serviceId);

                        const currentAssignedCount = state.staff.filter((st) => st.deskId === d.id).length;
                        const isSelected = selectedExistingDeskId === d.id;

                        const isAssigned = currentAssignedCount > 0;

                        return (
                          <div
                            key={d.id}
                            onClick={() => !isAssigned && setSelectedExistingDeskId(d.id)}
                            className={cn(
                              "rounded-xl border p-3 text-xs transition-all flex items-center justify-between gap-3",
                              isAssigned ? "opacity-50 cursor-not-allowed border-dashed bg-muted/30" : "cursor-pointer",
                              isSelected ? "border-brand bg-brand/10 text-brand font-semibold ring-1 ring-brand" : (!isAssigned && "border-border/80 bg-accent/20 hover:border-foreground")
                            )}
                          >
                            <div className="space-y-1 overflow-hidden">
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="deskSelect"
                                  checked={isSelected}
                                  disabled={isAssigned}
                                  onChange={() => !isAssigned && setSelectedExistingDeskId(d.id)}
                                  className="accent-brand"
                                />
                                <span className="font-bold text-foreground">{d.label}</span>
                                <span className="text-[10px] text-muted-foreground">({currentAssignedCount} Staff assigned)</span>
                              </div>
                              {!noService && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {deskServiceIds.map((sId) => {
                                    const s = branchServices.find((ser) => ser.id === sId);
                                    if (!s) return null;
                                    return (
                                      <span key={sId} className="rounded bg-muted border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                                        {s.name}
                                      </span>
                                    );
                                  })}
                                  {deskServiceIds.length === 0 && (
                                    <span className="text-[10px] text-amber-600 italic">No services configured on desk</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-brand shrink-0" />}
                          </div>
                        );
                      })}
 
                      {branchDesks.length === 0 && (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs text-center space-y-1">
                          <p className="font-bold">No desks yet in this branch.</p>
                          <p className="text-[11px] text-muted-foreground">Select Option B above to create a desk for this staff member.</p>
                        </div>
                      )}
                    </div>
                  )}
 
                  {/* Option B: Inline Desk Creation */}
                  {deskOption === "new" && (
                    <div className="space-y-3 rounded-xl border border-border/80 bg-accent/20 p-3.5">
                      <div>
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Desk Name *</Label>
                        <Input
                          value={inlineDeskName}
                          onChange={(e) => setInlineDeskName(e.target.value)}
                          placeholder="e.g. Counter 3 or Desk C"
                          required={deskOption === "new"}
                          className="mt-1 h-9 text-xs rounded-xl"
                        />
                      </div>
 
                      {!noService && (
                        <div>
                          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Handled Service Categories ({inlineDeskServices.length} Selected)
                          </Label>
                          <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-xl border border-border/80 bg-background p-2">
                            {branchServices.map((s) => {
                              const isChecked = inlineDeskServices.includes(s.id);
                              return (
                                <button
                                  type="button"
                                  key={s.id}
                                  onClick={() => {
                                    setInlineDeskServices((prev) =>
                                      isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                    );
                                  }}
                                  className={cn(
                                    "rounded-lg border px-2 py-0.5 text-xs font-semibold transition-all flex items-center gap-1",
                                    isChecked ? "border-brand bg-brand/15 text-brand" : "border-border text-muted-foreground hover:border-foreground"
                                  )}
                                >
                                  {isChecked && <Check className="h-3 w-3 text-brand" />}
                                  {s.name}
                                </button>
                              );
                            })}
                            {branchServices.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER BUTTONS */}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                {addStaffStep === 2 && newStaffRole === "desk_staff" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddStaffStep(1)}
                    className="text-xs"
                  >
                    ← Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddStaffModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                )}

                {newStaffRole === "branch_admin" ? (
                  <Button type="submit" variant="brand" disabled={isCreatingStaff || !newStaffEmail.trim()}>
                    {isCreatingStaff ? "Creating Admin..." : "Create Staff & Credentials"}
                  </Button>
                ) : addStaffStep === 1 ? (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => {
                      if (!newStaffEmail.trim() || !newStaffFirstName.trim() || !newStaffLastName.trim()) {
                        toast.error("Please fill in all required fields.");
                        return;
                      }
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(newStaffEmail.trim())) {
                        toast.error("Please enter a valid login email address.");
                        return;
                      }
                      if (state.staff.some((st) => st.email.toLowerCase() === newStaffEmail.trim().toLowerCase())) {
                        toast.error(`A staff user with email "${newStaffEmail.trim()}" already exists.`);
                        return;
                      }
                      if (newStaffPassword.trim().length < 6) {
                        toast.error("Password must be at least 6 characters long.");
                        return;
                      }
                      setAddStaffStep(2);
                    }}
                    className="gap-1.5"
                  >
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="brand"
                    disabled={
                      isCreatingStaff ||
                      (deskOption === "existing" && !selectedExistingDeskId) ||
                      (deskOption === "new" && !inlineDeskName.trim())
                    }
                  >
                    {isCreatingStaff ? "Creating Staff..." : "Create Staff & Credentials"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff Account & Credentials */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-brand" />
                <h3 className="text-base font-bold">Edit Staff Account & Credentials</h3>
              </div>
              <button onClick={() => setEditingStaff(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name</Label>
                  <Input
                    value={editStaffFirstName}
                    onChange={(e) => setEditStaffFirstName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input
                    value={editStaffLastName}
                    onChange={(e) => setEditStaffLastName(e.target.value)}
                    placeholder="e.g. Patel"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Login Email *</Label>
                <Input
                  type="email"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  placeholder="e.g. ramesh@company.com"
                  required
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditStaffRole("desk_staff")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-all text-xs font-semibold",
                      editStaffRole === "desk_staff" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                    )}
                  >
                    🖥️ Desk Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStaffRole("branch_admin")}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-all text-xs font-semibold",
                      editStaffRole === "branch_admin" ? "border-brand bg-brand/10 text-brand ring-1 ring-brand" : "border-border text-foreground hover:bg-accent"
                    )}
                  >
                    🛡️ Branch Admin
                  </button>
                </div>
              </div>

              {/* Assigned Counter Desk (Desk Operator role only) */}
              {editStaffRole === "desk_staff" && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Assigned Counter Desk</span>
                    <span className="text-[10px] text-brand font-normal">Services derived automatically</span>
                  </Label>
                  <div className="mt-1.5 space-y-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                    <button
                      type="button"
                      onClick={() => setEditStaffDeskId(null)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                        editStaffDeskId === null ? "border-amber-500/50 bg-amber-500/10 text-amber-600 font-bold" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                      )}
                    >
                      <span>⚠️ Unassigned (No desk assigned)</span>
                      {editStaffDeskId === null && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                    </button>

                    {branchDesks.map((d) => {
                      const isSelected = editStaffDeskId === d.id;
                      const deskServiceIds = state.deskServices
                        .filter((ds) => ds.deskId === d.id)
                        .map((ds) => ds.serviceId);

                      const otherAssignedCount = state.staff.filter((st) => st.deskId === d.id && st.id !== editingStaff.id).length;
                      const isAssigned = otherAssignedCount > 0;

                      return (
                        <button
                          type="button"
                          key={d.id}
                          disabled={isAssigned}
                          onClick={() => !isAssigned && setEditStaffDeskId(d.id)}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                            isAssigned ? "opacity-50 cursor-not-allowed border-dashed bg-muted/30" : "cursor-pointer",
                            isSelected ? "border-brand bg-brand/15 text-brand font-bold ring-1 ring-brand" : (!isAssigned && "border-border/60 bg-background text-muted-foreground hover:border-foreground")
                          )}
                        >
                          <div>
                            <div className="font-bold text-foreground">{d.label}</div>
                            {!noService && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {deskServiceIds.map((sId) => {
                                  const s = branchServices.find((ser) => ser.id === sId);
                                  return s ? (
                                    <span key={sId} className="text-[9px] text-muted-foreground bg-muted px-1 rounded">
                                      {s.name}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingStaff(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSavingStaff || !editStaffEmail.trim()}>
                  {isSavingStaff ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Desk */}
      {isAddDeskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold">Add Operator Desk</h3>
              <button onClick={() => setIsAddDeskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDesk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Name *</Label>
                <Input
                  value={newDeskName}
                  onChange={(e) => setNewDeskName(e.target.value)}
                  placeholder="e.g. Counter 1 or Reception Desk"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewDeskActive(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      newDeskActive ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" /> Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeskActive(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !newDeskActive ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted-foreground" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Online Bookings Settings</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewDeskOnlineBooking(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      newDeskOnlineBooking ? "border-brand bg-brand/15 text-brand ring-1 ring-brand" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" /> Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeskOnlineBooking(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !newDeskOnlineBooking ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {!noService && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Handled Service Categories ({newDeskServices.length} Selected)
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                    {branchServices.map((s) => {
                      const isChecked = newDeskServices.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setNewDeskServices((prev) =>
                              isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5",
                            isChecked ? "border-brand bg-brand/15 text-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 text-brand" />}
                          {s.name}
                        </button>
                      );
                    })}
                    {branchServices.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Operator Staff (Strictly 1 Staff per Desk) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Assigned Operator Staff</span>
                  <span className="text-[10px] text-brand font-normal">1 Desk per Staff</span>
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                  <button
                    type="button"
                    onClick={() => setNewDeskStaffId(null)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all col-span-2",
                      newDeskStaffId === null ? "border-amber-500/50 bg-amber-500/10 text-amber-600 font-bold" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                    )}
                  >
                    <span>⚠️ Unassigned (No staff operator)</span>
                    {newDeskStaffId === null && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                  </button>

                  {branchStaff.map((st) => {
                    const isSelected = newDeskStaffId === st.id;
                    const otherDeskAssigned = state.desks.find(
                      (d) => branchStaff.some((s) => s.id === st.id && s.deskId === d.id)
                    );

                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => {
                          setNewDeskStaffId(isSelected ? null : st.id);
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                          isSelected ? "border-brand bg-brand/15 text-brand font-bold ring-1 ring-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground text-[9px] font-bold">
                            {st.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="truncate min-w-0">
                            <div className="truncate">{st.name}</div>
                            {otherDeskAssigned && !isSelected && (
                              <div className="text-[9px] text-muted-foreground font-normal">On {otherDeskAssigned.label}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                      </button>
                    );
                  })}
                  {branchStaff.length === 0 && (
                    <p className="col-span-2 text-[11px] text-muted-foreground p-2 text-center">
                      No staff accounts created for this branch yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsAddDeskModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isCreatingDesk}>
                  {isCreatingDesk ? "Creating..." : "Create Desk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Desk */}
      {editingDesk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand" />
                <h3 className="text-lg font-bold">Edit Counter Desk</h3>
              </div>
              <button onClick={() => setEditingDesk(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDesk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Name *</Label>
                <Input
                  value={editDeskName}
                  onChange={(e) => setEditDeskName(e.target.value)}
                  placeholder="e.g. Counter 1"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desk Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditDeskActive(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      editDeskActive ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" /> Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDeskActive(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !editDeskActive ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted-foreground" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Online Bookings Settings</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditDeskOnlineBooking(true)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      editDeskOnlineBooking ? "border-brand bg-brand/15 text-brand ring-1 ring-brand" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" /> Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDeskOnlineBooking(false)}
                    className={cn(
                      "rounded-xl border p-2.5 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      !editDeskOnlineBooking ? "border-muted-foreground/50 bg-muted text-muted-foreground ring-1 ring-muted" : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {!noService && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Handled Service Categories ({editDeskServices.length} Selected)
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                    {branchServices.map((s) => {
                      const isChecked = editDeskServices.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => {
                            setEditDeskServices((prev) =>
                              isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            );
                          }}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1.5",
                            isChecked ? "border-brand bg-brand/15 text-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                          )}
                        >
                          {isChecked && <Check className="h-3 w-3 text-brand" />}
                          {s.name}
                        </button>
                      );
                    })}
                    {branchServices.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No service categories defined.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Operator Staff (Strictly 1 Staff per Desk) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Assigned Operator Staff</span>
                  <span className="text-[10px] text-brand font-normal">1 Desk per Staff</span>
                </Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 max-h-36 overflow-y-auto rounded-xl border border-border/80 bg-accent/20 p-2.5">
                  <button
                    type="button"
                    onClick={() => setEditDeskStaffId(null)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all col-span-2",
                      editDeskStaffId === null ? "border-amber-500/50 bg-amber-500/10 text-amber-600 font-bold" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                    )}
                  >
                    <span>⚠️ Unassigned (No staff operator)</span>
                    {editDeskStaffId === null && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                  </button>

                  {branchStaff.map((st) => {
                    const isSelected = editDeskStaffId === st.id;
                    const otherDeskAssigned = state.desks.find(
                      (otherD) => otherD.id !== editingDesk.id && branchStaff.some(s => s.id === st.id && s.deskId === otherD.id)
                    );

                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => {
                          setEditDeskStaffId(isSelected ? null : st.id);
                        }}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-2 text-left text-xs font-medium transition-all",
                          isSelected ? "border-brand bg-brand/15 text-brand font-bold ring-1 ring-brand" : "border-border/60 bg-background text-muted-foreground hover:border-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground text-[9px] font-bold">
                            {st.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="truncate min-w-0">
                            <div className="truncate">{st.name}</div>
                            {otherDeskAssigned && !isSelected && (
                              <div className="text-[9px] text-muted-foreground font-normal">On {otherDeskAssigned.label}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                      </button>
                    );
                  })}
                  {branchStaff.length === 0 && (
                    <p className="col-span-2 text-[11px] text-muted-foreground p-2 text-center">
                      No staff accounts created for this branch yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingDesk(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSavingDesk}>
                  {isSavingDesk ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Service */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black text-foreground">Add Service Category</h3>
              <button onClick={() => setIsAddServiceModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Service Name *</Label>
                <Input
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Blood Test or X-Ray"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Token Prefix *</Label>
                  <Input
                    value={newServicePrefix}
                    onChange={(e) => setNewServicePrefix(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Estimated Time (Min) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newServiceAvgMinutes}
                    onChange={(e) => setNewServiceAvgMinutes(Number(e.target.value))}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setIsAddServiceModalOpen(false)} className="h-8 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isCreatingService} className="h-8 text-xs font-bold rounded-xl">
                  {isCreatingService ? "Creating..." : "Create Service"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Service */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-black text-foreground">Edit Service Category</h3>
              <button onClick={() => setEditingService(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Service Name *</Label>
                <Input
                  value={editServiceName}
                  onChange={(e) => setEditServiceName(e.target.value)}
                  placeholder="e.g. Blood Test"
                  required
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Token Prefix *</Label>
                  <Input
                    value={editServicePrefix}
                    onChange={(e) => setEditServicePrefix(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={2}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Estimated Time (Min) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editServiceAvgMinutes}
                    onChange={(e) => setEditServiceAvgMinutes(Number(e.target.value))}
                    required
                    className="mt-1 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setEditingService(null)} className="h-8 text-xs font-bold rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" className="h-8 text-xs font-bold rounded-xl">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Branch Details */}
      {isEditingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Edit Branch Details
              </h3>
              <button onClick={() => setIsEditingBranch(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="branchName" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
                <Input
                  id="branchName"
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  placeholder="e.g. Head Office"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="branchCity" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">City</Label>
                  <Input
                    id="branchCity"
                    value={editBranchCity}
                    onChange={(e) => setEditBranchCity(e.target.value)}
                    placeholder="e.g. Vadodara"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branchHours" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Operating Hours</Label>
                  <Input
                    id="branchHours"
                    value={editBranchHours}
                    onChange={(e) => setEditBranchHours(e.target.value)}
                    placeholder="e.g. 09:00 AM - 05:00 PM"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="branchAddress" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Address</Label>
                <Input
                  id="branchAddress"
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  placeholder="e.g. Main Office Address, Vadodara"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="branchPhone" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Contact Number</Label>
                  <Input
                    id="branchPhone"
                    value={editBranchPhone}
                    onChange={(e) => setEditBranchPhone(e.target.value)}
                    placeholder="e.g. 547237215432"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branchEmail" className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Support Email</Label>
                  <Input
                    id="branchEmail"
                    value={editBranchEmail}
                    onChange={(e) => setEditBranchEmail(e.target.value)}
                    placeholder="e.g. renuka@gmail.com"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsEditingBranch(false)} className="h-9">
                Cancel
              </Button>
              <Button variant="brand" size="sm" onClick={handleSaveBranch} className="h-9 font-bold px-4">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Branch QR Code & Links */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">{branch.name} — QR Code</h3>
                  <p className="text-[10px] text-muted-foreground">{branch.city || "Branch Location"}</p>
                </div>
              </div>
              <button onClick={() => setIsQrModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/80 bg-accent/20 space-y-3">
              {/* Generated QR Code Canvas / Image */}
              <div className="p-3 bg-white rounded-xl shadow-md border border-border flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/q/${branch.id}`
                  )}`}
                  alt={`QR Code for ${branch.name}`}
                  className="h-44 w-44 object-contain rounded-lg"
                />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-2">
                  SCAN TO JOIN QUEUE
                </span>
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                Display or print this QR code at your branch entrance for walk-in customer self-checkin.
              </p>
            </div>

            {/* Direct Links and Copy Actions */}
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer Queue Web App URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/q/${branch.id}`}
                    className="h-8 text-xs font-mono text-muted-foreground bg-accent/30 rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/q/${branch.id}`);
                      toast.success("Customer Queue URL copied to clipboard!");
                    }}
                    className="h-8 shrink-0 text-xs font-semibold gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/q/${branch.id}`, "_blank")}
                    className="h-8 shrink-0 p-2"
                    title="Open Queue Page"
                  >
                    <ExternalLink className="h-4 w-4 text-brand" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Branch Kiosk Check-In Display URL</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5 mb-1.5 font-medium">
                  This is the shared terminal for this branch — customers select their check-in method (QR, Kiosk, or KOT delivery) here based on what's enabled.
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/kiosk/${branch.id}`}
                    className="h-8 text-xs font-mono text-muted-foreground bg-accent/30 rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/kiosk/${branch.id}`);
                      toast.success("Branch Kiosk URL copied to clipboard!");
                    }}
                    className="h-8 shrink-0 text-xs font-semibold gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/kiosk/${branch.id}`, "_blank")}
                    className="h-8 shrink-0 p-2"
                    title="Open Kiosk Terminal"
                  >
                    <ExternalLink className="h-4 w-4 text-brand" />
                  </Button>
                </div>
              </div>

              {/* Live Display Board URL — for branch TV */}
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Live Display Board URL
                  <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold text-violet-400 uppercase tracking-wider">TV Screen</span>
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 mb-1">Open this URL on a TV or monitor mounted in your waiting area. No login required.</p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/display/${branch.id}`}
                    className="h-8 text-xs font-mono text-muted-foreground bg-violet-500/5 border-violet-500/20 rounded-lg"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/display/${branch.id}`);
                      toast.success("Live Display URL copied to clipboard!");
                    }}
                    className="h-8 shrink-0 text-xs font-semibold gap-1 border-violet-500/30 text-violet-500"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/display/${branch.id}`, "_blank")}
                    className="h-8 shrink-0 p-2"
                    title="Open Live Display"
                  >
                    <ExternalLink className="h-4 w-4 text-violet-500" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsQrModalOpen(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Purchase Guidance Modal for Branch Admin */}
      {upsellModalCompKey && isBranchAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-base font-bold">Branch Allocation Limit Reached</h3>
              </div>
              <button onClick={() => setUpsellModalCompKey(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 text-foreground">
              <p className="font-bold">
                Your branch has reached the maximum allowed {upsellModalCompKey === "operator_screens" ? "Operator Screens" : "Service Categories"} allocated under your company subscription plan.
              </p>
              <p className="text-muted-foreground">
                To create additional {upsellModalCompKey === "operator_screens" ? "counter desks" : "service categories"}, please contact your Company Admin to purchase add-on allocations for your company.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Hi Company Admin, our branch (${branch.name}) has reached the ${upsellModalCompKey === "operator_screens" ? "Operator Screens" : "Service Categories"} limit. Please purchase an add-on allocation for our branch.`
                  );
                  toast.success("Notification message copied to clipboard!");
                }}
                className="text-xs gap-1.5"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Message for Admin
              </Button>
              <Button type="button" variant="brand" onClick={() => setUpsellModalCompKey(null)} className="text-xs">
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add-on Purchase Upsell Modal for Company Admin */}
      {upsellModalCompKey && !isBranchAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xl font-display font-bold">Plan Allocation Limit Reached</h3>
              <button onClick={() => setUpsellModalCompKey(null)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            {renderPlanUsageView ? (
              renderPlanUsageView(companyId, company)
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                Usage details are not available. Please contact your administrator.
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setUpsellModalCompKey(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kiosk Access Password & Timeout Settings */}
      {isKioskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">Kiosk Access & Idle Timeout Settings</h3>
                  <p className="text-[11px] text-muted-foreground">{branch.name}</p>
                </div>
              </div>
              <button onClick={() => setIsKioskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKioskPin} className="space-y-4">
              {!branch?.kioskPasswordHash && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ <strong>Action Required:</strong> Set a password before you can open the Kiosk screen. This PIN gates staff-only exit/settings on public touch hardware.
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiosk Access Password / PIN *</Label>
                <Input
                  type="password"
                  value={kioskPin}
                  onChange={(e) => setKioskPin(e.target.value)}
                  placeholder="Set 4+ digit PIN or password"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confirm Password *</Label>
                <Input
                  type="password"
                  value={kioskPinConfirm}
                  onChange={(e) => setKioskPinConfirm(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Idle Screen Auto-Reset Timeout (Seconds)
                </Label>
                <Input
                  type="number"
                  min={4}
                  max={60}
                  value={kioskTimeout}
                  onChange={(e) => setKioskTimeout(Number(e.target.value))}
                  required
                  className="mt-1 text-xs rounded-xl h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  How long the confirmation screen sits before auto-resetting back to the Idle Attract Screen for the next customer (default: 8s).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsKioskModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" variant="brand" disabled={isSavingKioskPin || !kioskPin} className="text-xs">
                  {isSavingKioskPin ? "Saving..." : "Save Kiosk Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Kiosk Terminal */}
      {isAddKioskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-brand" />
                <div>
                  <h3 className="text-base font-bold">Add Kiosk Terminal</h3>
                  <p className="text-[11px] text-muted-foreground">{branch.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAddKioskModalOpen(false)} className="text-muted-foreground hover:text-foreground font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateKiosk} className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kiosk Identifier Name *</Label>
                <Input
                  type="text"
                  value={newKioskName}
                  onChange={(e) => setNewKioskName(e.target.value)}
                  placeholder="e.g. Kiosk 1 or Reception Lobby Kiosk"
                  required
                  className="mt-1 text-xs rounded-xl h-9 font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">4-Digit Access PIN *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={newKioskPin}
                  onChange={(e) => setNewKioskPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 1234"
                  required
                  className="mt-1 font-mono text-xs rounded-xl h-9"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Generated automatically. You can change this to any 4-digit code.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddKioskModalOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingKiosk || newKioskPin.length !== 4}
                  className="text-xs h-9"
                >
                  {isCreatingKiosk ? "Creating..." : "Create Kiosk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface OnlineBookingSettingsPanelProps {
  branch: any;
  company: any;
}

export function OnlineBookingSettingsPanel({ branch, company }: OnlineBookingSettingsPanelProps) {
  const { state, actions } = useQuesole();
  const isMethod4Enabled = branch.enabledMethods?.includes(4) || false;
  const branchDesks = state.desks.filter(d => String(d.branchId) === String(branch.id));
  const branchServices = state.services.filter(s => String(s.branchId) === String(branch.id));
  const onlineDesksCount = branchDesks.filter(d => d.isOnlineBookingDesk).length;
  const showDeskWarning = isMethod4Enabled && branch?.channel_type !== "ONLINE_ONLY" && onlineDesksCount === 0;

  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form states - Weekly Schedule / Range Schedule
  const [weeklyMode, setWeeklyMode] = useState<"WEEKLY" | "RANGE">("WEEKLY");
  const [weeklyStartDate, setWeeklyStartDate] = useState("");
  const [weeklyEndDate, setWeeklyEndDate] = useState("");
  const [weeklyRepeatWeekly, setWeeklyRepeatWeekly] = useState(true);
  const [weeklyBreakStart, setWeeklyBreakStart] = useState("");
  const [weeklyBreakEnd, setWeeklyBreakEnd] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("0");
  const [weeklyService, setWeeklyService] = useState("");
  const [weeklyStart, setWeeklyStart] = useState("09:00");
  const [weeklyEnd, setWeeklyEnd] = useState("17:00");
  const [weeklyDuration, setWeeklyDuration] = useState("30");
  const [weeklyCapacity, setWeeklyCapacity] = useState("1");
  const [isAddingWeekly, setIsAddingWeekly] = useState(false);

  // Form states - Date Override
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideActive, setOverrideActive] = useState(false);
  const [overrideService, setOverrideService] = useState("");
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideDuration, setOverrideDuration] = useState("30");
  const [overrideCapacity, setOverrideCapacity] = useState("1");
  const [overrideBreakStart, setOverrideBreakStart] = useState("");
  const [overrideBreakEnd, setOverrideBreakEnd] = useState("");
  const [isAddingOverride, setIsAddingOverride] = useState(false);

  // Preview slots states
  const [previewDateVal, setPreviewDateVal] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateVal}`;
  });
  const [previewServiceId, setPreviewServiceId] = useState<string>("");
  const [previewSlots, setPreviewSlots] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Helper to check if a date has slots configured on the client side
  const hasSlotsForDate = (date: Date, templates: any[], serviceId?: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dateVal = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    const dayOfWeek = (date.getDay() + 6) % 7;

    const specificTemplates = [];
    const weeklyTemplates = [];

    const filteredTemplates = templates.filter(t => {
      if (!serviceId) return true;
      return !t.service || String(t.service) === String(serviceId);
    });

    for (const t of filteredTemplates) {
      if (t.specific_date) {
        if (t.specific_date === dateStr) {
          specificTemplates.push(t);
        }
      } else if (t.start_date && t.end_date) {
        if (t.start_date <= dateStr && dateStr <= t.end_date) {
          if (t.day_of_week !== null && t.day_of_week !== undefined) {
            if (t.day_of_week === dayOfWeek) {
              specificTemplates.push(t);
            }
          } else {
            specificTemplates.push(t);
          }
        }
      } else if (t.day_of_week !== null && t.day_of_week !== undefined) {
        if (t.day_of_week === dayOfWeek) {
          if (t.repeat_weekly) {
            weeklyTemplates.push(t);
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkD = new Date(date);
            checkD.setHours(0, 0, 0, 0);
            const diffTime = checkD.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
              weeklyTemplates.push(t);
            }
          }
        }
      } else {
        // If everything is null, it's an Everyday template
        weeklyTemplates.push(t);
      }
    }

    if (specificTemplates.some(t => !t.is_active)) {
      return false;
    }

    const activeSpecific = specificTemplates.filter(t => t.is_active);
    if (activeSpecific.length > 0) {
      return true;
    }

    return weeklyTemplates.filter(t => t.is_active).length > 0;
  };

  // Generate next 90 days filtered to only dates that actually have slots defined
  const previewDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (hasSlotsForDate(d, timeSlots, previewServiceId)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateVal = String(d.getDate()).padStart(2, '0');
        
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayNum = d.getDate();
        const monthName = d.toLocaleDateString("en-US", { month: "short" });

        dates.push({
          value: `${year}-${month}-${dateVal}`,
          dayName,
          dayNum,
          monthName,
          label: `${dayName}, ${monthName} ${dayNum}`
        });
      }
    }
    return dates.slice(0, 30);
  }, [timeSlots, previewServiceId]);

  const fetchSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const data = await apiFetch(`/api/time-slots/?branch=${branch.id}`);
      setTimeSlots(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load time slot configurations.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchPreview = async (dateStr: string, serviceId?: string) => {
    setIsLoadingPreview(true);
    try {
      const serviceParam = serviceId ? `&service_id=${serviceId}` : "";
      const data = await apiFetch(`/api/public/branches/${branch.id}/slots/?date=${dateStr}${serviceParam}`);
      setPreviewSlots(data);
    } catch (err) {
      console.error(err);
      setPreviewSlots([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [branch.id]);

  useEffect(() => {
    if (previewDates.length > 0) {
      const exists = previewDates.some(d => d.value === previewDateVal);
      if (!exists && previewDates[0]) {
        setPreviewDateVal(previewDates[0].value);
      }
    }
  }, [previewDates, previewDateVal]);

  useEffect(() => {
    if (previewDateVal) {
      fetchPreview(previewDateVal, previewServiceId);
    }
  }, [previewDateVal, previewServiceId]);

  const handleToggleMethod4 = async () => {
    try {
      await actions.setBranchMethod(branch.id, 4);
      toast.success(isMethod4Enabled ? "Online Booking disabled for this branch." : "Online Booking enabled for this branch.");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle online booking.");
    }
  };

  const handleAddWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weeklyMode === "RANGE" && (!weeklyStartDate || !weeklyEndDate)) {
      toast.error("Please select both start date and end date.");
      return;
    }
    setIsAddingWeekly(true);
    try {
      const payload: any = {
        branch: branch.id,
        day_of_week: weeklyDay === "everyday" ? null : parseInt(weeklyDay),
        service: weeklyService || null,
        start_time: weeklyStart + ":00",
        end_time: weeklyEnd + ":00",
        slot_duration_minutes: parseInt(weeklyDuration),
        max_bookings_per_slot: parseInt(weeklyCapacity),
        is_active: true,
        break_start_time: weeklyBreakStart ? weeklyBreakStart + ":00" : null,
        break_end_time: weeklyBreakEnd ? weeklyBreakEnd + ":00" : null,
      };

      if (weeklyMode === "RANGE") {
        payload.start_date = weeklyStartDate;
        payload.end_date = weeklyEndDate;
        payload.repeat_weekly = false;
      } else {
        payload.repeat_weekly = weeklyRepeatWeekly;
        payload.start_date = null;
        payload.end_date = null;
      }

      await apiFetch("/api/time-slots/", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      toast.success(weeklyMode === "RANGE" ? "Specific date range template added!" : "Weekly schedule slot template added!");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add schedule window.");
    } finally {
      setIsAddingWeekly(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) {
      toast.error("Please select a date for the override.");
      return;
    }
    setIsAddingOverride(true);
    try {
      await apiFetch("/api/time-slots/", {
        method: "POST",
        body: JSON.stringify({
          branch: branch.id,
          specific_date: overrideDate,
          service: overrideService || null,
          start_time: overrideActive ? overrideStart + ":00" : "00:00:00",
          end_time: overrideActive ? overrideEnd + ":00" : "00:00:00",
          slot_duration_minutes: overrideActive ? parseInt(overrideDuration) : 30,
          max_bookings_per_slot: overrideActive ? parseInt(overrideCapacity) : 0,
          is_active: overrideActive,
          break_start_time: overrideActive && overrideBreakStart ? overrideBreakStart + ":00" : null,
          break_end_time: overrideActive && overrideBreakEnd ? overrideBreakEnd + ":00" : null,
        })
      });
      toast.success(overrideActive ? "Date override template added!" : "Branch marked as closed for online booking on this date.");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add override.");
    } finally {
      setIsAddingOverride(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await apiFetch(`/api/time-slots/${id}/`, { method: "DELETE" });
      toast.success("Schedule template removed.");
      fetchSlots();
      if (previewDateVal) {
        fetchPreview(previewDateVal, previewServiceId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot configuration.");
    }
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const categorizedSlots = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];

    previewSlots.forEach((slot) => {
      const hour = parseInt(slot.time.split(":")[0]);
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 16) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [previewSlots]);

  const renderSlotCard = (slot: any) => {
    const isFull = slot.status === "fully_booked" || slot.available <= 0;
    const isLow = !isFull && slot.available === 1;

    const slotRange = slot.end_time ? `${slot.time} to ${slot.end_time}` : (() => {
      try {
        const [h, m] = slot.time.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m + 30, 0, 0);
        const eh = String(d.getHours()).padStart(2, '0');
        const em = String(d.getMinutes()).padStart(2, '0');
        return `${slot.time} to ${eh}:${em}`;
      } catch {
        return slot.time;
      }
    })();

    return (
      <div
        key={slot.time}
        className={cn(
          "rounded-2xl border p-2.5 text-center flex flex-col justify-center items-center gap-1 transition-all select-none duration-200 shadow-sm",
          isFull
            ? "border-red-500/10 bg-red-500/5 text-red-500/40 opacity-60 line-through"
            : isLow
            ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-amber-500/50 hover:shadow"
            : "border-border bg-card text-foreground hover:border-brand/40 hover:shadow"
        )}
      >
        <span className="font-mono text-[10px] font-black tracking-tight whitespace-nowrap">{slotRange}</span>
        <span className={cn(
          "text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-md mt-0.5",
          isFull
            ? "bg-red-500/10 text-red-500"
            : isLow
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        )}>
          {isFull ? "Full" : isLow ? "1 Left" : `${slot.available}/${slot.capacity}`}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-6">
      {/* 1. Toggle Gating & Status Card */}
      <div className="panel p-5 space-y-4 border border-border/80 bg-accent/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-display text-sm font-bold text-foreground">Online Booking Availability (Method 4)</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Allow customers to book appointments online before arriving.</p>
          </div>
          <button
            onClick={handleToggleMethod4}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0",
              isMethod4Enabled ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" : "bg-accent text-muted-foreground hover:text-foreground border border-border"
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            {isMethod4Enabled ? "Active & Accepting Bookings" : "Inactive (Off)"}
          </button>
        </div>

        {/* 2. WARNING MODAL/BANNER */}
        {showDeskWarning && (
          <div className="rounded-xl border border-coral/30 bg-coral/5 p-4 text-xs text-coral flex items-start gap-3 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Operational Warning: No Serving Desks Enabled</p>
              <p className="mt-1 opacity-90 leading-relaxed">
                Online bookings are enabled for this branch, but <strong>no operator desks</strong> are configured to handle online bookings. 
                Go to the <strong>Desks</strong> tab and enable <strong>"Handles Online Bookings"</strong> on at least one desk so operators can serve checked-in customers.
              </p>
            </div>
          </div>
        )}

        {isMethod4Enabled && (
          <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Company-wide Shared Booking Link
            </Label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 font-mono text-xs select-all text-foreground overflow-x-auto">
                {window.location.protocol}//{window.location.host}/{company?.slug}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-9 px-3.5 text-xs font-semibold shrink-0 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/${company?.slug}`);
                    toast.success("Shared booking link copied to clipboard!");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </Button>
                <a
                  href={`/${company?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-border bg-background px-3 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Open Booking Flow"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Note: This is a shared link for the entire company. Customers visiting this URL will see a branch selector dropdown where <strong>{branch.name}</strong> is listed.
            </p>
          </div>
        )}
      </div>

      {isMethod4Enabled && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Schedule Configuration Builder */}
          <div className="panel p-5 space-y-5 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Add Weekly Schedule Window</h4>
              <p className="text-xs text-muted-foreground">Define regular weekly time slots for bookings.</p>
            </div>

            <form onSubmit={handleAddWeekly} className="space-y-3.5">
              {/* Toggle between Weekly Repeat and Date Range */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-accent/20 p-1">
                <button
                  type="button"
                  onClick={() => setWeeklyMode("WEEKLY")}
                  className={cn(
                    "rounded-lg py-1.5 text-center text-[11px] font-bold transition-all border-0 cursor-pointer outline-none",
                    weeklyMode === "WEEKLY" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weekly Repeating
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyMode("RANGE")}
                  className={cn(
                    "rounded-lg py-1.5 text-center text-[11px] font-bold transition-all border-0 cursor-pointer outline-none",
                    weeklyMode === "RANGE" ? "bg-white dark:bg-slate-800 text-foreground shadow-sm" : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Specific Date Range
                </button>
              </div>

              {weeklyMode === "RANGE" && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                    <input
                      type="date"
                      value={weeklyStartDate}
                      onChange={(e) => setWeeklyStartDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                    <input
                      type="date"
                      value={weeklyEndDate}
                      onChange={(e) => setWeeklyEndDate(e.target.value)}
                      className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day of Week</Label>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="everyday">Everyday</option>
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Scope</Label>
                  <select
                    value={weeklyService}
                    onChange={(e) => setWeeklyService(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">All Services</option>
                    {branchServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                  <input
                    type="time"
                    value={weeklyStart}
                    onChange={(e) => setWeeklyStart(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                  <input
                    type="time"
                    value={weeklyEnd}
                    onChange={(e) => setWeeklyEnd(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {/* Break Time configs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break Start (Optional)</Label>
                  <input
                    type="time"
                    value={weeklyBreakStart}
                    onChange={(e) => setWeeklyBreakStart(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break End (Optional)</Label>
                  <input
                    type="time"
                    value={weeklyBreakEnd}
                    onChange={(e) => setWeeklyBreakEnd(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slot Duration (Min)</Label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={weeklyDuration}
                    onChange={(e) => setWeeklyDuration(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacity per Slot</Label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={weeklyCapacity}
                    onChange={(e) => setWeeklyCapacity(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {weeklyMode === "WEEKLY" && (
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    type="checkbox"
                    id="repeatWeeklyCheckbox"
                    checked={weeklyRepeatWeekly}
                    onChange={(e) => setWeeklyRepeatWeekly(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-brand focus:ring-brand cursor-pointer"
                  />
                  <Label htmlFor="repeatWeeklyCheckbox" className="text-xs font-bold text-foreground cursor-pointer">
                    Repeat every week
                  </Label>
                </div>
              )}

              <Button type="submit" variant="brand" className="w-full rounded-xl text-xs py-2 h-9" disabled={isAddingWeekly}>
                {isAddingWeekly ? "Adding Template..." : "Add Schedule Window"}
              </Button>
            </form>
          </div>

          {/* Date Overrides & Closure builder */}
          <div className="panel p-5 space-y-5 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Add Specific Date Override (Holiday/Closure)</h4>
              <p className="text-xs text-muted-foreground">Configure overrides for holidays, closures, or custom schedule dates.</p>
            </div>

            <form onSubmit={handleAddOverride} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Date</Label>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operational Status</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setOverrideActive(true)}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-bold transition-all border-solid cursor-pointer outline-none",
                        overrideActive ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideActive(false)}
                      className={cn(
                        "rounded-xl border py-1.5 text-center text-xs font-bold transition-all border-solid cursor-pointer outline-none",
                        !overrideActive ? "border-coral bg-coral/10 text-coral ring-1 ring-coral" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Closed
                    </button>
                  </div>
                </div>
              </div>

              {overrideActive && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service Scope</Label>
                      <select
                        value={overrideService}
                        onChange={(e) => setOverrideService(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        <option value="">All Services</option>
                        {branchServices.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Time</Label>
                        <input
                          type="time"
                          value={overrideStart}
                          onChange={(e) => setOverrideStart(e.target.value)}
                          className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Time</Label>
                        <input
                          type="time"
                          value={overrideEnd}
                          onChange={(e) => setOverrideEnd(e.target.value)}
                          className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Break time override configs */}
                  <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break Start (Optional)</Label>
                      <input
                        type="time"
                        value={overrideBreakStart}
                        onChange={(e) => setOverrideBreakStart(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Break End (Optional)</Label>
                      <input
                        type="time"
                        value={overrideBreakEnd}
                        onChange={(e) => setOverrideBreakEnd(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Slot Duration (Min)</Label>
                      <input
                        type="number"
                        min="5"
                        value={overrideDuration}
                        onChange={(e) => setOverrideDuration(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Capacity per Slot</Label>
                      <input
                        type="number"
                        min="1"
                        value={overrideCapacity}
                        onChange={(e) => setOverrideCapacity(e.target.value)}
                        className="w-full mt-1 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" variant="brand" className="w-full rounded-xl text-xs py-2 h-9" disabled={isAddingOverride}>
                {isAddingOverride ? "Adding Override..." : "Add Date Override"}
              </Button>
            </form>
          </div>

          {/* Configurations list */}
          <div className="panel p-5 space-y-4 md:col-span-2 border border-border/80">
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Configured Availability Windows & Closures</h4>
              <p className="text-xs text-muted-foreground">Active templates used to auto-generate daily time slots.</p>
            </div>

            {isLoadingSlots ? (
              <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading configurations...</div>
            ) : timeSlots.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No active schedule configurations defined. Add a weekly schedule window above to start accepting bookings.
              </div>
            ) : (
              <div className="border border-border/60 rounded-2xl overflow-hidden overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-accent/30 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="p-3">Type</th>
                      <th className="p-3">Schedule Scope / Date</th>
                      <th className="p-3">Hours Window</th>
                      <th className="p-3">Details</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {timeSlots.map((ts) => {
                      const svc = branchServices.find(s => String(s.id) === String(ts.service));
                      const isOverride = !!ts.specific_date;
                      const isRange = !!(ts.start_date && ts.end_date);
                      return (
                        <tr key={ts.id} className="hover:bg-accent/10">
                          <td className="p-3 font-semibold">
                            {isOverride ? (
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", ts.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-coral/10 text-coral")}>
                                {ts.is_active ? "Date Override" : "Holiday Closure"}
                              </span>
                            ) : isRange ? (
                              <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-bold">
                                Date Range
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-bold">
                                Weekly Template
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-medium">
                            {isOverride ? (
                              ts.specific_date
                            ) : isRange ? (
                              <div>
                                <span className="font-bold">{ts.day_of_week !== null && ts.day_of_week !== undefined ? DAYS[ts.day_of_week] : "Everyday"}</span>
                                <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                                  {ts.start_date} to {ts.end_date}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold">{ts.day_of_week !== null && ts.day_of_week !== undefined ? DAYS[ts.day_of_week] : "Everyday"}</span>
                                {!ts.repeat_weekly && (
                                  <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                                    (Non-repeating)
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            {!ts.is_active ? (
                              "—"
                            ) : (
                              <div>
                                <span className="font-semibold">{ts.start_time.substring(0, 5)} - {ts.end_time.substring(0, 5)}</span>
                                {ts.break_start_time && ts.break_end_time && (
                                  <span className="block text-[10px] text-muted-foreground font-bold mt-0.5">
                                    Break: {ts.break_start_time.substring(0, 5)} - {ts.break_end_time.substring(0, 5)}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {!ts.is_active ? (
                              "Closed (All bookings disabled)"
                            ) : (
                              `${ts.slot_duration_minutes}m slots · Capacity: ${ts.max_bookings_per_slot} (${svc ? svc.name : "All Services"})`
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(ts.id)}
                              className="rounded-lg p-1.5 text-coral hover:bg-coral/10 transition-colors"
                              title="Delete template"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Live Booking Slots Preview */}
          <div className="panel p-5 space-y-5 md:col-span-2 border border-border/80 bg-white dark:bg-slate-900 rounded-3xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">Live Booking Slots Preview</h4>
                <p className="text-xs text-muted-foreground">Select a tab or jump to any date to preview the dynamic booking slots generated for customers.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {branchServices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5" /> Service:
                    </span>
                    <select
                      value={previewServiceId}
                      onChange={(e) => setPreviewServiceId(e.target.value)}
                      className="rounded-xl border border-border bg-accent/20 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand font-semibold cursor-pointer"
                    >
                      <option value="">All Services</option>
                      {branchServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Jump to:
                  </span>
                  <input
                    type="date"
                    value={previewDateVal}
                    onChange={(e) => {
                      if (e.target.value) {
                        setPreviewDateVal(e.target.value);
                      }
                    }}
                    className="rounded-xl border border-border bg-accent/20 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Date tabs */}
            {previewDates.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground italic bg-accent/5 rounded-2xl border border-dashed border-border/80">
                No dates with configured availability slots.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {previewDates.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setPreviewDateVal(d.value)}
                    className={cn(
                      "shrink-0 rounded-2xl border px-4 py-2.5 text-center flex flex-col items-center justify-center min-w-[75px] transition-all border-solid cursor-pointer outline-none",
                      previewDateVal === d.value
                        ? "bg-brand text-white border-brand shadow-sm shadow-brand/25"
                        : "border-border text-muted-foreground bg-surface hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <span className="text-[9px] uppercase font-black tracking-wider opacity-85">{d.dayName}</span>
                    <span className="text-base font-black tracking-tight my-0.5">{d.dayNum}</span>
                    <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{d.monthName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Slots Grid grouped by Morning / Afternoon / Evening */}
            {isLoadingPreview ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">Computing preview slots...</div>
            ) : previewSlots.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                No slots available on this date. Make sure you have configured active templates that cover this day of the week or date, and that it isn't marked as a holiday.
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Morning Slots */}
                {categorizedSlots.morning.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sunrise className="h-4 w-4 text-amber-500" /> Morning Slots (Before 12:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.morning.map(renderSlotCard)}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {categorizedSlots.afternoon.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sun className="h-4 w-4 text-orange-500" /> Afternoon Slots (12:00 PM - 4:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.afternoon.map(renderSlotCard)}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {categorizedSlots.evening.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <h5 className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
                      <Sunset className="h-4 w-4 text-indigo-500" /> Evening Slots (After 4:00 PM)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                      {categorizedSlots.evening.map(renderSlotCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface KotSettingsPanelProps {
  branch: any;
  company: any;
}

export function KotSettingsPanel({ branch, company }: KotSettingsPanelProps) {
  const { state, actions } = useQuesole();
  const [smsTemplate, setSmsTemplate] = useState<any | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState<any | null>(null);
  const [smsText, setSmsText] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isSmsActive = branch.enabledMethods?.map(Number).includes(3) || false;
  const isWhatsappActive = branch.enabledMethods?.map(Number).includes(4) || false;

  const [kioskPin, setKioskPin] = useState("");
  const [kioskPinConfirm, setKioskPinConfirm] = useState("");
  const [isSavingKioskPin, setIsSavingKioskPin] = useState(false);

  const handleSaveKioskPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskPin) {
      toast.error("Password cannot be empty.");
      return;
    }
    if (kioskPin.length < 4) {
      toast.error("Password must be at least 4 characters long.");
      return;
    }
    if (kioskPin !== kioskPinConfirm) {
      toast.error("Passwords do not match!");
      return;
    }
    setIsSavingKioskPin(true);
    try {
      await actions.updateBranchDetails(branch.id, {
        ...branch,
        name: branch?.name || "",
        city: branch?.city || "",
        kioskPasswordHash: kioskPin,
      } as any);
      toast.success("KOT Kiosk access password saved successfully!");
      setKioskPin("");
      setKioskPinConfirm("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save KOT Kiosk settings.");
    } finally {
      setIsSavingKioskPin(false);
    }
  };

  const fetchKotData = async () => {
    setIsLoading(true);
    try {
      const templatesData: any[] = await apiFetch(`/api/kot-message-templates/?branch=${branch.id}`);
      const smsT = templatesData.find((t: any) => t.channel === "sms");
      const waT = templatesData.find((t: any) => t.channel === "whatsapp");
      
      setSmsTemplate(smsT || null);
      setSmsText(smsT ? smsT.template_text : "Hi {customer_name}, your token is {token_number} (Service: {service_name}). Desk: {desk_name}. People ahead: {position}. Est wait: ~{eta} mins. Quesole Team");
      
      setWhatsappTemplate(waT || null);
      setWhatsappText(waT ? waT.template_text : "Hello {customer_name}! Here is your digital ticket for {branch_name}.\nToken: {token_number}\nService: {service_name}\nPeople ahead: {position}\nEst wait: ~{eta} mins.\nLive link: {tracking_link}");

      const logsData: any[] = await apiFetch(`/api/kot-notification-logs/?branch=${branch.id}`);
      setLogs(logsData);
    } catch (err) {
      console.error("Failed to load KOT settings/logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKotData();
  }, [branch.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save SMS template
      if (smsTemplate && smsTemplate.id) {
        await apiFetch(`/api/kot-message-templates/${smsTemplate.id}/`, {
          method: "PUT",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "sms",
            template_text: smsText
          })
        });
      } else {
        const newSms = await apiFetch(`/api/kot-message-templates/`, {
          method: "POST",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "sms",
            template_text: smsText
          })
        });
        setSmsTemplate(newSms);
      }

      // 2. Save WhatsApp template
      if (whatsappTemplate && whatsappTemplate.id) {
        await apiFetch(`/api/kot-message-templates/${whatsappTemplate.id}/`, {
          method: "PUT",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "whatsapp",
            template_text: whatsappText
          })
        });
      } else {
        const newWa = await apiFetch(`/api/kot-message-templates/`, {
          method: "POST",
          body: JSON.stringify({
            branch: branch.id,
            company: company.id,
            channel: "whatsapp",
            template_text: whatsappText
          })
        });
        setWhatsappTemplate(newWa);
      }

      toast.success("KOT notification templates saved successfully!");
      fetchKotData();
    } catch (err) {
      console.error("Failed to save KOT templates", err);
      toast.error("Failed to save templates. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* WhatsApp Mocknotice Alert banner */}
      {isWhatsappActive && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">WhatsApp Business API Simulator Mode</p>
            <p className="mt-1 opacity-90 leading-relaxed">
              WhatsApp Delivery is running in sandbox/simulation mode. No real-world messages are dispatched.
              Simulated dispatches are logged under <strong>KOT Message Logs</strong> as <strong>"Simulated ✓"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Header Description */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> KOT Notification Center
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure templates and monitor delivery status for virtual queue tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={fetchKotData}
            disabled={isLoading}
            className="rounded-xl text-xs font-bold"
          >
            Refresh Logs
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            variant="brand"
            className="rounded-xl text-xs font-bold shrink-0"
          >
            {isSaving ? "Saving..." : "Save Templates"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Editors */}
        <div className="lg:col-span-7 space-y-6">
          {/* KOT Check-In Settings Card */}
          <div className="panel p-5 space-y-4 border border-border bg-white dark:bg-slate-900 rounded-3xl">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4.5 w-4.5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">KOT Check-In Settings</span>
                  <span className="text-[10px] text-muted-foreground">Manage your dedicated SMS / WhatsApp check-in link and access PIN</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* KOT Check-In Link */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  KOT Check-In Link
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Dedicated SMS / WhatsApp check-in screen — customers go straight to the KOT form. Use this for QR posters or shared links for digital token delivery.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 font-mono text-xs select-all text-foreground overflow-x-auto">
                    {typeof window !== "undefined" ? window.location.origin : ""}/kot/{branch.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 px-3.5 text-xs font-semibold shrink-0 gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/kot/${branch.id}`);
                        toast.success("KOT Check-In link copied!");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      className="rounded-xl h-9 px-3 text-xs font-semibold shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => window.open(`/kot/${branch.id}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open KOT Screen
                    </Button>
                  </div>
                </div>
              </div>

              {/* PIN Config Form */}
              <form onSubmit={handleSaveKioskPin} className="space-y-3 border-t border-border/20 pt-3">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    KOT Screen Access PIN
                  </Label>
                  {!branch.kioskPasswordHash && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[8px] font-bold text-amber-500 uppercase tracking-wider">
                      Action Required
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="password"
                      value={kioskPin}
                      onChange={(e) => setKioskPin(e.target.value)}
                      placeholder="New password/PIN (min 4 chars)"
                      className="w-full rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={kioskPinConfirm}
                      onChange={(e) => setKioskPinConfirm(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      type="submit"
                      disabled={isSavingKioskPin}
                      size="sm"
                      className="rounded-xl h-9 px-4 text-xs font-bold shrink-0"
                    >
                      {isSavingKioskPin ? "Saving..." : "Set PIN"}
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-3 text-[10px] text-blue-600 dark:text-blue-400 flex items-start gap-2 leading-relaxed">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Kiosk Scope Notice:</strong> This PIN secures the entire branch kiosk touch terminal screen (exit/settings lock) across all queue check-in methods, not just KOT Delivery. Exit is denied by default until a PIN is configured.
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* SMS Section */}
          <div className={cn(
            "panel p-5 space-y-4 border border-border/80 rounded-3xl",
            isSmsActive ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/30 opacity-70"
          )}>
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4.5 w-4.5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">SMS Alerts & Reminders</span>
                  <span className="text-[10px] text-muted-foreground">Standard SMS delivery gateway</span>
                </div>
              </div>
              <span className={cn(
                "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                isSmsActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground/60"
              )}>
                {isSmsActive ? "Active" : "Inactive"}
              </span>
            </div>

            {isSmsActive ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    SMS Template Message
                  </Label>
                  <textarea
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    className="w-full h-24 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter SMS template..."
                  />
                  <div className="text-[9px] text-muted-foreground mt-2 space-y-1 bg-accent/5 p-2 rounded-xl">
                    <p className="font-bold uppercase tracking-wider text-[8px]">Supported Template Variables:</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[8px] text-primary/80">
                      <div>{`{customer_name}`}</div>
                      <div>{`{token_number}`}</div>
                      <div>{`{service_name}`}</div>
                      <div>{`{desk_name}`}</div>
                      <div>{`{position}`}</div>
                      <div>{`{eta}`}</div>
                      <div>{`{branch_name}`}</div>
                      <div>{`{tracking_link}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                SMS delivery is not active. Enable it in the Plan & Usage settings.
              </div>
            )}
          </div>

          {/* WhatsApp Section */}
          <div className={cn(
            "panel p-5 space-y-4 border border-border/80 rounded-3xl",
            isWhatsappActive ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/30 opacity-70"
          )}>
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4.5 w-4.5" />
                </span>
                <div>
                  <span className="text-xs font-bold text-foreground block">WhatsApp Digital Tickets</span>
                  <span className="text-[10px] text-muted-foreground">Official business notification channel</span>
                </div>
              </div>
              <span className={cn(
                "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                isWhatsappActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-800 text-muted-foreground/60"
              )}>
                {isWhatsappActive ? "Active" : "Inactive"}
              </span>
            </div>

            {isWhatsappActive ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    WhatsApp Message Template
                  </Label>
                  <textarea
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    className="w-full h-24 rounded-xl border border-border bg-accent/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Enter WhatsApp template..."
                  />
                  <div className="text-[9px] text-muted-foreground mt-2 space-y-1 bg-accent/5 p-2 rounded-xl">
                    <p className="font-bold uppercase tracking-wider text-[8px]">Supported Template Variables:</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[8px] text-primary/80">
                      <div>{`{customer_name}`}</div>
                      <div>{`{token_number}`}</div>
                      <div>{`{service_name}`}</div>
                      <div>{`{desk_name}`}</div>
                      <div>{`{position}`}</div>
                      <div>{`{eta}`}</div>
                      <div>{`{branch_name}`}</div>
                      <div>{`{tracking_link}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground py-4 text-center">
                WhatsApp delivery is not active. Enable it in the Plan & Usage settings.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Previews & Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulated Previews */}
          <div className="panel p-5 space-y-4 border border-border/80 bg-accent/5 rounded-3xl">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Live Mock Previews
            </h5>
            
            {isSmsActive && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Simulated SMS Alert
                </span>
                <div className="bg-slate-100 dark:bg-slate-950 border border-border/40 p-3.5 rounded-2xl relative">
                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground font-black mb-1.5 uppercase tracking-wider border-b border-border/20 pb-1">
                    <MessageSquare className="h-3 w-3" /> SMS Gateway Preview
                  </div>
                  <p className="text-[10px] text-foreground leading-normal font-mono select-none whitespace-pre-wrap">
                    {smsText
                      .replace("{customer_name}", "Harshil")
                      .replace("{token_number}", "A304")
                      .replace("{service_name}", "General Banking")
                      .replace("{desk_name}", "Counter 01")
                      .replace("{position}", "3")
                      .replace("{eta}", "45")
                      .replace("{branch_name}", branch.name)
                      .replace("{tracking_link}", `${window.location.protocol}//${window.location.host}/track/mock-code`)}
                  </p>
                </div>
              </div>
            )}

            {isWhatsappActive && (
              <div className="space-y-1.5 mt-4">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Simulated WhatsApp Bubble
                </span>
                <div className="bg-[#E5DDD5] dark:bg-[#0b141a] p-3.5 rounded-2xl relative border border-border/40">
                  <div className="flex items-center gap-1.5 text-[8px] text-[#075e54] dark:text-[#00a884] font-black mb-1.5 uppercase tracking-wider border-b border-black/5 pb-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp Business API
                  </div>
                  <div className="bg-white dark:bg-[#1f2c34] p-3 rounded-xl max-w-[85%] shadow-sm relative ml-1">
                    <p className="text-[10px] text-foreground leading-normal font-mono select-none whitespace-pre-wrap">
                      {whatsappText
                        .replace("{customer_name}", "Harshil")
                        .replace("{token_number}", "A304")
                        .replace("{service_name}", "General Banking")
                        .replace("{desk_name}", "Counter 01")
                        .replace("{position}", "3")
                        .replace("{eta}", "45")
                        .replace("{branch_name}", branch.name)
                        .replace("{tracking_link}", `${window.location.protocol}//${window.location.host}/track/mock-code`)}
                    </p>
                    <span className="text-[8px] text-muted-foreground/60 dark:text-muted-foreground/40 block mt-1 text-right">
                      12:45 PM ✓✓
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="panel p-5 space-y-4 border border-border/80 bg-background rounded-3xl">
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                KOT Message Logs
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                Live Gateway
              </span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const isWaLog = log.channel === "whatsapp";
                const isMock = log.status === "sent_mock";
                const icon = isWaLog ? (
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                );

                return (
                  <div key={log.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-border/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {icon}
                        <div>
                          <span className="text-xs font-bold text-foreground block leading-none">
                            {log.customer_name || "Visitor"}
                          </span>
                          <span className="text-[8px] text-muted-foreground block mt-1">
                            Token: <strong className="text-foreground">{log.ticket_number}</strong> · Recipient: {log.recipient}
                          </span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                        isMock
                          ? "bg-blue-500/10 text-blue-500"
                          : log.status === "delivered" || log.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      )}>
                        {isMock ? "Simulated ✓" : log.status}
                      </span>
                    </div>
                    <div className="bg-background/80 p-2 rounded-lg border border-border/20 text-[9px] text-muted-foreground font-mono leading-relaxed select-all">
                      {log.message_body}
                    </div>
                    {log.error_message && (
                      <p className="text-[8px] font-bold text-red-500">Error: {log.error_message}</p>
                    )}
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No notifications have been dispatched for this branch yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
