from django.core.management.base import BaseCommand
from branches.models import Branch
from kot.provisioning import provision_kiosks_for_branch

class Command(BaseCommand):
    help = "Backfills kiosk database records for existing branches based on plan allocations"

    def handle(self, *args, **options):
        self.stdout.write("Starting kiosk backfill...")
        branches = Branch.objects.all()
        count = 0
        for branch in branches:
            try:
                provision_kiosks_for_branch(branch)
                count += 1
                self.stdout.write(f"Provisioned kiosks for branch: {branch.name} ({branch.company.name})")
            except Exception as e:
                self.stderr.write(f"Error provisioning kiosks for branch {branch.name}: {e}")
        
        self.stdout.write(f"Kiosk backfill completed. Processed {count} branches.")
