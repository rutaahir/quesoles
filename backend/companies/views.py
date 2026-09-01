from rest_framework import serializers, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from django.db import transaction
from django.core.files.storage import default_storage
from core.permissions import IsSuperAdmin
from core.models import PlatformSetting
from core.throttles import CompanySignupThrottle
from core.honeypot import validate_honeypot
from companies.models import Company
from billing.models import Subscription
from accounts.models import User
from companies.serializers import CompanyRegistrationSerializer
from audit.utils import log_audit

class CompanyRegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [CompanySignupThrottle]

    def post(self, request):
        validate_honeypot(request.data)
        
        # Map frontend payload fields to serializer expectations
        raw_data = request.data.copy()
        
        if "name" in raw_data and "company_name" not in raw_data:
            raw_data["company_name"] = raw_data["name"]
            
        if "email" in raw_data:
            if "contact_email" not in raw_data:
                raw_data["contact_email"] = raw_data["email"]
            if "admin_email" not in raw_data:
                raw_data["admin_email"] = raw_data["email"]
                
        if "contact" in raw_data:
            parts = raw_data["contact"].strip().split(maxsplit=1)
            first_name = parts[0] if parts else "Admin"
            last_name = parts[1] if len(parts) > 1 else "User"
            if "admin_first_name" not in raw_data:
                raw_data["admin_first_name"] = first_name
            if "admin_last_name" not in raw_data:
                raw_data["admin_last_name"] = last_name
                
        plan_name = raw_data.get("plan", "Starter").lower()
        db_plan_name = "Starter"
        if "growth" in plan_name or "standard" in plan_name or "advanced" in plan_name:
            db_plan_name = "Standard"
        elif "enterprise" in plan_name:
            db_plan_name = "Enterprise"
        
        from billing.models import Package
        pkg = Package.objects.filter(name__iexact=db_plan_name, is_active=True).first()
        if not pkg:
            pkg = Package.objects.filter(is_active=True).first()
        if pkg and "package" not in raw_data:
            raw_data["package"] = pkg.id
                
        if "password" in raw_data:
            if "admin_password" not in raw_data:
                raw_data["admin_password"] = raw_data["password"]
            if "admin_confirm_password" not in raw_data:
                raw_data["admin_confirm_password"] = raw_data["password"]
                
        if "phone" in raw_data:
            if "contact_phone" not in raw_data:
                raw_data["contact_phone"] = raw_data["phone"]
            if "admin_phone" not in raw_data:
                raw_data["admin_phone"] = raw_data["phone"]
                
        # Sensible defaults for required fields
        if "contact_phone" not in raw_data:
            raw_data["contact_phone"] = "9999999999"
        if "admin_phone" not in raw_data:
            raw_data["admin_phone"] = "9999999999"
        if "address" not in raw_data:
            raw_data["address"] = "Main Office Address"
        if "estimated_branch_count" not in raw_data:
            raw_data["estimated_branch_count"] = 1
        if "billing_cycle" not in raw_data:
            raw_data["billing_cycle"] = "monthly"
        if "terms_consent" not in raw_data:
            raw_data["terms_consent"] = True
            
        if "branches" not in raw_data or not raw_data["branches"]:
            raw_data["branches"] = [{
                "name": "Primary Branch",
                "mode": "NON_SERVICE_BASED",
                "channel_type": "HYBRID",
                "service_qty": 1,
                "operator_qty": 1,
                "kiosk_qty": 1,
                "token_delivery_selections": ["SCREEN_ONLY"],
                "addons": {}
            }]

        serializer = CompanyRegistrationSerializer(data=raw_data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Validate branches mandatory component constraints
        from billing.models import PlanComponent
        branches_comp = PlanComponent.objects.filter(key="branches", is_active=True).first()
        branches_data = raw_data.get("branches", [])
        if branches_comp and getattr(branches_comp, "is_mandatory", False):
            if not branches_data or len(branches_data) < 1:
                return Response(
                    {"branches": ["At least 1 branch is required — please allocate at least 1 branch."]},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Validate each branch configuration against PricingEngine limits and mandatory components
        from billing.services.pricing_engine import PricingEngine
        for b_cfg in branches_data:
            b_mode = b_cfg.get("mode", "NON_SERVICE_BASED")
            service_qty = int(b_cfg.get("service_qty", 0))
            operator_qty = int(b_cfg.get("operator_qty", 0))
            kiosk_qty = int(b_cfg.get("kiosk_qty", 0))
            addons = b_cfg.get("addons", {})
            extra_desks = int(addons.get("operator_screens", 0))
            extra_kiosks = int(addons.get("paper_roll_screens", 0))
            extra_services = int(addons.get("services", 0))

            total_services = service_qty + extra_services
            total_operators = operator_qty + extra_desks
            total_kiosks = kiosk_qty + extra_kiosks
            total_qr = int(addons.get("printed_qr", 0))

            token_delivery_selections = b_cfg.get("token_delivery_selections", [])

            try:
                PricingEngine.calculate_quote(
                    mode=b_mode,
                    service_qty=total_services,
                    operator_qty=total_operators,
                    kiosk_qty=total_kiosks,
                    token_delivery_selections=token_delivery_selections,
                    addons={"printed_qr": total_qr}
                )
            except ValidationError as ve:
                return Response(ve.detail if hasattr(ve, "detail") else {"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate name warning
        duplicate_warning = Company.objects.filter(name=data["company_name"]).exists()
        
        # Check platform setting auto-approve toggle
        auto_approve_setting = PlatformSetting.objects.filter(key="auto_approve_registrations").first()
        auto_approve = auto_approve_setting.value.get("enabled", False) if auto_approve_setting else False
        
        company_status = "active" if auto_approve else "pending"
        
        # Handle logo upload if provided
        logo_url = ""
        logo_file = data.get("logo")
        if logo_file:
            path = default_storage.save(f"logos/{logo_file.name}", logo_file)
            logo_url = f"/media/{path}"
            
        try:
            with transaction.atomic():
                # 1. Create Company
                company = Company.objects.create(
                    name=data["company_name"],
                    slug=data.get("slug") or None,
                    website=data.get("website") or None,
                    industry=data["industry"],
                    contact_email=data["contact_email"],
                    contact_phone=data["contact_phone"],
                    address=data["address"],
                    city=data["city"],
                    logo_url=logo_url,
                    brand_colors={"primary": data.get("brand_primary_color", "#6366F1")},
                    status=company_status,
                    onboarding_status="active",
                    package=data["package"],
                    solution=request.data.get("solution", "ONSITE_ONLINE")
                )

                # Initialize BookingPageConfig for the company with submitted or default portal customization details
                from appointments.models import BookingPageConfig
                portal_color = request.data.get("primary_color") or request.data.get("primaryColor") or data.get("brand_primary_color") or "#7C3AED"
                BookingPageConfig.objects.create(
                    company=company,
                    logo_url=logo_url or request.data.get("logo_url") or request.data.get("logoUrl") or "",
                    portal_name=request.data.get("portal_name") or request.data.get("portalName") or company.name,
                    primary_color=portal_color,
                    display_address=request.data.get("display_address") or request.data.get("displayAddress") or company.address or "",
                    enabled_customer_fields=request.data.get("enabled_customer_fields") or request.data.get("enabledCustomerFields") or ["name", "email", "phone"],
                    enabled_booking_fields=request.data.get("enabled_booking_fields") or request.data.get("enabledBookingFields") or ["date_slot", "message"],
                    enabled_notification_channels=request.data.get("enabled_notification_channels") or request.data.get("enabledNotificationChannels") or ["email"]
                )

                # Create itemized PlanComponent allocations and PlanPurchase
                from billing.models import PlanComponent, CompanyPlanAllocation, PlanPurchase, TokenDeliveryMethod, SubscriptionDurationTier
                from billing.services.pricing_engine import PricingEngine
                from django.core import signing
                
                # Fetch quote_id
                quote_id = request.data.get("quote_id")
                quote_data = None
                if quote_id:
                    try:
                        quote_data = signing.loads(quote_id, max_age=900)
                    except signing.SignatureExpired:
                        raise serializers.ValidationError({"quote_id": ["Registration checkout session expired. Please review your pricing proposal and retry."]})
                    except signing.BadSignature:
                        raise serializers.ValidationError({"quote_id": ["Invalid registration quote signature. Please try again."]})

                # Map branches configurations for PricingEngine
                branches_data = raw_data.get("branches", [])
                company_addons = request.data.get("company_addons", {})
                duration_months = int(request.data.get("duration_months", 1))

                has_online = any(b.get("channel_type") in ["ONLINE_ONLY", "HYBRID"] for b in branches_data)
                has_onsite = any(b.get("channel_type") in ["ONSITE_ONLY", "HYBRID"] for b in branches_data)

                branches_payload = []
                for b_cfg in branches_data:
                    service_qty = int(b_cfg.get("service_qty", b_cfg.get("serviceQty", 0)))
                    operator_qty = int(b_cfg.get("operator_qty", b_cfg.get("operatorQty", 0)))
                    kiosk_qty = int(b_cfg.get("kiosk_qty", b_cfg.get("kioskQty", 0)))
                    token_delivery_selections = b_cfg.get("token_delivery_selections", b_cfg.get("tokenDeliverySelections", []))
                    addons = b_cfg.get("addons", {})
                    extra_desks = int(addons.get("operator_screens", 0))
                    extra_kiosks = int(addons.get("paper_roll_screens", 0))
                    extra_services = int(addons.get("services", 0))

                    total_services = service_qty + extra_services
                    total_operators = operator_qty + extra_desks
                    total_kiosks = kiosk_qty + extra_kiosks
                    total_qr = int(addons.get("printed_qr", 0))

                    branches_payload.append({
                        "mode": b_cfg.get("mode", "NON_SERVICE_BASED"),
                        "channel_type": b_cfg.get("channel_type", "ONSITE_ONLY"),
                        "service_qty": total_services,
                        "operator_qty": total_operators,
                        "kiosk_qty": total_kiosks,
                        "token_delivery_selections": token_delivery_selections,
                        "addons": {"printed_qr": total_qr}
                    })

                # authorative backend quote calculation
                quote_res = PricingEngine.calculate_company_quote(
                    branches=branches_payload,
                    company_addons=company_addons,
                    duration_months=duration_months,
                    online_module_enabled=has_online,
                    onsite_module_enabled=has_onsite
                )

                # Validate signed quote matches recalculated total to prevent client-side tampering
                if quote_id and quote_data:
                    signed_total = quote_data.get("grand_total")
                    recalc_total = float(quote_res["grand_total"])
                    if abs(signed_total - recalc_total) > 0.01:
                        raise serializers.ValidationError({"quote_id": ["Pricing has been updated by administration since your quote was calculated. Please review the new pricing and retry."]})

                # Build allocations & line items
                active_pcs = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
                allocated_qtys = {
                    "branches": len(branches_payload),
                    "online_module": sum(1 for b in branches_payload if b["channel_type"] in ["ONLINE_ONLY", "HYBRID"]) if has_online else 0,
                    "operator_screens": sum(b["operator_qty"] for b in branches_payload) if has_onsite else 0,
                    "services": sum(b["service_qty"] for b in branches_payload) if has_onsite else 0,
                    "paper_roll_screens": sum(b["kiosk_qty"] for b in branches_payload) if has_onsite else 0,
                    "printed_qr": sum(b["addons"]["printed_qr"] for b in branches_payload) if has_onsite else 0,
                }
                
                for key, qty in company_addons.items():
                    allocated_qtys[key] = qty

                line_items = []
                itemized = quote_res["itemized"]

                for key, pc in active_pcs.items():
                    qty = allocated_qtys.get(key, 0)
                    if key not in allocated_qtys:
                        qty = pc.default_included_qty

                    CompanyPlanAllocation.objects.create(
                        company=company,
                        branch=None,
                        plan_component=pc,
                        purchased_qty=qty,
                        unit_price_at_purchase=pc.price_per_unit
                    )

                    sub = float(itemized.get(f"{key}_subtotal", 0.0))
                    if key in ["branches", "online_module", "operator_screens", "services", "paper_roll_screens", "printed_qr"]:
                        line_items.append({
                            "component_key": key,
                            "component_label": pc.label,
                            "quantity": qty,
                            "unit_price": float(pc.price_per_unit),
                            "subtotal": sub
                        })
                    else:
                        qty_addon = company_addons.get(key, 0)
                        if qty_addon > 0:
                            sub_addon = float(PricingEngine._calculate_component_cost(pc, qty_addon))
                            line_items.append({
                                "component_key": key,
                                "component_label": pc.label,
                                "quantity": qty_addon,
                                "unit_price": float(pc.price_per_unit),
                                "subtotal": sub_addon
                            })

                if float(itemized.get("delivery_subtotal", 0.0)) > 0:
                    line_items.append({
                        "component_key": "delivery_methods",
                        "component_label": "Token Delivery Methods",
                        "quantity": 1,
                        "unit_price": float(itemized["delivery_subtotal"]),
                        "subtotal": float(itemized["delivery_subtotal"])
                    })

                total_amount = quote_res["grand_total"]

                PlanPurchase.objects.create(
                    company=company,
                    type="initial_registration",
                    line_items=line_items,
                    total_amount=total_amount,
                    payment_status="paid",
                    payment_reference=f"REG_TXN_{timezone.now().timestamp()}"
                )
                
                # 2. Create Subscription
                Subscription.objects.create(
                    company=company,
                    package=data["package"],
                    billing_cycle=data["billing_cycle"],
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timezone.timedelta(days=30 * duration_months),
                    status=company_status
                )
                
                # 3. Create Admin User
                admin_user = User.objects.create_user(
                    email=data["admin_email"],
                    password=data["admin_password"],
                    first_name=data["admin_first_name"],
                    last_name=data["admin_last_name"],
                    role="company_admin",
                    company=company,
                    phone=data["admin_phone"]
                )

                # 4. Create branches
                from branches.models import Branch
                from queuing.models import QueueMethod
                from billing.models import TokenDeliveryMethod
                
                # Retrieve active delivery methods for mapping
                active_methods = TokenDeliveryMethod.objects.filter(is_active=True)
                method_map = {m.key: m.queue_method_code for m in active_methods if m.queue_method_code}

                branches_data = raw_data.get("branches", [])
                
                if branches_data:
                    first_branch = None
                    for b_cfg in branches_data:
                        b_name = b_cfg.get("name", "Main Branch")
                        b_mode = b_cfg.get("mode", "NON_SERVICE_BASED")
                        channel_type = b_cfg.get("channel_type", "ONSITE_ONLY")
                        br = Branch.objects.create(
                            company=company,
                            name=b_name,
                            slug=b_name.lower().replace(" ", "-"),
                            city=company.city or "Default City",
                            address=company.address or "Default Address",
                            mode=b_mode,
                            channel_type=channel_type,
                            status="active"
                        )
                        if not first_branch:
                            first_branch = br
                        
                        # Set up allocations for this branch
                        service_qty = int(b_cfg.get("service_qty", 0))
                        operator_qty = int(b_cfg.get("operator_qty", 0))
                        kiosk_qty = int(b_cfg.get("kiosk_qty", 0))
                        addons = b_cfg.get("addons", {})
                        extra_desks = int(addons.get("operator_screens", 0))
                        extra_kiosks = int(addons.get("paper_roll_screens", 0))
                        extra_services = int(addons.get("services", 0))

                        total_services = service_qty + extra_services
                        total_operators = operator_qty + extra_desks
                        total_kiosks = kiosk_qty + extra_kiosks
                        total_qr = int(addons.get("printed_qr", 0))

                        if channel_type == "ONLINE_ONLY":
                            if b_mode != "SERVICE_BASED":
                                total_services = 0
                            total_operators = 0
                            total_kiosks = 0
                            total_qr = 0

                        branch_qtys = {
                            "operator_screens": total_operators,
                            "services": total_services,
                            "paper_roll_screens": total_kiosks,
                            "printed_qr": total_qr,
                        }

                        for key, qty in branch_qtys.items():
                            comp = PlanComponent.objects.filter(key=key, is_active=True).first()
                            if comp:
                                CompanyPlanAllocation.objects.create(
                                    company=company,
                                    branch=br,
                                    plan_component=comp,
                                    purchased_qty=qty,
                                    unit_price_at_purchase=comp.price_per_unit
                                )
                        
                        # Sync token delivery methods with QueueMethod
                        token_delivery_selections = b_cfg.get("token_delivery_selections", [])
                        if channel_type == "ONLINE_ONLY":
                            token_delivery_selections = []

                        enabled_methods = {method_map.get(k) for k in token_delivery_selections if k in method_map}
                        if channel_type != "ONLINE_ONLY":
                            enabled_methods.add("2")
                        if channel_type in ["ONLINE_ONLY", "HYBRID"]:
                            enabled_methods.add("4")
                        
                        for m_code, _ in QueueMethod.METHOD_CHOICES:
                            is_enabled = m_code in enabled_methods
                            QueueMethod.objects.create(
                                company=company,
                                branch=br,
                                method=m_code,
                                is_enabled=is_enabled,
                                config={"numbering_style": "prefix"} if m_code == "2" else {}
                            )
                    branch = first_branch
                else:
                    # Fallback to default single branch
                    branch_name = request.data.get("branchName", f"{company.city} Main Branch" if company.city else "Main Branch")
                    branch = Branch.objects.create(
                        company=company,
                        name=branch_name,
                        slug=branch_name.lower().replace(" ", "-"),
                        city=company.city or "Default City",
                        address=company.address or "Default Address",
                        status="active"
                    )

                    # Associate branch-level allocations with the default created branch
                    CompanyPlanAllocation.objects.filter(company=company, branch__isnull=True).exclude(plan_component__key="branches").update(branch=branch)

                    # Enable Method 2 by default in the database
                    QueueMethod.objects.create(
                        branch=branch,
                        company=company,
                        method="2",
                        is_enabled=True,
                        config={"numbering_style": "prefix"}
                    )
                
                # Log audit event
                log_audit(
                    actor=admin_user,
                    company=company,
                    branch=branch,
                    action="company_registered",
                    object_type="Company",
                    object_id=company.id,
                    changes={
                        "company_name": company.name,
                        "status": company.status,
                        "package": company.package.name,
                        "admin_email": admin_user.email
                    }
                )
                
            response_data = {
                "message": "Company registered successfully.",
                "companyId": company.id,
                "branchId": branch.id,
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "status": company.status,
                    "package": company.package.name,
                    "admin_email": admin_user.email
                }
            }
            if duplicate_warning:
                response_data["warning"] = "A company with this name is already registered."
                
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except serializers.ValidationError as ve:
            return Response(ve.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompanyDetailSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    subscription_status = serializers.SerializerMethodField()
    branch_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = "__all__"

    def get_subscription_status(self, obj):
        sub = obj.subscriptions.first()
        return sub.status if sub else "None"

    def get_branch_count(self, obj):
        return obj.branches.count()

from rest_framework.permissions import IsAuthenticated

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanyDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Company.objects.none()
        if self.action == "list" and user.role != "super_admin":
            if hasattr(user, "company") and user.company:
                return Company.objects.filter(id=user.company.id)
            raise PermissionDenied("Only Super Admins can list companies.")
        if user.role == "super_admin":
            qs = Company.objects.all()
            status_filter = self.request.query_params.get("status")
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        if user.company:
            return Company.objects.filter(id=user.company.id)
        return Company.objects.none()

    def partial_update(self, request, *args, **kwargs):
        company = self.get_object()
        action = request.data.get("action")
        
        if not action:
            # Check if user is company_admin of this company or super_admin
            if request.user.role != "super_admin" and (request.user.role != "company_admin" or request.user.company != company):
                return Response({"detail": "You do not have permission to edit this company."}, status=status.HTTP_403_FORBIDDEN)
            return super().partial_update(request, *args, **kwargs)

        if request.user.role != "super_admin":
            return Response({"detail": "Only Super Admins can perform company lifecycle actions."}, status=status.HTTP_403_FORBIDDEN)

        old_status = company.status
        
        try:
            with transaction.atomic():
                if action == "approve":
                    if company.status != "pending":
                        return Response({"error": "Only pending companies can be approved."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "active"
                    company.save()
                    sub = company.subscriptions.first()
                    if sub:
                        sub.status = "active"
                        sub.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_approved",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "active"}
                    )
                    
                elif action == "suspend":
                    if company.status != "active":
                        return Response({"error": "Only active companies can be suspended."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "suspended"
                    company.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_suspended",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "suspended"}
                    )
                    
                elif action == "reactivate":
                    if company.status != "suspended":
                        return Response({"error": "Only suspended companies can be reactivated."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "active"
                    company.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_reactivated",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "active"}
                    )
                    
                elif action == "reject":
                    if company.status != "pending":
                        return Response({"error": "Only pending companies can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
                    company.status = "rejected"
                    company.save()
                    sub = company.subscriptions.first()
                    if sub:
                        sub.status = "rejected"
                        sub.save()
                    log_audit(
                        actor=request.user,
                        company=company,
                        branch=None,
                        action="company_rejected",
                        object_type="Company",
                        object_id=company.id,
                        changes={"old_status": old_status, "new_status": "rejected", "reason": request.data.get("reason", "")}
                    )
                else:
                    return Response({"error": f"Invalid action: {action}"}, status=status.HTTP_400_BAD_REQUEST)
                    
            return Response(CompanyDetailSerializer(company).data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckSlugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        slug = request.query_params.get("slug", "").strip().lower()
        if not slug:
            return Response({"available": False, "error": "Slug parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        import re
        if not re.match(r'^[a-z0-9-]+$', slug):
            return Response({"available": False, "error": "Slug must only contain lowercase alphanumeric characters and hyphens."}, status=status.HTTP_400_BAD_REQUEST)
            
        exists = Company.objects.filter(slug=slug).exists()
        return Response({"available": not exists})

