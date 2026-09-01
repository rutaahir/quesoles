import random
from kot.models import Kiosk
from billing.models import CompanyPlanAllocation
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

def provision_kiosks_for_branch(branch):
    """
    Provisions exactly N kiosk slots for the given branch based on allocations or package limits.
    """
    # 1. Determine N (kiosk quota for this branch)
    alloc = CompanyPlanAllocation.objects.filter(
        company=branch.company, branch=branch, plan_component__key="paper_roll_screens"
    ).first()
    if alloc:
        N = alloc.purchased_qty
    else:
        # Fallback to company-wide allocation
        comp_alloc = CompanyPlanAllocation.objects.filter(
            company=branch.company, branch__isnull=True, plan_component__key="paper_roll_screens"
        ).first()
        if comp_alloc:
            N = comp_alloc.purchased_qty
        else:
            # Fallback to package max_kiosks
            pkg = getattr(branch.company, "package", None)
            N = getattr(pkg, "max_kiosks", 0) if pkg else 0

    if N < 0:
        N = 0

    # 2. Sync Kiosk records
    kiosks = list(Kiosk.objects.filter(branch=branch).order_by("id"))
    
    # Track changed/evicted kiosks
    channel_layer = get_channel_layer()

    for idx, kiosk in enumerate(kiosks):
        if idx < N:
            if kiosk.status != "active":
                kiosk.status = "active"
                kiosk.save()
        else:
            # Evict and deactivate excess kiosks
            if kiosk.status != "inactive":
                kiosk.status = "inactive"
                session_token = kiosk.session_token
                
                # Clear session details
                kiosk.session_token = None
                kiosk.connected_at = None
                kiosk.last_seen = None
                kiosk.save()

                # Trigger real-time WebSocket eviction
                if session_token and channel_layer:
                    try:
                        async_to_sync(channel_layer.group_send)(
                            f"kiosk_{kiosk.id}",
                            {
                                "type": "kiosk.force_logout",
                                "session_token": "evicted_by_deactivation"
                            }
                        )
                    except Exception as ex:
                        # Log error but don't crash
                        print(f"WebSocket force-logout failed for Kiosk {kiosk.id}: {ex}")

    # 3. Create missing kiosks
    if len(kiosks) < N:
        for i in range(len(kiosks) + 1, N + 1):
            pin = "".join(str(random.randint(0, 9)) for _ in range(4))
            Kiosk.objects.create(
                company=branch.company,
                branch=branch,
                kiosk_identifier=f"Kiosk {i}",
                pin=pin,
                status="active"
            )
