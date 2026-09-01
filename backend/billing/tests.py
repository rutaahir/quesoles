from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from billing.models import PlanComponent, TokenDeliveryMethod, CompanyPlanAllocation
from billing.services.pricing_engine import PricingEngine

User = get_user_model()

class PricingEngineTests(TestCase):
    def setUp(self):
        # Clear any migrated seeds to ensure clean slate for tests
        PlanComponent.objects.all().delete()
        TokenDeliveryMethod.objects.all().delete()

        # Setup base PlanComponents
        self.services_comp = PlanComponent.objects.create(
            key="services",
            label="Services",
            category="SERVICE",
            branch_mode_scope="SERVICE_BASED",
            pricing_type="PER_UNIT",
            default_included_qty=0,
            price_per_unit=Decimal("800.00"),
            max_qty_per_branch=10
        )
        self.desks_comp = PlanComponent.objects.create(
            key="operator_screens",
            label="Desks",
            category="OPERATOR_DESK",
            branch_mode_scope="BOTH",
            pricing_type="PER_UNIT",
            default_included_qty=3,
            price_per_unit=Decimal("1200.00"),
            max_qty_per_branch=20
        )
        self.kiosks_comp = PlanComponent.objects.create(
            key="paper_roll_screens",
            label="Kiosks",
            category="KIOSK",
            branch_mode_scope="BOTH",
            pricing_type="PER_UNIT",
            default_included_qty=1,
            price_per_unit=Decimal("1500.00"),
            max_qty_per_branch=5
        )
        self.flat_comp = PlanComponent.objects.create(
            key="printed_qr",
            label="Printed QR",
            category="ADDON",
            branch_mode_scope="BOTH",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("990.00"),
            is_toggle=True
        )
        
        self.sms_token = TokenDeliveryMethod.objects.create(
            key="SMS",
            label="SMS Alerts",
            price_per_branch=Decimal("490.00"),
            is_active=True
        )
        self.screen_token = TokenDeliveryMethod.objects.create(
            key="SCREEN_ONLY",
            label="Screen Display",
            price_per_branch=Decimal("0.00"),
            is_active=True
        )

    def test_screen_only_token_delivery(self):
        """
        Regression test: Verify that SCREEN_ONLY token delivery method can be
        calculated correctly with zero price.
        """
        quote = PricingEngine.calculate_quote(
            mode="NON_SERVICE_BASED",
            service_qty=0,
            operator_qty=3,
            kiosk_qty=1,
            token_delivery_selections=["SCREEN_ONLY"],
            addons={}
        )
        screen_item = next(item for item in quote["token_delivery"] if item["key"] == "SCREEN_ONLY")
        self.assertEqual(screen_item["price"], Decimal("0.00"))
        self.assertIn("SCREEN_ONLY", [item["key"] for item in quote["token_delivery"]])

    def test_independent_desk_and_service_calculation(self):
        """
        Verify that in SERVICE_BASED mode, operator screens and services
        are priced independently and not forced as derived.
        """
        quote = PricingEngine.calculate_quote(
            mode="SERVICE_BASED",
            service_qty=5,
            operator_qty=4,
            kiosk_qty=1
        )
        self.assertEqual(quote["operator_qty"], 4)
        self.assertEqual(quote["service_qty"], 5)
        
        # Verify subtotal of operator desks: (4 select - 3 included) * 1200 = 1200
        desk_item = next(item for item in quote["line_items"] if item["key"] == "operator_screens")
        self.assertEqual(desk_item["subtotal"], Decimal("1200.00"))
        
        # Verify subtotal of services: 5 * 800 = 4000
        service_item = next(item for item in quote["line_items"] if item["key"] == "services")
        self.assertEqual(service_item["subtotal"], Decimal("4000.00"))

    def test_max_quantity_rejection(self):
        """
        Verify that exceeding the max quantity limits triggers a ValidationError.
        """
        # Desks max_qty_per_branch is 20. Let's send 25.
        with self.assertRaises(ValidationError) as context:
            PricingEngine.calculate_quote(
                mode="NON_SERVICE_BASED",
                service_qty=0,
                operator_qty=25,
                kiosk_qty=1
            )
        self.assertIn("operator_qty", context.exception.detail)

        # Kiosks max_qty_per_branch is 5. Let's send 6.
        with self.assertRaises(ValidationError) as context:
            PricingEngine.calculate_quote(
                mode="NON_SERVICE_BASED",
                service_qty=0,
                operator_qty=10,
                kiosk_qty=6
            )
        self.assertIn("kiosk_qty", context.exception.detail)

    def test_pricing_types(self):
        """
        Verify that calculations are correct for PER_UNIT, FLAT, and delivery methods.
        """
        # Test FLAT pricing on printed_qr (included in addons)
        # Even if we send quantity 2, FLAT component should only add price_per_unit flat once (990)
        quote = PricingEngine.calculate_quote(
            mode="NON_SERVICE_BASED",
            service_qty=0,
            operator_qty=3,  # 3 included, subtotal 0
            kiosk_qty=1,      # 1 included, subtotal 0
            token_delivery_selections=["SMS"],  # SMS price = 490
            addons={"printed_qr": 2}
        )
        
        # Look for printed_qr
        qr_item = next(item for item in quote["line_items"] if item["key"] == "printed_qr")
        self.assertEqual(qr_item["subtotal"], Decimal("990.00"))
        
        # Look for SMS delivery
        sms_item = next(item for item in quote["token_delivery"] if item["key"] == "SMS")
        self.assertEqual(sms_item["price"], Decimal("490.00"))
        
        # Total should be 0 (desks) + 0 (kiosk) + 990 (qr flat) + 490 (sms) = 1480
        self.assertEqual(quote["total"], Decimal("1480.00"))


