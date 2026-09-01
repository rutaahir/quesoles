from decimal import Decimal
from rest_framework.exceptions import ValidationError
from billing.models import PlanComponent, TokenDeliveryMethod


class PricingEngine:
    @staticmethod
    def calculate_quote(mode, service_qty=0, operator_qty=0, kiosk_qty=0, token_delivery_selections=None, addons=None, channel_type="ONSITE_ONLY"):
        """
        Calculates the itemized quote for a branch configuration.
        Inputs:
            - mode: "SERVICE_BASED" or "NON_SERVICE_BASED"
            - service_qty: Int
            - operator_qty: Int (Derived if mode is SERVICE_BASED)
            - kiosk_qty: Int
            - token_delivery_selections: List of token delivery method keys
            - addons: Dict of { component_key: quantity }
            - channel_type: "ONSITE_ONLY" | "ONLINE_ONLY" | "HYBRID"
        """
        if token_delivery_selections is None:
            token_delivery_selections = []
        if addons is None:
            addons = {}

        if channel_type == "ONLINE_ONLY":
            operator_qty = 0
            kiosk_qty = 0
            token_delivery_selections = []
            addons = {}

        errors = {}

        # 2. Fetch components and validation boundaries
        active_components = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
        
        # Helper to retrieve active components of specific categories
        services_comp = active_components.get("services")
        desks_comp = active_components.get("operator_screens")
        kiosk_comp = active_components.get("paper_roll_screens")

        # Check limits & calculate line items
        line_items = []
        total = Decimal("0.00")

        # A. Services limit and calculation
        if mode == "SERVICE_BASED" and services_comp:
            if getattr(services_comp, "is_mandatory", False) and service_qty <= 0:
                errors["service_qty"] = [f"{services_comp.label} are required — please allocate at least 1 per branch."]
            elif services_comp.max_qty_per_branch is not None and service_qty > services_comp.max_qty_per_branch:
                errors["service_qty"] = [f"Exceeds maximum services limit of {services_comp.max_qty_per_branch} per branch."]
            
            subtotal = PricingEngine._calculate_component_cost(services_comp, service_qty)
            line_items.append(PricingEngine._make_line_item(services_comp, service_qty, subtotal))
            total += subtotal

        # B. Operator desks limit and calculation
        if desks_comp and channel_type != "ONLINE_ONLY":
            if getattr(desks_comp, "is_mandatory", False) and operator_qty <= 0:
                errors["operator_qty"] = [f"{desks_comp.label} are required — please allocate at least 1 per branch."]
            elif desks_comp.max_qty_per_branch is not None and operator_qty > desks_comp.max_qty_per_branch:
                errors["operator_qty"] = [f"Exceeds maximum operator seats limit of {desks_comp.max_qty_per_branch} per branch."]

            subtotal = PricingEngine._calculate_component_cost(desks_comp, operator_qty)
            line_items.append(PricingEngine._make_line_item(desks_comp, operator_qty, subtotal))
            total += subtotal

        # C. Kiosks limit and calculation
        if kiosk_comp and channel_type != "ONLINE_ONLY":
            if getattr(kiosk_comp, "is_mandatory", False) and kiosk_qty <= 0:
                errors["kiosk_qty"] = [f"{kiosk_comp.label} are required — please allocate at least 1 per branch."]
            elif kiosk_comp.max_qty_per_branch is not None and kiosk_qty > kiosk_comp.max_qty_per_branch:
                errors["kiosk_qty"] = [f"Exceeds maximum kiosks limit of {kiosk_comp.max_qty_per_branch} per branch."]

            subtotal = PricingEngine._calculate_component_cost(kiosk_comp, kiosk_qty)
            line_items.append(PricingEngine._make_line_item(kiosk_comp, kiosk_qty, subtotal))
            total += subtotal

        # D. Addons limits and calculations
        for addon_key, qty in addons.items():
            comp = active_components.get(addon_key)
            if not comp or comp.category != "ADDON":
                errors[f"addons.{addon_key}"] = ["Invalid or inactive addon component."]
                continue

            if comp.max_qty_per_branch is not None and qty > comp.max_qty_per_branch:
                errors[f"addons.{addon_key}"] = [f"Exceeds maximum limit of {comp.max_qty_per_branch} per branch."]

            subtotal = PricingEngine._calculate_component_cost(comp, qty)
            line_items.append(PricingEngine._make_line_item(comp, qty, subtotal))
            total += subtotal

        # E. Online Module calculation
        online_module_comp = active_components.get("online_module")
        if channel_type in ["ONLINE_ONLY", "HYBRID"] and online_module_comp:
            subtotal = PricingEngine._calculate_component_cost(online_module_comp, 1)
            line_items.append(PricingEngine._make_line_item(online_module_comp, 1, subtotal))
            total += subtotal

        # Raise validation errors if any constraints were breached
        if errors:
            raise ValidationError(errors)

        # 3. Token Delivery selections
        delivery_items = []
        for key in token_delivery_selections:
            try:
                tdm = TokenDeliveryMethod.objects.get(key=key, is_active=True)
                price = tdm.price_per_branch or Decimal("0.00")
                delivery_items.append({
                    "key": tdm.key,
                    "label": tdm.label,
                    "price": price,
                    "requires_hardware": tdm.requires_hardware
                })
                total += price
            except TokenDeliveryMethod.DoesNotExist:
                raise ValidationError({"token_delivery": [f"Token delivery method '{key}' not found or inactive."]})

        return {
            "status": "success",
            "mode": mode,
            "service_qty": service_qty,
            "operator_qty": operator_qty,
            "kiosk_qty": kiosk_qty,
            "line_items": line_items,
            "token_delivery": delivery_items,
            "total": total
        }

    @staticmethod
    def _calculate_component_cost(component, qty):
        """
        Runs calculations based on pricing_type: PER_UNIT, FLAT, TOGGLE_FREE, TOGGLE_PAID
        """
        p_type = component.pricing_type
        price = Decimal(str(component.price_per_unit))

        if p_type == "PER_UNIT":
            extra_qty = max(0, qty - component.default_included_qty)
            return Decimal(extra_qty) * price
        elif p_type == "FLAT":
            return price if qty > 0 else Decimal("0.00")
        elif p_type == "TOGGLE_PAID":
            return price if qty > 0 else Decimal("0.00")
        elif p_type == "TOGGLE_FREE":
            return Decimal("0.00")
        
        return Decimal("0.00")

    @staticmethod
    def _make_line_item(component, qty, subtotal):
        return {
            "key": component.key,
            "label": component.label,
            "quantity": qty,
            "included": component.default_included_qty,
            "extra_qty": max(0, qty - component.default_included_qty) if component.pricing_type == "PER_UNIT" else 0,
            "price_per_unit": component.price_per_unit,
            "pricing_type": component.pricing_type,
            "subtotal": subtotal
        }

    @staticmethod
    def calculate_company_quote(branches, company_addons=None, duration_months=1, online_module_enabled=True, onsite_module_enabled=True):
        from decimal import Decimal
        from django.conf import settings
        from django.utils import timezone
        from django.core import signing
        from billing.models import PlanComponent, SubscriptionDurationTier

        if company_addons is None:
            company_addons = {}

        num_branches = len(branches)
        active_pcs = {pc.key: pc for pc in PlanComponent.objects.filter(is_active=True)}
        
        # 1. Base branch setup cost (treated as recurring or one-time based on PC configuration)
        branch_comp = active_pcs.get("branches")
        branches_subtotal = Decimal("0.00")
        if branch_comp:
            branches_subtotal = PricingEngine._calculate_component_cost(branch_comp, num_branches)

        operators_subtotal = Decimal("0.00")
        services_subtotal = Decimal("0.00")
        kiosks_subtotal = Decimal("0.00")
        qr_subtotal = Decimal("0.00")
        delivery_subtotal = Decimal("0.00")
        online_subtotal = Decimal("0.00")
        branch_quotes = []

        # If both modules are disabled, treat as zero-state
        effective_onsite = onsite_module_enabled
        effective_online = online_module_enabled
        if not effective_onsite and not effective_online:
            num_branches = 0
            branches_subtotal = Decimal("0.00")

        # 2. Iterate through branches to calculate branch-level quotes
        for index, b in enumerate(branches):
            if not effective_onsite and not effective_online:
                continue

            mode = b.get("mode", "NON_SERVICE_BASED")
            channel_type = b.get("channel_type", "ONSITE_ONLY")

            # Override channel type based on master toggles
            if not effective_online:
                if channel_type == "ONLINE_ONLY":
                    channel_type = "ONSITE_ONLY"
                elif channel_type == "HYBRID":
                    channel_type = "ONSITE_ONLY"
            if not effective_onsite:
                if channel_type == "ONSITE_ONLY":
                    channel_type = "ONLINE_ONLY"
                elif channel_type == "HYBRID":
                    channel_type = "ONLINE_ONLY"

            service_qty = int(b.get("service_qty", 0)) if effective_onsite else 0
            operator_qty = int(b.get("operator_qty", 0)) if effective_onsite else 0
            kiosk_qty = int(b.get("kiosk_qty", 0)) if effective_onsite else 0
            token_delivery_selections = b.get("token_delivery_selections", []) if effective_onsite else []
            addons = b.get("addons", {}) if effective_onsite else {}

            quote = PricingEngine.calculate_quote(
                mode=mode,
                service_qty=service_qty,
                operator_qty=operator_qty,
                kiosk_qty=kiosk_qty,
                token_delivery_selections=token_delivery_selections,
                addons=addons,
                channel_type=channel_type
            )
            branch_quotes.append(quote)

            # Sum up component totals
            for item in quote.get("line_items", []):
                key = item["key"]
                sub = Decimal(str(item["subtotal"]))
                if key == "operator_screens":
                    operators_subtotal += sub
                elif key == "services":
                    services_subtotal += sub
                elif key == "paper_roll_screens":
                    kiosks_subtotal += sub
                elif key == "printed_qr":
                    qr_subtotal += sub
                elif key == "online_module":
                    online_subtotal += sub

            for delivery in quote.get("token_delivery", []):
                delivery_subtotal += Decimal(str(delivery["price"]))

        # 3. Global / company-wide addons
        other_features_subtotal = Decimal("0.00")
        for addon_key, qty in company_addons.items():
            if qty > 0:
                comp = active_pcs.get(addon_key)
                if comp:
                    sub = PricingEngine._calculate_component_cost(comp, qty)
                    other_features_subtotal += sub

        # 4. Resolve billing basis (multiplication rules for recurring vs one-time/flat)
        # We need to sum up recurring subtotal vs one-time subtotal
        recurring_subtotal = Decimal("0.00")
        one_time_subtotal = Decimal("0.00")

        # helper to split subtotal by component key's is_recurring
        def add_to_billing_basis(key, amount):
            pc = active_pcs.get(key)
            if pc and not getattr(pc, "is_recurring", True):
                nonlocal one_time_subtotal
                one_time_subtotal += amount
            else:
                nonlocal recurring_subtotal
                recurring_subtotal += amount

        add_to_billing_basis("branches", branches_subtotal)
        add_to_billing_basis("online_module", online_subtotal)
        add_to_billing_basis("operator_screens", operators_subtotal)
        add_to_billing_basis("services", services_subtotal)
        add_to_billing_basis("paper_roll_screens", kiosks_subtotal)
        add_to_billing_basis("printed_qr", qr_subtotal)
        
        # delivery methods are recurring
        recurring_subtotal += delivery_subtotal

        # company wide addons
        for addon_key, qty in company_addons.items():
            if qty > 0:
                comp = active_pcs.get(addon_key)
                if comp:
                    sub = PricingEngine._calculate_component_cost(comp, qty)
                    if not getattr(comp, "is_recurring", True):
                        one_time_subtotal += sub
                    else:
                        recurring_subtotal += sub

        # Base subtotal (monthly base)
        raw_total = recurring_subtotal + one_time_subtotal

        # Apply term multiplication to recurring charges only
        term_recurring = recurring_subtotal * Decimal(str(duration_months))
        term_subtotal = term_recurring + one_time_subtotal

        # 5. Get duration discount (applies to term subtotal or recurring only? Usually term subtotal)
        discount_percent = 0
        duration_tier = SubscriptionDurationTier.objects.filter(months=duration_months, is_active=True).first()
        if duration_tier:
            discount_percent = duration_tier.discount_percent

        discount_amount = term_subtotal * Decimal(str(discount_percent)) / Decimal("100.00")
        total = term_subtotal - discount_amount

        # 6. GST calculations
        gst_percent = Decimal(str(getattr(settings, "GST_PERCENT", 18.0)))
        gst_amount = total * gst_percent / Decimal("100.00")
        grand_total = total + gst_amount

        # Helper to quantize Decimal to 2 places
        def q(val):
            return val.quantize(Decimal("0.01"))

        # 7. Generate secure signed quote signature token (quote_id)
        quote_data = {
            "duration_months": duration_months,
            "branches_count": num_branches,
            "raw_total": float(q(raw_total)),
            "discount_percent": discount_percent,
            "discount_amount": float(q(discount_amount)),
            "total": float(q(total)),
            "gst_percent": float(q(gst_percent)),
            "gst_amount": float(q(gst_amount)),
            "grand_total": float(q(grand_total)),
            "timestamp": timezone.now().timestamp(),
            "online_module_enabled": online_module_enabled,
            "onsite_module_enabled": onsite_module_enabled,
        }
        quote_id = signing.dumps(quote_data)

        return {
            "status": "success",
            "quote_id": quote_id,
            "branches_count": num_branches,
            "duration_months": duration_months,
            "discount_percent": discount_percent,
            "itemized": {
                "branches_subtotal": q(branches_subtotal),
                "operators_subtotal": q(operators_subtotal),
                "services_subtotal": q(services_subtotal),
                "kiosks_subtotal": q(kiosks_subtotal),
                "qr_subtotal": q(qr_subtotal),
                "delivery_subtotal": q(delivery_subtotal),
                "online_subtotal": q(online_subtotal),
                "other_features_subtotal": q(other_features_subtotal),
            },
            "raw_total": q(raw_total),
            "discount_amount": q(discount_amount),
            "total": q(total),
            "gst_percent": q(gst_percent),
            "gst_amount": q(gst_amount),
            "grand_total": q(grand_total),
            "branch_quotes": branch_quotes
        }
