from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from billing.models import Package, Subscription
from companies.models import Company
from branches.models import Branch
from queuing.models import Desk, Service, DeskService

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds database with Packages, Companies, Branches, Desks, Services, and Users for multi-tenant testing."

    def handle(self, *args, **options):
        self.stdout.write("Seeding database...")

        # 1. Packages
        packages = {
            "Starter": {
                "max_branches": 1,
                "max_users": 2,
                "max_kiosks": 1,
                "price_monthly": 49.00,
                "price_yearly": 490.00,
                "feature_flags": {"method1": True, "kot": True},
            },
            "Standard": {
                "max_branches": 3,
                "max_users": 5,
                "max_kiosks": 2,
                "price_monthly": 99.00,
                "price_yearly": 990.00,
                "feature_flags": {"method1": True, "method2": True},
            },
            "Advanced": {
                "max_branches": 10,
                "max_users": 20,
                "max_kiosks": 3,
                "price_monthly": 199.00,
                "price_yearly": 1990.00,
                "feature_flags": {"method1": True, "method2": True, "method3": True, "display": True},
            },
            "Enterprise": {
                "max_branches": 999,
                "max_users": 999,
                "max_kiosks": 5,
                "price_monthly": 499.00,
                "price_yearly": 4990.00,
                "feature_flags": {"method1": True, "method2": True, "method3": True, "method4": True, "display": True, "kot": True, "remote_booking": True},
            },
        }

        package_objs = {}
        for name, data in packages.items():
            pkg, created = Package.objects.get_or_create(
                name=name,
                defaults={
                    "max_branches": data["max_branches"],
                    "max_users": data["max_users"],
                    "max_kiosks": data["max_kiosks"],
                    "price_monthly": data["price_monthly"],
                    "price_yearly": data["price_yearly"],
                    "feature_flags": data["feature_flags"],
                    "is_active": True,
                }
            )
            package_objs[name] = pkg
            if created:
                self.stdout.write(f"Created package: {name}")

        # 2. Platform Super Admin
        super_user, created = User.objects.get_or_create(
            email="superadmin@quesole.com",
            defaults={
                "first_name": "Devika",
                "last_name": "Raman",
                "role": "super_admin",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if created:
            super_user.set_password("admin123")
            super_user.save()
            self.stdout.write("Created Super Admin user")

        # 3. Company A: Apollo Care Center
        company_a, created = Company.objects.get_or_create(
            contact_email="rhea.mehta@apollocare.in",
            defaults={
                "name": "Apollo Care Center",
                "industry": "Healthcare",
                "contact_phone": "+91 9876543210",
                "status": "active",
                "package": package_objs["Enterprise"],
            }
        )
        if created:
            self.stdout.write("Created Company A: Apollo Care Center")

        # Company A Subscription
        Subscription.objects.get_or_create(
            company=company_a,
            package=package_objs["Enterprise"],
            defaults={
                "billing_cycle": "monthly",
                "start_date": timezone.now().date(),
                "end_date": timezone.now().date() + timezone.timedelta(days=30),
                "status": "active",
                "auto_renew": True,
            }
        )

        # Company A Branches
        branch_a1, created = Branch.objects.get_or_create(
            company=company_a,
            slug="b_amd_central",
            defaults={
                "name": "Ahmedabad Central",
                "address": "Opp. Income Tax Office, Ashram Road",
                "city": "Ahmedabad",
                "timezone": "Asia/Kolkata",
                "status": "active",
            }
        )
        if created:
            self.stdout.write("Created Branch A1: Ahmedabad Central")

        branch_a2, created = Branch.objects.get_or_create(
            company=company_a,
            slug="baroda-clinic",
            defaults={
                "name": "Baroda Clinic",
                "address": "Alkapuri Main Road, Vadodara",
                "city": "Vadodara",
                "timezone": "Asia/Kolkata",
                "status": "active",
            }
        )

        # 4. Company B: Star Diagnostics (Tenant Isolation Partner)
        company_b, created = Company.objects.get_or_create(
            contact_email="john.doe@star.in",
            defaults={
                "name": "Star Diagnostics",
                "industry": "Diagnostics",
                "contact_phone": "+91 9999988888",
                "status": "active",
                "package": package_objs["Standard"],
            }
        )
        if created:
            self.stdout.write("Created Company B: Star Diagnostics")

        # Company B Subscription
        Subscription.objects.get_or_create(
            company=company_b,
            package=package_objs["Standard"],
            defaults={
                "billing_cycle": "monthly",
                "start_date": timezone.now().date(),
                "end_date": timezone.now().date() + timezone.timedelta(days=30),
                "status": "active",
                "auto_renew": True,
            }
        )

        # Company B Branches
        branch_b1, created = Branch.objects.get_or_create(
            company=company_b,
            slug="surat-diagnostics",
            defaults={
                "name": "Surat Diagnostics",
                "address": "Ring Road, Surat",
                "city": "Surat",
                "timezone": "Asia/Kolkata",
                "status": "active",
            }
        )
        if created:
            self.stdout.write("Created Branch B1: Surat Diagnostics")

        # 5. Company A Users
        users_a = [
            ("rhea.mehta@apollocare.in", "Rhea", "Mehta", "company_admin", None),
            ("devansh.p@apollocare.in", "Devansh", "Patel", "branch_admin", branch_a1),
            ("kavya.t@apollocare.in", "Kavya", "Trivedi", "desk_staff", branch_a1),
        ]
        for email, fn, ln, role, branch in users_a:
            u, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": fn,
                    "last_name": ln,
                    "role": role,
                    "company": company_a,
                    "branch": branch,
                    "is_active": True,
                }
            )
            if created:
                u.set_password("admin123")
                u.save()
                self.stdout.write(f"Created Apollo user: {email} ({role})")

        # 6. Company B Users
        users_b = [
            ("john.doe@star.in", "John", "Doe", "company_admin", None),
            ("sam.smith@star.in", "Sam", "Smith", "branch_admin", branch_b1),
            ("lucy.l@star.in", "Lucy", "L", "desk_staff", branch_b1),
        ]
        for email, fn, ln, role, branch in users_b:
            u, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": fn,
                    "last_name": ln,
                    "role": role,
                    "company": company_b,
                    "branch": branch,
                    "is_active": True,
                }
            )
            if created:
                u.set_password("admin123")
                u.save()
                self.stdout.write(f"Created Star user: {email} ({role})")

        # 7. Desks & Services for Branch A1 (Apollo Ahmedabad Central)
        d1, _ = Desk.objects.get_or_create(branch=branch_a1, company=company_a, name="Counter 01")
        d2, _ = Desk.objects.get_or_create(branch=branch_a1, company=company_a, name="Counter 02")

        s1, _ = Service.objects.get_or_create(branch=branch_a1, company=company_a, name="General Checkup", defaults={"est_service_minutes": 15, "prefix": "A"})
        s2, _ = Service.objects.get_or_create(branch=branch_a1, company=company_a, name="Consultation", defaults={"est_service_minutes": 20, "prefix": "B"})
        s3, _ = Service.objects.get_or_create(branch=branch_a1, company=company_a, name="Billing", defaults={"est_service_minutes": 10, "prefix": "C"})

        DeskService.objects.get_or_create(desk=d1, service=s1)
        DeskService.objects.get_or_create(desk=d1, service=s2)
        DeskService.objects.get_or_create(desk=d2, service=s3)

        # 8. Desks & Services for Branch B1 (Star Surat Diagnostics)
        db1, _ = Desk.objects.get_or_create(branch=branch_b1, company=company_b, name="Desk A")
        sb1, _ = Service.objects.get_or_create(branch=branch_b1, company=company_b, name="Blood Test", defaults={"est_service_minutes": 10, "prefix": "A"})
        sb2, _ = Service.objects.get_or_create(branch=branch_b1, company=company_b, name="X-Ray", defaults={"est_service_minutes": 30, "prefix": "B"})

        DeskService.objects.get_or_create(desk=db1, service=sb1)
        DeskService.objects.get_or_create(desk=db1, service=sb2)

        self.stdout.write("Database seeding complete!")
