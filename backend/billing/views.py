import sys
import io
import stripe
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import render
from django.http import HttpResponse, Http404
from decimal import Decimal
from django.db import transaction


from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError

from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from core.permissions import IsSuperAdmin, IsCompanyAdmin
from billing.models import (
    Package, UpgradeRequest, Subscription, Invoice, PlanComponent,
    CompanyPlanAllocation, PlanPurchase, QueueSolutionType,
    TokenDeliveryMethod, SubscriptionDurationTier, PriceChangeLog
)
from billing.serializers import (
    PackageSerializer, UpgradeRequestSerializer, SubscriptionSerializer, InvoiceSerializer,
    PlanComponentSerializer, CompanyPlanAllocationSerializer, PlanPurchaseSerializer,
    QueueSolutionTypeSerializer, TokenDeliveryMethodSerializer,
    SubscriptionDurationTierSerializer, PriceChangeLogSerializer
)
from billing import stripe_helper
from audit.utils import log_audit
from companies.models import Company

class PlanComponentViewSet(viewsets.ModelViewSet):
    queryset = PlanComponent.objects.all()
    serializer_class = PlanComponentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [AllowAny()]

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated and self.request.user.role == "super_admin":
            return PlanComponent.objects.all().order_by("created_at")
        return PlanComponent.objects.filter(is_active=True).order_by("created_at")

    def perform_create(self, serializer):
        serializer.instance._changed_by = self.request.user
        serializer.save()

    def perform_update(self, serializer):
        serializer.instance._changed_by = self.request.user
        serializer.save()

class CompanyPlanAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyPlanAllocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return CompanyPlanAllocation.objects.none()
        if user.role == "super_admin":
            return CompanyPlanAllocation.objects.all()
        if user.company:
            return CompanyPlanAllocation.objects.filter(company=user.company)
        return CompanyPlanAllocation.objects.none()

class PlanPurchaseViewSet(viewsets.ModelViewSet):
    serializer_class = PlanPurchaseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return PlanPurchase.objects.none()
        if user.role == "super_admin":
            return PlanPurchase.objects.all().order_by("-created_at")
        if user.company:
            return PlanPurchase.objects.filter(company=user.company).order_by("-created_at")
        return PlanPurchase.objects.none()

