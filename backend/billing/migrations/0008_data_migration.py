from django.db import migrations


def backfill_plan_components_and_seeds(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")
    QueueSolutionType = apps.get_model("billing", "QueueSolutionType")
    TokenDeliveryMethod = apps.get_model("billing", "TokenDeliveryMethod")
    SubscriptionDurationTier = apps.get_model("billing", "SubscriptionDurationTier")

    # 1. Backfill existing components
    # Map key -> (category, scope, pricing_type, max_qty_per_branch, icon_key, display_order)
    component_mappings = {
        "branches": ("BRANCH_SETUP", "BOTH", "PER_UNIT", None, "building", 1),
        "operator_screens": ("OPERATOR_DESK", "BOTH", "PER_UNIT", 50, "monitor", 2),
        "services": ("SERVICE", "SERVICE_BASED", "PER_UNIT", 30, "list-todo", 3),
        "paper_roll_screens": ("KIOSK", "BOTH", "PER_UNIT", 10, "printer", 4),
        "printed_qr": ("ADDON", "BOTH", "FLAT", 5, "qr-code", 5),
    }

    for key, (cat, scope, p_type, max_qty, icon, order) in component_mappings.items():
        PlanComponent.objects.filter(key=key).update(
            category=cat,
            branch_mode_scope=scope,
            pricing_type=p_type,
            max_qty_per_branch=max_qty,
            icon_key=icon,
            display_order=order,
        )

    # 2. Seed Solution Types
    solution_types = [
        {"key": "ONSITE", "label": "On-Site Queues Only", "description": "Ticketing kiosks and walk-in displays.", "icon_key": "monitor", "display_order": 1},
        {"key": "ONLINE", "label": "Online Bookings Only", "description": "Scheduled appointments and virtual tickets.", "icon_key": "globe", "display_order": 2},
        {"key": "ONSITE_ONLINE", "label": "Hybrid System (Onsite & Online)", "description": "Accept both walk-ins and pre-booked slots simultaneously.", "icon_key": "sparkles", "display_order": 3},
    ]
    for st in solution_types:
        QueueSolutionType.objects.get_or_create(key=st["key"], defaults=st)

    # 3. Seed Token Delivery Methods
    token_methods = [
        {"key": "SCREEN_ONLY", "label": "Digital Screen Display", "price_per_branch": 0.00, "requires_hardware": False, "display_order": 1},
        {"key": "PRINTED_TOKEN", "label": "Paper Ticket Printing", "price_per_branch": 0.00, "requires_hardware": True, "display_order": 2},
        {"key": "SMS", "label": "SMS Alerts & Reminders", "price_per_branch": 490.00, "requires_hardware": False, "display_order": 3},
        {"key": "WHATSAPP", "label": "WhatsApp Digital Tickets", "price_per_branch": 790.00, "requires_hardware": False, "display_order": 4},
    ]
    for tm in token_methods:
        TokenDeliveryMethod.objects.get_or_create(key=tm["key"], defaults=tm)

    # 4. Seed Duration Tiers
    durations = [
        {"months": 1, "discount_percent": 0, "display_order": 1},
        {"months": 3, "discount_percent": 5, "display_order": 2},
        {"months": 6, "discount_percent": 10, "display_order": 3},
        {"months": 12, "discount_percent": 20, "display_order": 4},
    ]
    for dt in durations:
        SubscriptionDurationTier.objects.get_or_create(months=dt["months"], defaults=dt)


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0007_queuesolutiontype_subscriptiondurationtier_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_plan_components_and_seeds, reverse_backfill),
    ]
