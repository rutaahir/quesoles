from django.db.models.signals import post_save
from django.dispatch import receiver
from billing.models import CompanyPlanAllocation
from kot.provisioning import provision_kiosks_for_branch

@receiver(post_save, sender=CompanyPlanAllocation)
def on_allocation_save(sender, instance, **kwargs):
    if instance.plan_component.key == "paper_roll_screens" and instance.branch:
        try:
            provision_kiosks_for_branch(instance.branch)
        except Exception as e:
            # Prevent crashing saves in transactional context, but log
            print(f"Failed to auto-provision kiosks on allocation save: {e}")
