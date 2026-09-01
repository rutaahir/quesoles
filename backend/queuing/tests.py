from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from companies.models import Company
from branches.models import Branch
from queuing.models import Service

User = get_user_model()

class ServiceValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            status="active"
        )
        self.branch_service = Branch.objects.create(
            company=self.company,
            name="Service Branch",
            slug="service-branch",
            mode="SERVICE_BASED"
        )
        self.branch_non_service = Branch.objects.create(
            company=self.company,
            name="Non-Service Branch",
            slug="non-service-branch",
            mode="NON_SERVICE_BASED"
        )
        self.user = User.objects.create_user(
            email="testadmin@test.com",
            password="admin123",
            role="company_admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)

    def test_cannot_create_service_on_non_service_based_branch(self):
        response = self.client.post("/api/services/", {
            "name": "General Checkup",
            "prefix": "A",
            "branch": self.branch_non_service.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot create services on a non-service-based branch.", str(response.data))

    def test_can_create_service_on_service_based_branch(self):
        from billing.models import PlanComponent, CompanyPlanAllocation
        from decimal import Decimal
        comp, _ = PlanComponent.objects.get_or_create(
            key="services",
            defaults={
                "label": "Services",
                "category": "SERVICE",
                "pricing_type": "PER_UNIT",
                "default_included_qty": 0,
                "price_per_unit": Decimal("10.00")
            }
        )
        CompanyPlanAllocation.objects.create(
            company=self.company,
            branch=self.branch_service,
            plan_component=comp,
            purchased_qty=3
        )
        response = self.client.post("/api/services/", {
            "name": "General Checkup",
            "prefix": "A",
            "branch": self.branch_service.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

class KotTemplateAndLoggingTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(
            name="Test Company",
            status="active"
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Test Branch",
            slug="test-branch",
            mode="SERVICE_BASED"
        )
        self.service = Service.objects.create(
            branch=self.branch,
            company=self.company,
            name="General Service",
            prefix="A",
            is_active=True
        )
        self.user = User.objects.create_user(
            email="admin@test.com",
            password="admin123",
            role="company_admin",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)

    def test_message_template_crud(self):
        response = self.client.post("/api/kot-message-templates/", {
            "branch": self.branch.id,
            "channel": "sms",
            "template_text": "Hello {customer_name}, token {token_number} is ready at {desk_name}."
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["template_text"], "Hello {customer_name}, token {token_number} is ready at {desk_name}.")

        response = self.client.get(f"/api/kot-message-templates/?branch={self.branch.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_notification_logging_on_dispatch(self):
        from queuing.models import QueueMethod, KotMessageTemplate, KotNotificationLog, Ticket

        QueueMethod.objects.create(
            branch=self.branch,
            company=self.company,
            method="3",
            is_enabled=True
        )

        KotMessageTemplate.objects.create(
            branch=self.branch,
            company=self.company,
            channel="sms",
            template_text="Hey {customer_name}! Your token: {token_number}. Position: {position}."
        )

        response = self.client.post("/api/public/join/", {
            "branch_id": self.branch.id,
            "customer_name": "John Doe",
            "customer_phone": "+919999999999",
            "method": "3",
            "source": "sms",
            "consent": "true"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        log = KotNotificationLog.objects.filter(branch=self.branch, channel="sms").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.recipient, "+919999999999")
        self.assertIn("Hey John Doe!", log.message_body)
        self.assertIn("Your token: A001", log.message_body)
        self.assertEqual(log.status, "delivered")