class BuyAddOnView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.company or user.role != "company_admin":
            raise PermissionDenied("Only Company Admins can purchase plan add-ons.")

        component_key = request.data.get("component_key")
        additional_qty = int(request.data.get("quantity", 1))
        simulate_failure = request.data.get("simulate_failure", False)
        branch_id = request.data.get("branch_id")

        is_tdm = False
        tdm = None
        component = None
        try:
            component = PlanComponent.objects.get(key=component_key, is_active=True)
        except PlanComponent.DoesNotExist:
            from billing.models import TokenDeliveryMethod
            try:
                tdm = TokenDeliveryMethod.objects.get(key=component_key, is_active=True)
                is_tdm = True
            except TokenDeliveryMethod.DoesNotExist:
                return Response({"error": "Plan component not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        company = user.company
        unit_price = float(tdm.price_per_branch or 0.00) if is_tdm else float(component.price_per_unit)
        total_amount = unit_price * additional_qty

        # Double-gating payment failure simulation to DEBUG / TESTING mode only
        from django.conf import settings
        is_debug_or_testing = getattr(settings, "DEBUG", False) or getattr(settings, "TESTING", False)

        # Handle simulated failure test path
        if simulate_failure and is_debug_or_testing:
            purchase = PlanPurchase.objects.create(
                company=company,
                type="add_on",
                line_items=[{
                    "component_key": component_key,
                    "component_label": tdm.label if is_tdm else component.label,
                    "quantity": additional_qty,
                    "unit_price": unit_price,
                    "subtotal": total_amount,
                    "branch_id": branch_id
                }],
                total_amount=total_amount,
                payment_status="failed",
                payment_reference=f"FAIL_{timezone.now().timestamp()}"
            )
            return Response({"error": "Payment processing failed. Please retry.", "purchase_id": purchase.id}, status=status.HTTP_400_BAD_REQUEST)

        branch_instance = None
        if branch_id:
            from branches.models import Branch
            try:
                branch_instance = Branch.objects.get(id=branch_id, company=company)
            except Branch.DoesNotExist:
                return Response({"error": "Specified branch not found in your company."}, status=status.HTTP_404_NOT_FOUND)

        if is_tdm:
            from queuing.models import QueueMethod
            with transaction.atomic():
                is_enabled = (additional_qty > 0)
                qm, _ = QueueMethod.objects.update_or_create(
                    branch=branch_instance,
                    method=tdm.queue_method_code,
                    defaults={
                        "is_enabled": is_enabled,
                        "company": company,
                        "config": {"single_queue_enabled": True, "max_daily_tickets": 150}
                    }
                )

                if is_enabled:
                    purchase = PlanPurchase.objects.create(
                        company=company,
                        type="add_on",
                        line_items=[{
                            "component_key": tdm.key,
                            "component_label": tdm.label,
                            "quantity": 1,
                            "unit_price": float(unit_price),
                            "subtotal": float(unit_price),
                            "branch_id": branch_id
                        }],
                        total_amount=Decimal(str(unit_price)),
                        payment_status="paid",
                        payment_reference=f"ADDON_TXN_{timezone.now().timestamp()}"
                    )
                    log_audit(
                        actor=user,
                        company=company,
                        branch=branch_instance,
                        action="add_on_purchased",
                        object_type="QueueMethod",
                        object_id=qm.id,
                        changes={"method": tdm.queue_method_code, "is_enabled": True, "price": float(unit_price)}
                    )
                else:
                    purchase = PlanPurchase.objects.create(
                        company=company,
                        type="add_on",
                        line_items=[{
                            "component_key": tdm.key,
                            "component_label": f"Disable {tdm.label}",
                            "quantity": 1,
                            "unit_price": 0.00,
                            "subtotal": 0.00,
                            "branch_id": branch_id
                        }],
                        total_amount=Decimal("0.00"),
                        payment_status="paid",
                        payment_reference=f"ADDON_TXN_{timezone.now().timestamp()}"
                    )
                    log_audit(
                        actor=user,
                        company=company,
                        branch=branch_instance,
                        action="addon_disabled",
                        object_type="QueueMethod",
                        object_id=qm.id,
                        changes={"method": tdm.queue_method_code, "is_enabled": False}
                    )

            return Response({
                "message": f"Queue method {tdm.label} successfully {'enabled' if is_enabled else 'disabled'} for branch.",
                "purchase": PlanPurchaseSerializer(purchase).data
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            # Update or create allocation
            # For price-locking, check if there is an existing allocation for this company/component
            # either at the branch level or legacy company level.
            alloc = CompanyPlanAllocation.objects.filter(company=company, plan_component=component, branch=branch_instance).first()
            if not alloc:
                alloc = CompanyPlanAllocation.objects.filter(company=company, plan_component=component, branch__isnull=True).first()
            
            unit_price_at_purchase = Decimal(str(alloc.unit_price_at_purchase)) if alloc else Decimal(str(component.price_per_unit))

            allocation, _ = CompanyPlanAllocation.objects.get_or_create(
                company=company,
                branch=branch_instance,
                plan_component=component,
                defaults={"purchased_qty": component.default_included_qty, "unit_price_at_purchase": unit_price_at_purchase}
            )
            allocation.purchased_qty += additional_qty
            allocation.save()

            purchase = PlanPurchase.objects.create(
                company=company,
                type="add_on",
                line_items=[{
                    "component_key": component.key,
                    "component_label": component.label,
                    "quantity": additional_qty,
                    "unit_price": float(unit_price_at_purchase),
                    "subtotal": float(unit_price_at_purchase) * additional_qty,
                    "branch_id": branch_id
                }],
                total_amount=Decimal(str(unit_price_at_purchase)) * additional_qty,
                payment_status="paid",
                payment_reference=f"ADDON_TXN_{timezone.now().timestamp()}"
            )

            log_audit(
                actor=user,
                company=company,
                branch=branch_instance,
                action="add_on_purchased",
                object_type="CompanyPlanAllocation",
                object_id=allocation.id,
                changes={"component": component.key, "added_qty": additional_qty, "new_total": allocation.purchased_qty, "branch_id": branch_id}
            )

        return Response({
            "message": f"Successfully purchased {additional_qty} {component.unit_label}(s)!",
            "allocation": CompanyPlanAllocationSerializer(allocation).data,
            "purchase": PlanPurchaseSerializer(purchase).data
        }, status=status.HTTP_200_OK)

class CompanyBranchesSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.company:
            return Response({"error": "No company associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        company = user.company
        from branches.models import Branch
        from queuing.models import Desk, Service, QrCode
        from display.models import DisplayDevice
        from billing.models import CompanyPlanAllocation, PlanComponent, TokenDeliveryMethod
        
        # Build dynamic token delivery method maps
        active_tdms = TokenDeliveryMethod.objects.filter(is_active=True)
        rev_method_map = {m.queue_method_code: m.key for m in active_tdms if m.queue_method_code}
        
        branches = Branch.objects.filter(company=company, status="active").order_by("created_at")
        active_components = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
        
        result = []
        for br in branches:
            mode = br.mode or "NON_SERVICE_BASED"
            
            branch_allocations = CompanyPlanAllocation.objects.filter(company=company, branch=br)
            alloc_map = {a.plan_component.key: a for a in branch_allocations}
            
            company_allocations = CompanyPlanAllocation.objects.filter(company=company, branch__isnull=True)
            comp_alloc_map = {a.plan_component.key: a for a in company_allocations}
            
            nested_allocations = {}
            for key, pc in active_components.items():
                if key == "branches":
                    continue
                
                alloc = alloc_map.get(key)
                if alloc:
                    purchased = alloc.purchased_qty
                    unit_price = float(alloc.unit_price_at_purchase)
                else:
                    # Legacy fallback: credit all pooled allocation to the first branch
                    comp_alloc = comp_alloc_map.get(key)
                    if comp_alloc:
                        is_first = (br == branches[0])
                        purchased = comp_alloc.purchased_qty if is_first else pc.default_included_qty
                        unit_price = float(comp_alloc.unit_price_at_purchase)
                    else:
                        purchased = pc.default_included_qty
                        unit_price = float(pc.price_per_unit)
                
                used = 0
                if key == "operator_screens":
                    used = Desk.objects.filter(branch=br, is_active=True).count()
                elif key == "services":
                    used = Service.objects.filter(branch=br, is_active=True).count()
                elif key == "paper_roll_screens":
                    used = DisplayDevice.objects.filter(branch=br, layout="kiosk").count()
                elif key == "printed_qr":
                    used = QrCode.objects.filter(branch=br).count()
                elif key == "online_module":
                    used = 1 if br.channel_type in ["HYBRID", "ONLINE_ONLY"] else 0
                elif key == "whatsapp_integration":
                    from queuing.models import QueueMethod
                    used = 1 if QueueMethod.objects.filter(branch=br, method="4", is_enabled=True).exists() else 0
                
                nested_allocations[key] = {
                    "used": used,
                    "limit": purchased,
                    "rate": unit_price,
                    "pricing_type": pc.pricing_type,
                    "label": pc.label,
                    "description": pc.description,
                    "icon_key": pc.icon_key,
                    "unit_label": pc.unit_label,
                    "is_toggle": pc.is_toggle
                }
            
            # Display Devices (signs / screens)
            device_used = DisplayDevice.objects.filter(branch=br).count()
            nested_allocations["display_devices"] = {
                "used": device_used,
                "limit": 999,
                "rate": 0.00,
                "pricing_type": "TOGGLE_FREE",
                "label": "Display Units",
                "description": "Digital signage and display screens paired to this branch.",
                "icon_key": "monitor",
                "unit_label": "device",
                "is_toggle": False
            }
            
            from queuing.models import QueueMethod
            methods = QueueMethod.objects.filter(branch=br)
            token_delivery = [rev_method_map.get(m.method, m.method) for m in methods if m.is_enabled] if methods.exists() else ["SCREEN_ONLY"]
            
            result.append({
                "id": br.id,
                "name": br.name,
                "mode": mode,
                "channel_type": br.channel_type,
                "allocations": nested_allocations,
                "token_delivery": token_delivery
            })
            
        return Response(result, status=status.HTTP_200_OK)

class PackageViewSet(viewsets.ModelViewSet):
    queryset = Package.objects.all()
    serializer_class = PackageSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [IsCompanyAdmin()]

    def perform_create(self, serializer):
        package = serializer.save()
        log_audit(
            actor=self.request.user,
            company=None,
            branch=None,
            action="package_created",
            object_type="Package",
            object_id=package.id,
            changes=serializer.data
        )

    def perform_update(self, serializer):
        old_data = PackageSerializer(serializer.instance).data
        package = serializer.save()
        log_audit(
            actor=self.request.user,
            company=None,
            branch=None,
            action="package_updated",
            object_type="Package",
            object_id=package.id,
            changes={"old": old_data, "new": serializer.data}
        )

    def perform_destroy(self, instance):
        old_data = PackageSerializer(instance).data
        package_id = instance.id
        instance.delete()
        log_audit(
            actor=self.request.user,
            company=None,
            branch=None,
            action="package_deleted",
            object_type="Package",
            object_id=package_id,
            changes=old_data
        )

class UpgradeRequestViewSet(viewsets.ModelViewSet):
    queryset = UpgradeRequest.objects.all()
    serializer_class = UpgradeRequestSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return UpgradeRequest.objects.all().order_by("-created_at")
        return UpgradeRequest.objects.filter(company=user.company).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "company_admin":
            raise PermissionDenied("Only Company Admins can request plan upgrades.")
        
        company = user.company
        if not company:
            raise PermissionDenied("You must be associated with a company to request an upgrade.")

        upgrade = serializer.save(
            company=company,
            requested_by=user,
            status="pending"
        )

        log_audit(
            actor=user,
            company=company,
            branch=None,
            action="upgrade_requested",
            object_type="UpgradeRequest",
            object_id=upgrade.id,
            changes=serializer.data
        )

    def partial_update(self, request, *args, **kwargs):
        upgrade = self.get_object()
        user = request.user
        
        if user.role != "super_admin":
            raise PermissionDenied("Only Super Admins can resolve upgrade requests.")

        act = request.data.get("action")
        if act not in ["approve", "reject"]:
            raise ValidationError("Valid action (approve or reject) is required.")

        if upgrade.status != "pending":
            raise ValidationError("This upgrade request has already been resolved.")

        old_status = upgrade.status
        reason = request.data.get("reason", "")

        try:
            with transaction.atomic():
                if act == "approve":
                    upgrade.status = "approved"
                    upgrade.reviewed_by = user
                    upgrade.reviewed_at = timezone.now()
                    upgrade.save()

                    # Apply limits override
                    company = upgrade.company
                    sub = company.subscriptions.first()
                    if sub:
                        qty = upgrade.details.get("quantity", 1)
                        if upgrade.type == "branch":
                            sub.bonus_branches += int(qty)
                        elif upgrade.type == "user":
                            sub.bonus_users += int(qty)
                        elif upgrade.type == "feature":
                            feature = upgrade.details.get("feature")
                            if feature:
                                sub.feature_overrides[feature] = True
                        sub.save()

                    log_audit(
                        actor=user,
                        company=company,
                        branch=None,
                        action="upgrade_approved",
                        object_type="UpgradeRequest",
                        object_id=upgrade.id,
                        changes={"old_status": old_status, "new_status": "approved", "type": upgrade.type}
                    )
                else:
                    upgrade.status = "rejected"
                    upgrade.reviewed_by = user
                    upgrade.reviewed_at = timezone.now()
                    if reason:
                        upgrade.details["reason"] = reason
                    upgrade.save()

                    log_audit(
                        actor=user,
                        company=upgrade.company,
                        branch=None,
                        action="upgrade_rejected",
                        object_type="UpgradeRequest",
                        object_id=upgrade.id,
                        changes={"old_status": old_status, "new_status": "rejected", "reason": reason}
                    )

            return Response(UpgradeRequestSerializer(upgrade).data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role != "company_admin":
            raise PermissionDenied("Only Company Admins can initiate subscription checkouts.")

        package_id = request.data.get("package_id")
        billing_cycle = request.data.get("billing_cycle")

        if not package_id or billing_cycle not in ["monthly", "yearly"]:
            return Response({"error": "package_id and billing_cycle (monthly/yearly) are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            package = Package.objects.get(id=package_id)
        except Package.DoesNotExist:
            return Response({"error": "Package not found."}, status=status.HTTP_404_NOT_FOUND)

        company = user.company
        if not company:
            return Response({"error": "No company associated with user account."}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create subscription
        subscription = Subscription.objects.filter(company=company).first()
        if not subscription:
            subscription = Subscription.objects.create(
                company=company,
                package=package,
                billing_cycle=billing_cycle,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=14),  # Starts on a mock trial
                status="pending"
            )

        # Build success and cancel redirect URLs pointing back to frontend /app
        host = request.get_host().split(":")[0]
        frontend_origin = request.headers.get("Origin") or f"http://{host}:8080"
        success_url = f"{frontend_origin}/app?billing=success"
        cancel_url = f"{frontend_origin}/app?billing=cancel"

        session_id, checkout_url = stripe_helper.create_checkout_session(
            company=company,
            package=package,
            billing_cycle=billing_cycle,
            success_url=success_url,
            cancel_url=cancel_url
        )

        return Response({
            "session_id": session_id,
            "checkout_url": checkout_url
        }, status=status.HTTP_200_OK)

class StripeSimulatorView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.GET.get("session_id")
        if not session_id:
            raise Http404("Missing session ID.")

        session_data = cache.get(session_id)
        if not session_data:
            raise Http404("Simulated Checkout Session expired or not found.")

        context = {
            "session_id": session_id,
            "company_id": session_data["company_id"],
            "package_id": session_data["package_id"],
            "package_name": session_data["package_name"],
            "billing_cycle": session_data["billing_cycle"],
            "price": session_data["price"],
            "price_cents": int(session_data["price"] * 100),
            "success_url": session_data["success_url"],
            "cancel_url": session_data["cancel_url"],
        }
        return render(request, "stripe_simulator.html", context)

class StripeWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        sig_header = request.headers.get("Stripe-Signature")
        payload = request.body

        # Bypassed only when simulation header is provided and simulation mode is true
        is_sim_signature = sig_header and "mock_signature_for_simulation" in sig_header
        
        if is_sim_signature and stripe_helper.is_simulation_enabled():
            import json
            try:
                event = json.loads(payload.decode("utf-8"))
            except Exception as e:
                return Response({"error": "Invalid simulation payload"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Real signature verification block
            if not sig_header:
                return Response({"error": "Missing Stripe-Signature header"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                event = stripe.Webhook.construct_event(
                    payload.decode("utf-8"), sig_header, getattr(settings, "STRIPE_ENDPOINT_SECRET", "")
                )
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get("type") if isinstance(event, dict) else event.type
        event_data = event.get("data") if isinstance(event, dict) else event.data

        if event_type == "checkout.session.completed":
            session_obj = event_data.get("object") if isinstance(event_data, dict) else event_data.object
            
            # Extract attributes
            session_id = session_obj.get("id")
            company_id = session_obj.get("client_reference_id")
            customer_id = session_obj.get("customer")
            stripe_sub_id = session_obj.get("subscription")
            amount_total = session_obj.get("amount_total")
            metadata = session_obj.get("metadata", {})

            package_id = metadata.get("package_id")
            billing_cycle = metadata.get("billing_cycle", "monthly")

            try:
                company = Company.objects.get(id=company_id)
                package = Package.objects.get(id=package_id)
            except (Company.DoesNotExist, Package.DoesNotExist) as e:
                return Response({"error": f"Failed to match webhook references: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                # Directly update company's package in DB
                company.package = package
                company.save()

                # Fetch or create subscription
                subscription = Subscription.objects.filter(company=company).first()
                if not subscription:
                    subscription = Subscription.objects.create(
                        company=company,
                        package=package,
                        billing_cycle=billing_cycle,
                        start_date=timezone.now().date(),
                        end_date=timezone.now().date() + timedelta(days=30 if billing_cycle == "monthly" else 365),
                        status="active"
                    )
                else:
                    subscription.package = package
                    subscription.billing_cycle = billing_cycle
                    subscription.status = "active"
                    subscription.start_date = timezone.now().date()
                    subscription.end_date = timezone.now().date() + timedelta(days=30 if billing_cycle == "monthly" else 365)
                
                subscription.stripe_customer_id = customer_id
                subscription.stripe_subscription_id = stripe_sub_id
                subscription.trial_end_date = None  # trial ended by paid subscription
                subscription.save()

                # Generate Invoice
                invoice = Invoice.objects.create(
                    company=company,
                    subscription=subscription,
                    amount=amount_total / 100,
                    status="paid",
                    payment_gateway_ref=session_id,
                    issued_at=timezone.now(),
                    paid_at=timezone.now()
                )

                log_audit(
                    actor=None,
                    company=company,
                    branch=None,
                    action="checkout_completed",
                    object_type="Subscription",
                    object_id=subscription.id,
                    changes={"package": package.name, "cycle": billing_cycle}
                )
                log_audit(
                    actor=None,
                    company=company,
                    branch=None,
                    action="invoice_generated",
                    object_type="Invoice",
                    object_id=invoice.id,
                    changes={"amount": float(invoice.amount)}
                )
                log_audit(
                    actor=None,
                    company=company,
                    branch=None,
                    action="subscription_upgraded",
                    object_type="Subscription",
                    object_id=subscription.id,
                    changes={"package": package.name}
                )

        return Response({"received": True}, status=status.HTTP_200_OK)

class StripeSuccessView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return HttpResponse("<h3>Payment Successful! Thank you for subscribing.</h3><p>You can now return to the application dashboard.</p>")

class UsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = user.company
        if not company:
            return Response({"error": "No company associated with user account."}, status=status.HTTP_400_BAD_REQUEST)

        subscription = Subscription.objects.filter(company=company).first()
        if not subscription:
            return Response({"error": "No active subscription found."}, status=status.HTTP_404_NOT_FOUND)

        package = subscription.package
        
        # Calculate limits and counts
        branches_used = company.branches.count()
        # Count all users linked to this company
        from accounts.models import User as AccountUser
        users_used = AccountUser.objects.filter(company=company).count()

        branches_allowed = package.max_branches + subscription.bonus_branches
        users_allowed = package.max_users + subscription.bonus_users

        # Active features (union of package flags + subscription overrides)
        features = dict(package.feature_flags)
        features.update(subscription.feature_overrides)

        return Response({
            "package_name": package.name,
            "billing_cycle": subscription.billing_cycle,
            "status": subscription.status,
            "start_date": subscription.start_date,
            "end_date": subscription.end_date,
            "trial_end_date": subscription.trial_end_date,
            "branches_used": branches_used,
            "branches_allowed": branches_allowed,
            "users_used": users_used,
            "users_allowed": users_allowed,
            "features": features
        }, status=status.HTTP_200_OK)

class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsCompanyAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return Invoice.objects.all().order_by("-issued_at")
        return Invoice.objects.filter(company=user.company).order_by("-issued_at")

class InvoiceDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        user = request.user
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found."}, status=status.HTTP_404_NOT_FOUND)

        # Tenant isolation check
        if user.role != "super_admin" and invoice.company != user.company:
            raise PermissionDenied("You do not have permission to access this invoice.")

        # Build the PDF in memory (shared by both S3 and inline paths)
        pdf_buffer = io.BytesIO()
        self._render_invoice_pdf(pdf_buffer, invoice)
        pdf_bytes = pdf_buffer.getvalue()

        # ── S3 path: upload to S3, return a pre-signed download URL ─────────────
        if getattr(settings, "USE_S3", False):
            s3_key = f"invoices/Invoice_{invoice.id}.pdf"
            try:
                import boto3
                s3 = boto3.client(
                    "s3",
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME,
                    endpoint_url=getattr(settings, "AWS_S3_ENDPOINT_URL", None),
                )
                s3.put_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key,
                    Body=pdf_bytes,
                    ContentType="application/pdf",
                    ContentDisposition=f'attachment; filename="Invoice_{invoice.id}.pdf"',
                )
                expire = getattr(settings, "AWS_QUERYSTRING_EXPIRE", 600)
                presigned_url = s3.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                        "Key": s3_key,
                    },
                    ExpiresIn=expire,
                )
                return Response(
                    {"url": presigned_url, "expires_in": expire},
                    status=status.HTTP_200_OK,
                )
            except Exception as s3_err:
                # Fallback: stream inline if S3 upload fails
                import logging
                logging.getLogger(__name__).error(f"S3 invoice upload failed, streaming inline: {s3_err}")

        # ── Local path: stream PDF directly in the HTTP response ─────────────────
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="Invoice_{invoice.id}.pdf"'
        return response

    @staticmethod
    def _render_invoice_pdf(buffer, invoice):
        """Render the invoice PDF into an open writeable buffer."""
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()

        # Styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#6366f1'),
            spaceAfter=12
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#94a3b8'),
            spaceAfter=20
        )

        story.append(Paragraph("QUESOLE BILLING INVOICE", title_style))
        story.append(Paragraph(f"Invoice Reference: {invoice.payment_gateway_ref or 'N/A'}", subtitle_style))
        story.append(Spacer(1, 10))

        # Invoice details table
        details_data = [
            [Paragraph("<b>Bill To:</b>", styles['Normal']), Paragraph(invoice.company.name, styles['Normal'])],
            [Paragraph("<b>Billing Email:</b>", styles['Normal']), Paragraph(invoice.company.contact_email or "billing@quesole.com", styles['Normal'])],
            [Paragraph("<b>Issue Date:</b>", styles['Normal']), Paragraph(invoice.issued_at.strftime('%d-%m-%Y %H:%M') if invoice.issued_at else "", styles['Normal'])],
            [Paragraph("<b>Status:</b>", styles['Normal']), Paragraph(invoice.status.upper(), styles['Normal'])],
        ]
        t_details = Table(details_data, colWidths=[120, 400])
        t_details.setStyle(TableStyle([
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1e293b')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t_details)
        story.append(Spacer(1, 20))

        # Items Table
        items_data = [
            [Paragraph("<b>Description</b>", styles['Normal']), Paragraph("<b>Cycle</b>", styles['Normal']), Paragraph("<b>Amount</b>", styles['Normal'])],
            [Paragraph(f"Subscription package: {invoice.subscription.package.name}", styles['Normal']), Paragraph(invoice.subscription.billing_cycle.capitalize(), styles['Normal']), Paragraph(f"${invoice.amount:.2f} {invoice.currency}", styles['Normal'])],
            [Paragraph("<b>Total Paid</b>", styles['Normal']), Paragraph("", styles['Normal']), Paragraph(f"<b>${invoice.amount:.2f} {invoice.currency}</b>", styles['Normal'])],
        ]
        t_items = Table(items_data, colWidths=[280, 120, 120])
        t_items.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-2), 0.5, colors.HexColor('#cbd5e1')),
            ('LINEABOVE', (0,-1), (-1,-1), 1, colors.HexColor('#1e293b')),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_items)

        doc.build(story)


class QueueSolutionTypeViewSet(viewsets.ModelViewSet):
    queryset = QueueSolutionType.objects.all().order_by("display_order")
    serializer_class = QueueSolutionTypeSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [AllowAny()]


class TokenDeliveryMethodViewSet(viewsets.ModelViewSet):
    queryset = TokenDeliveryMethod.objects.all().order_by("display_order")
    serializer_class = TokenDeliveryMethodSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [AllowAny()]


class SubscriptionDurationTierViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionDurationTier.objects.all().order_by("display_order")
    serializer_class = SubscriptionDurationTierSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsSuperAdmin()]
        return [AllowAny()]


class PriceChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PriceChangeLog.objects.all().order_by("-changed_at")
    serializer_class = PriceChangeLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]


class BillingConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        st_qs = QueueSolutionType.objects.filter(is_active=True).order_by("display_order")
        pc_qs = PlanComponent.objects.filter(is_active=True).order_by("display_order")
        td_qs = TokenDeliveryMethod.objects.filter(is_active=True).order_by("display_order")
        dt_qs = SubscriptionDurationTier.objects.filter(is_active=True).order_by("display_order")

        components_by_category = {}
        for pc in pc_qs:
            serialized_pc = PlanComponentSerializer(pc).data
            components_by_category.setdefault(pc.category, []).append(serialized_pc)

        config_data = {
            "solution_types": QueueSolutionTypeSerializer(st_qs, many=True).data,
            "components": components_by_category,
            "token_delivery_methods": TokenDeliveryMethodSerializer(td_qs, many=True).data,
            "duration_tiers": SubscriptionDurationTierSerializer(dt_qs, many=True).data,
            "gst_percent": getattr(settings, "GST_PERCENT", 18.0),
        }

        return Response(config_data, status=status.HTTP_200_OK)


class CalculateQuoteView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from billing.services.pricing_engine import PricingEngine

        branches = request.data.get("branches")
        duration_months = int(request.data.get("duration_months", 1))
        company_addons = request.data.get("company_addons", {})
        online_module_enabled = request.data.get("online_module_enabled", True)
        onsite_module_enabled = request.data.get("onsite_module_enabled", True)

        if branches is not None:
            if not isinstance(branches, list):
                raise ValidationError({"branches": ["Branches must be a list."]})

            quote_res = PricingEngine.calculate_company_quote(
                branches=branches,
                company_addons=company_addons,
                duration_months=duration_months,
                online_module_enabled=online_module_enabled,
                onsite_module_enabled=onsite_module_enabled
            )
            return Response(quote_res, status=status.HTTP_200_OK)

        # Fallback to single-branch calculation
        mode = request.data.get("mode")
        service_qty = int(request.data.get("service_qty", 0))
        operator_qty = int(request.data.get("operator_qty", 0))
        kiosk_qty = int(request.data.get("kiosk_qty", 0))
        token_delivery_selections = request.data.get("token_delivery_selections", [])
        addons = request.data.get("addons", {})
        channel_type = request.data.get("channel_type", "ONSITE_ONLY")

        if not mode:
            raise ValidationError({"mode": ["Branch mode is required."]})

        quote = PricingEngine.calculate_quote(
            mode=mode,
            service_qty=service_qty,
            operator_qty=operator_qty,
            kiosk_qty=kiosk_qty,
            token_delivery_selections=token_delivery_selections,
            addons=addons,
            channel_type=channel_type
        )
        return Response(quote, status=status.HTTP_200_OK)


class CheckoutUpgradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from decimal import Decimal
        from django.utils import timezone
        from billing.models import PlanComponent, CompanyPlanAllocation, PlanPurchase, UpgradeRequest
        
        user = request.user
        if not user.company or user.role != "company_admin":
            raise PermissionDenied("Only Company Admins can perform subscription upgrades.")

        company = user.company
        package = company.package
        if not package:
            return Response({"error": "No package associated with your company subscription."}, status=status.HTTP_400_BAD_REQUEST)

        branches = request.data.get("branches")
        duration_months = int(request.data.get("duration_months", 1))
        simulate_failure = request.data.get("simulate_failure", False)
        quote_id = request.data.get("quote_id")

        if not branches or not isinstance(branches, list):
            return Response({"error": "A list of branch configurations is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 0. Validate signed quote if provided
        quote_data = None
        if quote_id:
            from django.core import signing
            try:
                quote_data = signing.loads(quote_id, max_age=900)
            except signing.SignatureExpired:
                return Response({"error": "Upgrade checkout session expired. Please recalculate your proposal and retry."}, status=status.HTTP_400_BAD_REQUEST)
            except signing.BadSignature:
                return Response({"error": "Invalid upgrade quote signature. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce master module enabled checks
        has_online = any(b.get("channel_type") in ["ONLINE_ONLY", "HYBRID"] for b in branches)
        has_onsite = any(b.get("channel_type") in ["ONSITE_ONLY", "HYBRID"] for b in branches)

        branches_payload = []
        for b_cfg in branches:
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

        from billing.services.pricing_engine import PricingEngine
        quote_res = PricingEngine.calculate_company_quote(
            branches=branches_payload,
            company_addons={},
            duration_months=duration_months,
            online_module_enabled=has_online,
            onsite_module_enabled=has_onsite
        )

        if quote_id and quote_data:
            signed_total = quote_data.get("grand_total")
            recalc_total = float(quote_res["grand_total"])
            if abs(signed_total - recalc_total) > 0.01:
                return Response({"error": "Pricing has been updated by administration since your quote was calculated. Please review the new pricing and retry."}, status=status.HTTP_400_BAD_REQUEST)

        new_num_branches = len(branches)

        # 1. Sum up new requested quantities
        new_operator_qty = 0
        new_services_qty = 0
        new_kiosk_qty = 0
        new_qr_qty = 0

        for b in branches:
            mode = b.get("mode")
            service_qty = int(b.get("service_qty", 0))
            operator_qty = int(b.get("operator_qty", 0))
            kiosk_qty = int(b.get("kiosk_qty", 0))
            channel_type = b.get("channel_type", "ONSITE_ONLY")
            addons = b.get("addons", {})
            extra_desks = int(addons.get("operator_screens", 0))
            extra_kiosks = int(addons.get("paper_roll_screens", 0))
            extra_services = int(addons.get("services", 0))

            total_services = service_qty + extra_services
            total_operators = operator_qty + extra_desks
            total_kiosks = kiosk_qty + extra_kiosks
            total_qr = int(addons.get("printed_qr", 0))

            from billing.services.pricing_engine import PricingEngine
            token_delivery_selections = b.get("token_delivery_selections", [])
            PricingEngine.calculate_quote(
                mode=mode,
                service_qty=total_services,
                operator_qty=total_operators,
                kiosk_qty=total_kiosks,
                token_delivery_selections=token_delivery_selections,
                addons={"printed_qr": total_qr},
                channel_type=channel_type
            )

            if channel_type == "ONLINE_ONLY":
                total_services = 0
                total_operators = 0
                total_kiosks = 0
                total_qr = 0

            new_operator_qty += total_operators
            new_services_qty += total_services
            new_kiosk_qty += total_kiosks
            new_qr_qty += total_qr

        # Get current allocations (company-wide, for price-locking lookup and branches count)
        allocations = {a.plan_component.key: a for a in CompanyPlanAllocation.objects.filter(company=company, branch__isnull=True)}
        
        from django.db.models import Sum

        # Helper to get current company-wide quantity
        def get_company_wide_qty(key, default_included):
            alloc = allocations.get(key)
            return alloc.purchased_qty if alloc else default_included

        # Helper to get sum of branch-scoped quantities across all branches
        def get_total_branch_scoped_qty(key, default_included):
            res = CompanyPlanAllocation.objects.filter(company=company, branch__isnull=False, plan_component__key=key).aggregate(total=Sum('purchased_qty'))
            if res['total'] is not None:
                return res['total']
            # Fallback: if no branch-scoped rows exist yet, use the company-level pooled allocation
            comp_alloc = allocations.get(key)
            return comp_alloc.purchased_qty if comp_alloc else default_included

        curr_branches = get_company_wide_qty("branches", 1)
        curr_operators = get_total_branch_scoped_qty("operator_screens", 3)
        curr_services = get_total_branch_scoped_qty("services", 0)
        curr_kiosks = get_total_branch_scoped_qty("paper_roll_screens", 1)
        curr_qr = get_total_branch_scoped_qty("printed_qr", 0)

        # Validate no downgrades
        if new_num_branches < curr_branches:
            raise ValidationError({"branches": [f"Downgrades not allowed. Current purchased branches is {curr_branches}."]})
        if new_operator_qty < curr_operators:
            raise ValidationError({"operator_screens": [f"Downgrades not allowed. Current purchased operator screens is {curr_operators}."]})
        if new_services_qty < curr_services:
            raise ValidationError({"services": [f"Downgrades not allowed. Current purchased service queues is {curr_services}."]})
        if new_kiosk_qty < curr_kiosks:
            raise ValidationError({"paper_roll_screens": [f"Downgrades not allowed. Current purchased kiosks is {curr_kiosks}."]})
        if new_qr_qty < curr_qr:
            raise ValidationError({"printed_qr": [f"Downgrades not allowed. Current purchased printed QR components is {curr_qr}."]})

        # 2. Check Plan Ceilings for Superadmin Approval
        # Exceeding branches ceiling, operator/user ceiling, or kiosk ceiling
        approval_reasons = []
        if new_num_branches > package.max_branches:
            approval_reasons.append(f"Requested branches ({new_num_branches}) exceeds plan-tier ceiling of {package.max_branches}.")
        if new_operator_qty > package.max_users:
            approval_reasons.append(f"Requested operator seats ({new_operator_qty}) exceeds plan-tier ceiling of {package.max_users}.")
        if new_kiosk_qty > package.max_kiosks:
            approval_reasons.append(f"Requested kiosks ({new_kiosk_qty}) exceeds plan-tier ceiling of {package.max_kiosks}.")

        if approval_reasons:
            # Create UpgradeRequest
            if new_num_branches > package.max_branches:
                req_type = "branch"
            elif new_operator_qty > package.max_users:
                req_type = "user"
            else:
                req_type = "feature"
            extra_qty = (new_num_branches - curr_branches) if req_type == "branch" else (new_operator_qty - curr_operators)
            
            upgrade_req = UpgradeRequest.objects.create(
                company=company,
                requested_by=user,
                type=req_type,
                details={
                    "reasons": approval_reasons,
                    "quantity": extra_qty,
                    "branches_requested": new_num_branches,
                    "operators_requested": new_operator_qty,
                    "services_requested": new_services_qty,
                    "kiosks_requested": new_kiosk_qty,
                    "qr_requested": new_qr_qty,
                    "duration_months": duration_months
                },
                status="pending"
            )

            log_audit(
                actor=user,
                company=company,
                branch=None,
                action="upgrade_requested_ceiling_breach",
                object_type="UpgradeRequest",
                object_id=upgrade_req.id,
                changes={"reasons": approval_reasons}
            )

            return Response({
                "status": "approval_required",
                "message": "This request needs superadmin approval as it exceeds your plan-tier ceiling. You will be notified once reviewed.",
                "upgrade_request_id": upgrade_req.id
            }, status=status.HTTP_200_OK)

        # 3. Process Instant Checkout & Allocation update
        active_components = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
        
        # Calculate Delta prices
        delta_items = []
        total_delta_amount = Decimal("0.00")

        components_deltas = {
            "branches": new_num_branches - curr_branches,
            "operator_screens": new_operator_qty - curr_operators,
            "services": new_services_qty - curr_services,
            "paper_roll_screens": new_kiosk_qty - curr_kiosks,
            "printed_qr": new_qr_qty - curr_qr,
        }

        with transaction.atomic():
            from branches.models import Branch
            existing_branches = list(Branch.objects.filter(company=company, status="active").order_by("created_at"))
            
            # Sync Branch models
            branch_objects = []
            for idx, b_cfg in enumerate(branches):
                name = b_cfg.get("name", f"Branch {idx + 1}")
                mode = b_cfg.get("mode", "NON_SERVICE_BASED")
                channel_type = b_cfg.get("channel_type", "ONSITE_ONLY")
                
                if idx < len(existing_branches):
                    br = existing_branches[idx]
                    br.name = name
                    br.mode = mode
                    br.channel_type = channel_type
                    br.save()
                else:
                    slug_base = name.lower().replace(" ", "-")
                    slug = slug_base
                    cnt = 1
                    while Branch.all_objects.filter(company=company, slug=slug).exists():
                        slug = f"{slug_base}-{cnt}"
                        cnt += 1
                    
                    br = Branch.objects.create(
                        company=company,
                        name=name,
                        slug=slug,
                        city=company.city or "Default City",
                        address=company.address or "Default Address",
                        mode=mode,
                        channel_type=channel_type,
                        status="active"
                    )
                branch_objects.append(br)

            # Calculate Delta prices
            for key, delta_qty in components_deltas.items():
                if delta_qty <= 0:
                    continue

                comp = active_components.get(key)
                if not comp:
                    continue

                # Fetch unit price (price locking)
                alloc = allocations.get(key)
                unit_price = Decimal(str(alloc.unit_price_at_purchase)) if alloc else Decimal(str(comp.price_per_unit))
                
                subtotal = Decimal(str(delta_qty)) * unit_price
                total_delta_amount += subtotal

                delta_items.append({
                    "component_key": key,
                    "component_label": comp.label,
                    "quantity": delta_qty,
                    "unit_price": float(unit_price),
                    "subtotal": float(subtotal)
                })

            # Update company-level branches allocation
            branches_comp = active_components.get("branches")
            if branches_comp:
                alloc_obj, _ = CompanyPlanAllocation.objects.get_or_create(
                    company=company,
                    branch=None,
                    plan_component=branches_comp,
                    defaults={"purchased_qty": new_num_branches, "unit_price_at_purchase": branches_comp.price_per_unit}
                )
                alloc_obj.purchased_qty = new_num_branches
                alloc_obj.save()

            # Update allocations per branch
            from billing.models import TokenDeliveryMethod
            active_methods = TokenDeliveryMethod.objects.filter(is_active=True)
            method_map = {m.key: m.queue_method_code for m in active_methods if m.queue_method_code}

            for br, b_cfg in zip(branch_objects, branches):
                mode = b_cfg.get("mode")
                channel_type = b_cfg.get("channel_type", "ONSITE_ONLY")
                br.mode = mode
                br.channel_type = channel_type
                br.save(update_fields=["mode", "channel_type"])
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
                    comp = active_components.get(key)
                    if not comp:
                        continue
                    
                    # Fetch unit price (price locking)
                    alloc = CompanyPlanAllocation.objects.filter(company=company, plan_component=comp, branch=br).first()
                    if not alloc:
                        alloc = CompanyPlanAllocation.objects.filter(company=company, plan_component=comp, branch__isnull=True).first()
                    
                    unit_price = Decimal(str(alloc.unit_price_at_purchase)) if alloc else Decimal(str(comp.price_per_unit))

                    alloc_obj, _ = CompanyPlanAllocation.objects.get_or_create(
                        company=company,
                        branch=br,
                        plan_component=comp,
                        defaults={"purchased_qty": qty, "unit_price_at_purchase": unit_price}
                    )
                    alloc_obj.purchased_qty = qty
                    alloc_obj.save()

                # Sync token delivery methods with QueueMethod
                from queuing.models import QueueMethod
                token_delivery_selections = b_cfg.get("token_delivery_selections", [])
                if channel_type == "ONLINE_ONLY":
                    token_delivery_selections = []

                enabled_methods = {method_map.get(k) for k in token_delivery_selections if k in method_map}
                if channel_type in ["ONLINE_ONLY", "HYBRID"]:
                    enabled_methods.add("4")
                
                for m_code, _ in QueueMethod.METHOD_CHOICES:
                    is_enabled = m_code in enabled_methods
                    QueueMethod.objects.update_or_create(
                        company=company,
                        branch=br,
                        method=m_code,
                        defaults={"is_enabled": is_enabled}
                    )

            # Check if there is a simulated failure
            if simulate_failure and total_delta_amount > 0:
                PlanPurchase.objects.create(
                    company=company,
                    type="add_on",
                    line_items=delta_items,
                    total_amount=total_delta_amount,
                    payment_status="failed",
                    payment_reference=f"FAIL_UPGRADE_{timezone.now().timestamp()}"
                )
                raise ValidationError({"payment": ["Simulated Payment Gateway Authorization Failed. Please check card credentials and retry."]})

            if total_delta_amount > 0:
                purchase = PlanPurchase.objects.create(
                    company=company,
                    type="add_on",
                    line_items=delta_items,
                    total_amount=total_delta_amount,
                    payment_status="paid",
                    payment_reference=f"UPGRADE_TXN_{timezone.now().timestamp()}"
                )

                log_audit(
                    actor=user,
                    company=company,
                    branch=None,
                    action="billing_upgrade_checkout_success",
                    object_type="PlanPurchase",
                    object_id=purchase.id,
                    changes={"total_amount": float(total_delta_amount), "items": delta_items}
                )

        return Response({
            "status": "success",
            "message": "Upgrade completed successfully!",
            "purchased_amount": float(total_delta_amount),
            "line_items": delta_items
        }, status=status.HTTP_200_OK)


@receiver(pre_save, sender=PlanComponent)
def plan_component_pre_save(sender, instance, **kwargs):
    if instance.id:
        try:
            old_instance = PlanComponent.objects.get(id=instance.id)
            if (old_instance.price_per_unit != instance.price_per_unit or
                old_instance.is_mandatory != instance.is_mandatory or
                old_instance.max_qty_per_branch != instance.max_qty_per_branch or
                old_instance.default_included_qty != instance.default_included_qty or
                old_instance.is_active != instance.is_active):
                changed_by = getattr(instance, "_changed_by", None)
                PriceChangeLog.objects.create(
                    plan_component=instance,
                    old_price=old_instance.price_per_unit,
                    new_price=instance.price_per_unit,
                    changed_by=changed_by
                )
        except PlanComponent.DoesNotExist:
            pass


@receiver(post_save, sender=PlanComponent)
@receiver(post_delete, sender=PlanComponent)
@receiver(post_save, sender=QueueSolutionType)
@receiver(post_delete, sender=QueueSolutionType)
@receiver(post_save, sender=TokenDeliveryMethod)
@receiver(post_delete, sender=TokenDeliveryMethod)
@receiver(post_save, sender=SubscriptionDurationTier)
@receiver(post_delete, sender=SubscriptionDurationTier)
def invalidate_billing_config_cache(sender, **kwargs):
    cache.delete("billing:config")

