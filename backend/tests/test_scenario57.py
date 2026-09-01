import pytest
from django.utils import timezone

from companies.models import Company
from branches.models import Branch
from accounts.models import User
from queuing.models import Desk, Service, DeskService, UserService, DeskStaffAssignment, Ticket
from queuing.services.queue_routing import claim_next_ticket

@pytest.mark.django_db
class TestScenario57AndConcurrency:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        # 1. Company & Branch
        self.company = Company.objects.create(name="Surat Enterprise Ltd")
        self.branch = Branch.objects.create(
            company=self.company,
            name="Surat Main Branch",
            slug="surat-main",
            address="Ring Road",
            city="Surat",
            status="active"
        )

        # 2. Services
        self.s_passport = Service.objects.create(branch=self.branch, company=self.company, name="Passport", prefix="P", est_service_minutes=15)
        self.s_aadhaar = Service.objects.create(branch=self.branch, company=self.company, name="Aadhaar", prefix="A", est_service_minutes=10)
        self.s_dl = Service.objects.create(branch=self.branch, company=self.company, name="Driving License", prefix="D", est_service_minutes=20)

        # 3. Desks
        self.desk1 = Desk.objects.create(branch=self.branch, company=self.company, name="Desk 01", status="open", is_active=True)
        self.desk2 = Desk.objects.create(branch=self.branch, company=self.company, name="Desk 02", status="open", is_active=True)
        self.desk3 = Desk.objects.create(branch=self.branch, company=self.company, name="Desk 03", status="open", is_active=True)

        # 4. Desk-Service M2M
        DeskService.objects.create(desk=self.desk1, service=self.s_passport)
        DeskService.objects.create(desk=self.desk1, service=self.s_aadhaar)
        DeskService.objects.create(desk=self.desk2, service=self.s_passport)
        DeskService.objects.create(desk=self.desk3, service=self.s_dl)

        # 5. Staff Users
        now = timezone.now()
        self.rahul = User.objects.create_user(email="rahul@surat.com", password="Password123!", company=self.company, branch=self.branch, role="desk_staff")
        self.priya = User.objects.create_user(email="priya@surat.com", password="Password123!", company=self.company, branch=self.branch, role="desk_staff")
        self.ahmed = User.objects.create_user(email="ahmed@surat.com", password="Password123!", company=self.company, branch=self.branch, role="desk_staff")

        # 6. Desk-Staff M2M
        DeskStaffAssignment.objects.create(desk=self.desk1, user=self.rahul, shift_start=now, shift_end=now+timezone.timedelta(hours=8))
        DeskStaffAssignment.objects.create(desk=self.desk2, user=self.priya, shift_start=now, shift_end=now+timezone.timedelta(hours=8))
        DeskStaffAssignment.objects.create(desk=self.desk3, user=self.ahmed, shift_start=now, shift_end=now+timezone.timedelta(hours=8))

        # 7. User-Service Qualification M2M
        UserService.objects.create(user=self.rahul, service=self.s_passport)
        UserService.objects.create(user=self.rahul, service=self.s_aadhaar)
        UserService.objects.create(user=self.priya, service=self.s_passport)
        UserService.objects.create(user=self.ahmed, service=self.s_dl)

    def test_passport_queue_routing_eligibility(self):
        """
        Customer joins Passport queue -> Both Rahul (Desk 01) and Priya (Desk 02) are eligible.
        """
        ticket = Ticket.objects.create(
            branch=self.branch,
            company=self.company,
            service=self.s_passport,
            method="2",
            token_number="P001",
            customer_name="Customer 1",
            customer_phone="9999999999",
            source="qr",
            status="waiting"
        )

        # Rahul on Desk 01 claims ticket
        claimed = claim_next_ticket(self.desk1, self.rahul)
        assert claimed is not None
        assert claimed.id == ticket.id
        assert claimed.served_by == self.rahul
        assert claimed.desk == self.desk1
        assert claimed.status == "called"

    def test_aadhaar_queue_routing_eligibility(self):
        """
        Customer joins Aadhaar queue -> Only Rahul (Desk 01) is eligible. Priya (Desk 02) gets None.
        """
        ticket = Ticket.objects.create(
            branch=self.branch,
            company=self.company,
            service=self.s_aadhaar,
            method="2",
            token_number="A001",
            customer_name="Customer 2",
            customer_phone="9999999999",
            source="qr",
            status="waiting"
        )

        # Priya tries to call ticket -> Not eligible
        claimed_priya = claim_next_ticket(self.desk2, self.priya)
        assert claimed_priya is None

        # Rahul tries to call ticket -> Eligible!
        claimed_rahul = claim_next_ticket(self.desk1, self.rahul)
        assert claimed_rahul is not None
        assert claimed_rahul.id == ticket.id

    def test_negative_qualification_removal(self):
        """
        Remove Rahul -> Passport qualification. Now only Priya is eligible for Passport tickets.
        """
        UserService.objects.filter(user=self.rahul, service=self.s_passport).delete()

        ticket = Ticket.objects.create(
            branch=self.branch,
            company=self.company,
            service=self.s_passport,
            method="2",
            token_number="P002",
            customer_name="Customer 3",
            customer_phone="9999999999",
            source="qr",
            status="waiting"
        )

        # Rahul tries to call Passport ticket -> Disqualified!
        claimed_rahul = claim_next_ticket(self.desk1, self.rahul)
        assert claimed_rahul is None

        # Priya calls Passport ticket -> Succeeds!
        claimed_priya = claim_next_ticket(self.desk2, self.priya)
        assert claimed_priya is not None
        assert claimed_priya.id == ticket.id

    def test_atomic_concurrency_single_ticket_claim(self):
        """
        Only 1 operator can claim a ticket when two attempt claiming the same ticket.
        """
        ticket = Ticket.objects.create(
            branch=self.branch,
            company=self.company,
            service=self.s_passport,
            method="2",
            token_number="P003",
            customer_name="Customer 4",
            customer_phone="9999999999",
            source="qr",
            status="waiting"
        )

        claim1 = claim_next_ticket(self.desk1, self.rahul)
        claim2 = claim_next_ticket(self.desk2, self.priya)

        # Exactly one claim succeeds, second gets None because ticket status changed to 'called'
        assert (claim1 is not None and claim2 is None) or (claim1 is None and claim2 is not None)