class BranchScopedBillingTests(APITestCase):
    def setUp(self):
        from companies.models import Company
        from branches.models import Branch
        from billing.models import PlanComponent, CompanyPlanAllocation, TokenDeliveryMethod
        
        # Cleanup
        PlanComponent.objects.all().delete()
        CompanyPlanAllocation.objects.all().delete()
        TokenDeliveryMethod.objects.all().delete()
        Branch.objects.all().delete()
        Company.objects.all().delete()
        User.objects.all().delete()

        # Seed components
        self.operator_comp = PlanComponent.objects.create(
            key="operator_screens",
            label="Desks",
            pricing_type="PER_UNIT",
            default_included_qty=3,
            price_per_unit=Decimal("1200.00")
        )
        self.services_comp = PlanComponent.objects.create(
            key="services",
            label="Services",
            pricing_type="PER_UNIT",
            default_included_qty=0,
            price_per_unit=Decimal("800.00")
        )
        self.qr_comp = PlanComponent.objects.create(
            key="printed_qr",
            label="Printed QR",
            category="ADDON",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("990.00"),
            is_active=True
        )
        self.kiosks_comp = PlanComponent.objects.create(
            key="paper_roll_screens",
            label="Kiosks",
            category="KIOSK",
            pricing_type="PER_UNIT",
            default_included_qty=1,
            price_per_unit=Decimal("1500.00"),
            is_active=True
        )

        # Seed TokenDeliveryMethods
        self.screen_method = TokenDeliveryMethod.objects.create(
            key="SCREEN_ONLY",
            label="Screen Only",
            price_per_branch=Decimal("0.00"),
            queue_method_code="1",
            is_active=True
        )
        self.sms_method = TokenDeliveryMethod.objects.create(
            key="SMS",
            label="SMS Alerts",
            price_per_branch=Decimal("490.00"),
            queue_method_code="3",
            is_active=True
        )
        self.wa_method = TokenDeliveryMethod.objects.create(
            key="WHATSAPP",
            label="WhatsApp",
            price_per_branch=Decimal("790.00"),
            queue_method_code="4",
            is_active=True
        )

        # Create company
        self.company = Company.objects.create(
            name="Test Corp",
            industry="Healthcare",
            city="Mumbai",
            status="active"
        )
        
        # Create user
        self.user = User.objects.create_user(
            email="admin@testcorp.com",
            password="password123",
            role="company_admin",
            company=self.company
        )
        
        # Create branches
        self.branch1 = Branch.objects.create(
            company=self.company,
            name="Branch Mumbai",
            slug="branch-mumbai",
            mode="NON_SERVICE_BASED",
            status="active"
        )
        self.branch2 = Branch.objects.create(
            company=self.company,
            name="Branch Pune",
            slug="branch-pune",
            mode="SERVICE_BASED",
            status="active"
        )

    def test_company_branches_summary_endpoint(self):
        # Authenticate user
        self.client.force_authenticate(user=self.user)
        
        # Create branch-level allocations
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch1,
            plan_component=self.operator_comp,
            purchased_qty=5,
            unit_price_at_purchase=Decimal("1200.00")
        )
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch2,
            plan_component=self.operator_comp,
            purchased_qty=3,
            unit_price_at_purchase=Decimal("1000.00")  # price locked at 1000
        )

        url = reverse("billing-company-branches-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
        # Verify structure
        data = response.json()
        self.assertEqual(len(data), 2)
        
        b1_data = next(b for b in data if b["id"] == self.branch1.id)
        self.assertEqual(b1_data["name"], "Branch Mumbai")
        self.assertEqual(b1_data["allocations"]["operator_screens"]["limit"], 5)
        self.assertEqual(b1_data["allocations"]["operator_screens"]["rate"], 1200.00)

        b2_data = next(b for b in data if b["id"] == self.branch2.id)
        self.assertEqual(b2_data["name"], "Branch Pune")
        self.assertEqual(b2_data["allocations"]["operator_screens"]["limit"], 3)
        self.assertEqual(b2_data["allocations"]["operator_screens"]["rate"], 1000.00)

    def test_legacy_company_pooled_fallback(self):
        # Create legacy company allocation (branch=None)
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=None,
            plan_component=self.operator_comp,
            purchased_qty=10,
            unit_price_at_purchase=Decimal("1200.00")
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse("billing-company-branches-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Fallback credits all pooled quantity to the first branch
        b1_data = next(b for b in data if b["id"] == self.branch1.id)
        self.assertEqual(b1_data["allocations"]["operator_screens"]["limit"], 10)
        
        # Second branch gets default included quantity fallback
        b2_data = next(b for b in data if b["id"] == self.branch2.id)
        self.assertEqual(b2_data["allocations"]["operator_screens"]["limit"], 3)

    def test_buy_addon_branch_scoping(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("billing-buy-addon")
        
        # Buy addon for branch 1
        payload = {
            "component_key": "operator_screens",
            "quantity": 2,
            "branch_id": self.branch1.id
        }
        
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        # Verify allocation created and scoped to branch 1
        alloc = CompanyPlanAllocation.objects.filter(company=self.company, branch=self.branch1, plan_component=self.operator_comp).first()
        self.assertIsNotNone(alloc)
        self.assertEqual(alloc.purchased_qty, 5) # 3 default included + 2 purchased
        
        # Verify PlanPurchase history created
        from billing.models import PlanPurchase
        purchase = PlanPurchase.objects.filter(company=self.company, type="add_on").first()
        self.assertIsNotNone(purchase)
        self.assertEqual(purchase.payment_status, "paid")
        self.assertEqual(purchase.line_items[0]["branch_id"], self.branch1.id)

    def test_buy_addon_token_delivery_method(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("billing-buy-addon")
        
        # Enable WhatsApp via buy-addon
        payload = {
            "component_key": "WHATSAPP",
            "quantity": 1,
            "branch_id": self.branch1.id
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        # Verify QueueMethod created/updated and is_enabled is True
        from queuing.models import QueueMethod
        qm = QueueMethod.objects.filter(branch=self.branch1, method="4").first()
        self.assertIsNotNone(qm)
        self.assertTrue(qm.is_enabled)
        
        # Verify PlanPurchase history created with correct price
        from billing.models import PlanPurchase
        purchase = PlanPurchase.objects.filter(company=self.company, type="add_on", line_items__0__component_key="WHATSAPP").first()
        self.assertIsNotNone(purchase)
        self.assertEqual(purchase.total_amount, Decimal("790.00"))

        # Now Disable WhatsApp via buy-addon (quantity 0)
        payload = {
            "component_key": "WHATSAPP",
            "quantity": 0,
            "branch_id": self.branch1.id
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        # Verify QueueMethod is_enabled is False
        qm.refresh_from_db()
        self.assertFalse(qm.is_enabled)

    def test_printed_qr_addon_quote_success(self):
        url = reverse("billing-calculate-quote")
        payload = {
            "duration_months": 1,
            "branches": [
                {
                    "mode": "SERVICE_BASED",
                    "service_qty": 3,
                    "operator_qty": 3,
                    "kiosk_qty": 1,
                    "token_delivery_selections": ["SMS"],
                    "addons": {
                        "printed_qr": 1
                    }
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["branches_count"], 1)
        # 3 services * 800 = 2400 + 490 (SMS) + 990 (Printed QR Flat) = 3880
        self.assertEqual(float(data["total"]), 3880.00)
        
    def test_token_delivery_sync_roundtrip(self):
        self.client.force_authenticate(user=self.user)
        
        from billing.models import Package
        package = Package.objects.create(
            name="Unlimited Enterprise",
            max_branches=10,
            max_users=50,
            max_kiosks=10,
            price_monthly=Decimal("5000.00"),
            price_yearly=Decimal("50000.00")
        )
        self.company.package = package
        self.company.save()

        url_upgrade = reverse("billing-checkout-upgrade")
        payload = {
            "duration_months": 1,
            "branches": [
                {
                    "name": "Branch Mumbai",
                    "mode": "NON_SERVICE_BASED",
                    "service_qty": 0,
                    "operator_qty": 3,
                    "kiosk_qty": 1,
                    "token_delivery_selections": ["SMS", "WHATSAPP"],
                    "addons": {}
                },
                {
                    "name": "Branch Pune",
                    "mode": "SERVICE_BASED",
                    "service_qty": 3,
                    "operator_qty": 0,
                    "kiosk_qty": 1,
                    "token_delivery_selections": ["SCREEN_ONLY"],
                    "addons": {}
                }
            ]
        }
        
        response = self.client.post(url_upgrade, payload, format="json")
        self.assertEqual(response.status_code, 200)

        # Check QueueMethod DB sync
        from queuing.models import QueueMethod
        sms_qm = QueueMethod.objects.filter(branch=self.branch1, method="3").first()
        self.assertIsNotNone(sms_qm)
        self.assertTrue(sms_qm.is_enabled)
        
        wa_qm = QueueMethod.objects.filter(branch=self.branch1, method="4").first()
        self.assertIsNotNone(wa_qm)
        self.assertTrue(wa_qm.is_enabled)

        # Call branches-summary and confirm returned keys map back to string keys
        url_summary = reverse("billing-company-branches-summary")
        summary_resp = self.client.get(url_summary)
        self.assertEqual(summary_resp.status_code, 200)
        
        data = summary_resp.json()
        b1_data = next(b for b in data if b["id"] == self.branch1.id)
        self.assertIn("SMS", b1_data["token_delivery"])
        self.assertIn("WHATSAPP", b1_data["token_delivery"])


class CentralizedCompanyPricingTests(TestCase):
    def setUp(self):
        from billing.models import PlanComponent, TokenDeliveryMethod, SubscriptionDurationTier
        PlanComponent.objects.all().delete()
        TokenDeliveryMethod.objects.all().delete()
        SubscriptionDurationTier.objects.all().delete()

        # Setup standard components
        self.branches_comp = PlanComponent.objects.create(
            key="branches",
            label="Branches Setup",
            category="BRANCH_SETUP",
            pricing_type="PER_UNIT",
            default_included_qty=1,
            price_per_unit=Decimal("0.00"),
            is_recurring=False
        )
        self.services_comp = PlanComponent.objects.create(
            key="services",
            label="Services",
            category="SERVICE",
            pricing_type="PER_UNIT",
            default_included_qty=0,
            price_per_unit=Decimal("800.00"),
            is_recurring=True
        )
        self.desks_comp = PlanComponent.objects.create(
            key="operator_screens",
            label="Desks",
            category="OPERATOR_DESK",
            pricing_type="PER_UNIT",
            default_included_qty=3,
            price_per_unit=Decimal("1200.00"),
            is_recurring=True
        )
        self.kiosks_comp = PlanComponent.objects.create(
            key="paper_roll_screens",
            label="Kiosks",
            category="KIOSK",
            pricing_type="PER_UNIT",
            default_included_qty=1,
            price_per_unit=Decimal("1500.00"),
            is_recurring=True
        )
        self.online_comp = PlanComponent.objects.create(
            key="online_module",
            label="Online Booking",
            category="SOLUTION_TYPE",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("5000.00"),
            is_recurring=True
        )
        self.printed_qr = PlanComponent.objects.create(
            key="printed_qr",
            label="Printed QR Poster",
            category="ADDON",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("990.00"),
            is_recurring=True
        )
        # Company addon flat recurring
        self.sms_pack = PlanComponent.objects.create(
            key="sms_pack",
            label="SMS Pack",
            category="ADDON",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("1000.00"),
            is_recurring=True
        )
        # Company addon flat setup / one-time
        self.custom_domain = PlanComponent.objects.create(
            key="custom_domain",
            label="Custom Domain",
            category="ADDON",
            pricing_type="FLAT",
            default_included_qty=0,
            price_per_unit=Decimal("2000.00"),
            is_recurring=False
        )
        
        # Token delivery
        self.sms_token = TokenDeliveryMethod.objects.create(
            key="SMS",
            label="SMS Alerts",
            price_per_branch=Decimal("490.00"),
            is_active=True
        )
        
        # Duration tiers
        SubscriptionDurationTier.objects.create(months=1, discount_percent=0, is_active=True)
        SubscriptionDurationTier.objects.create(months=3, discount_percent=5, is_active=True)
        SubscriptionDurationTier.objects.create(months=6, discount_percent=10, is_active=True)
        SubscriptionDurationTier.objects.create(months=12, discount_percent=20, is_active=True)

    def test_pricing_matrix_scenarios(self):
        # 1. Fresh signup / zero-state (both modules disabled)
        quote = PricingEngine.calculate_company_quote(
            branches=[],
            company_addons={},
            duration_months=1,
            online_module_enabled=False,
            onsite_module_enabled=False
        )
        self.assertEqual(quote["grand_total"], Decimal("0.00"))

        # 2. 1 branch with no paid features enabled (master modules disabled) -> 0
        quote = PricingEngine.calculate_company_quote(
            branches=[{
                "mode": "NON_SERVICE_BASED",
                "channel_type": "ONSITE_ONLY",
                "service_qty": 0,
                "operator_qty": 3,
                "kiosk_qty": 1,
                "token_delivery_selections": [],
                "addons": {}
            }],
            company_addons={},
            duration_months=1,
            online_module_enabled=False,
            onsite_module_enabled=False
        )
        self.assertEqual(quote["grand_total"], Decimal("0.00"))

        # 3. 1 branch with onsite enabled, default quantities (operator=3, kiosk=1) -> 0
        quote = PricingEngine.calculate_company_quote(
            branches=[{
                "mode": "NON_SERVICE_BASED",
                "channel_type": "ONSITE_ONLY",
                "service_qty": 0,
                "operator_qty": 3,
                "kiosk_qty": 1,
                "token_delivery_selections": [],
                "addons": {}
            }],
            company_addons={},
            duration_months=1,
            online_module_enabled=False,
            onsite_module_enabled=True
        )
        self.assertEqual(quote["grand_total"], Decimal("0.00"))

        # 4. One per-unit extra resource: operator=4 (3 included, 1 extra) -> 1 * 1200 = 1200
        quote = PricingEngine.calculate_company_quote(
            branches=[{
                "mode": "NON_SERVICE_BASED",
                "channel_type": "ONSITE_ONLY",
                "service_qty": 0,
                "operator_qty": 4,
                "kiosk_qty": 1,
                "token_delivery_selections": [],
                "addons": {}
            }],
            company_addons={},
            duration_months=1,
            online_module_enabled=False,
            onsite_module_enabled=True
        )
        self.assertEqual(quote["itemized"]["operators_subtotal"], Decimal("1200.00"))

        # 5. Flat addon: printed_qr = 1 -> 990
        quote = PricingEngine.calculate_company_quote(
            branches=[{
                "mode": "NON_SERVICE_BASED",
                "channel_type": "ONSITE_ONLY",
                "service_qty": 0,
                "operator_qty": 3,
                "kiosk_qty": 1,
                "token_delivery_selections": [],
                "addons": {"printed_qr": 1}
            }],
            company_addons={},
            duration_months=1,
            online_module_enabled=False,
            onsite_module_enabled=True
        )
        self.assertEqual(quote["itemized"]["qr_subtotal"], Decimal("990.00"))

        # 6. One-time setup charge (custom_domain = 2000 flat one-time) + Recurring addon (sms_pack = 1000/mo flat)
        # For 3 months:
        # custom_domain (one-time) -> 2000
        # sms_pack (recurring) -> 1000 * 3 = 3000
        # total subtotal before discount = 5000
        # discount 5% = 250 -> 4750
        # GST 18% of 4750 = 855 -> grand total = 5605
        quote = PricingEngine.calculate_company_quote(
            branches=[],
            company_addons={"custom_domain": 1, "sms_pack": 1},
            duration_months=3,
            online_module_enabled=False,
            onsite_module_enabled=False
        )
        self.assertEqual(quote["raw_total"], Decimal("3000.00"))
        self.assertEqual(quote["total"], Decimal("4750.00"))
        self.assertEqual(quote["grand_total"], Decimal("5605.00"))

        # 7. Signature verification test
        from django.core import signing
        quote_id = quote["quote_id"]
        quote_data = signing.loads(quote_id)
        self.assertEqual(quote_data["grand_total"], 5605.00)

