from django.db import migrations
from decimal import Decimal


def seed_plan_components(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")
    TokenDeliveryMethod = apps.get_model("billing", "TokenDeliveryMethod")
    QueueSolutionType = apps.get_model("billing", "QueueSolutionType")
    SubscriptionDurationTier = apps.get_model("billing", "SubscriptionDurationTier")

    component_seeds = [
        {
            "key": "branches",
            "label": "Branches",
            "category": "BRANCH_SETUP",
            "branch_mode_scope": "BOTH",
            "pricing_type": "PER_UNIT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("0.00"),
            "min_qty": 1,
            "is_mandatory": True,
            "is_active": True,
            "icon_key": "building",
            "display_order": 1,
        },
        {
            "key": "operator_screens",
            "label": "Operator seats",
            "category": "OPERATOR_DESK",
            "branch_mode_scope": "BOTH",
            "pricing_type": "PER_UNIT",
            "default_included_qty": 3,
            "price_per_unit": Decimal("1200.00"),
            "max_qty_per_branch": 50,
            "is_mandatory": True,
            "is_active": True,
            "icon_key": "monitor",
            "display_order": 2,
        },
        {
            "key": "services",
            "label": "Service Lines",
            "category": "SERVICE",
            "branch_mode_scope": "SERVICE_BASED",
            "pricing_type": "PER_UNIT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("800.00"),
            "max_qty_per_branch": 30,
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "list-todo",
            "display_order": 3,
        },
        {
            "key": "paper_roll_screens",
            "label": "Base Kiosk Screens",
            "category": "KIOSK",
            "branch_mode_scope": "BOTH",
            "pricing_type": "PER_UNIT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("1500.00"),
            "max_qty_per_branch": 10,
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "printer",
            "display_order": 4,
        },
        {
            "key": "printed_qr",
            "label": "Self-Ticketing QR Displays",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("990.00"),
            "max_qty_per_branch": 5,
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "qr-code",
            "display_order": 5,
        },
    ]

    for seed in component_seeds:
        PlanComponent.objects.update_or_create(key=seed["key"], defaults=seed)

    token_methods = [
        {"key": "SCREEN_ONLY", "label": "Digital Screen Display", "price_per_branch": Decimal("0.00"), "requires_hardware": False, "display_order": 1, "queue_method_code": "1", "is_active": True},
        {"key": "PRINTED_TOKEN", "label": "Paper Ticket Printing", "price_per_branch": Decimal("0.00"), "requires_hardware": True, "display_order": 2, "queue_method_code": "2", "is_active": True},
        {"key": "SMS", "label": "SMS Alerts & Reminders", "price_per_branch": Decimal("490.00"), "requires_hardware": False, "display_order": 3, "queue_method_code": "3", "is_active": True},
        {"key": "WHATSAPP", "label": "WhatsApp Digital Tickets", "price_per_branch": Decimal("790.00"), "requires_hardware": False, "display_order": 4, "queue_method_code": "4", "is_active": True},
    ]
    for tm in token_methods:
        TokenDeliveryMethod.objects.update_or_create(key=tm["key"], defaults=tm)

    solution_types = [
        {"key": "ONSITE", "label": "On-Site Queues Only", "description": "Ticketing kiosks and walk-in displays.", "icon_key": "monitor", "display_order": 1, "is_active": True},
        {"key": "ONLINE", "label": "Online Bookings Only", "description": "Scheduled appointments and virtual tickets.", "icon_key": "globe", "display_order": 2, "is_active": True},
        {"key": "ONSITE_ONLINE", "label": "Hybrid System (Onsite & Online)", "description": "Accept both walk-ins and pre-booked slots simultaneously.", "icon_key": "sparkles", "display_order": 3, "is_active": True},
    ]
    for st in solution_types:
        QueueSolutionType.objects.update_or_create(key=st["key"], defaults=st)

    durations = [
        {"months": 1, "discount_percent": 0, "display_order": 1, "is_active": True},
        {"months": 3, "discount_percent": 5, "display_order": 2, "is_active": True},
        {"months": 6, "discount_percent": 10, "display_order": 3, "is_active": True},
        {"months": 12, "discount_percent": 20, "display_order": 4, "is_active": True},
    ]
    for dt in durations:
        SubscriptionDurationTier.objects.update_or_create(months=dt["months"], defaults=dt)


def reverse_seed_plan_components(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0012_plancomponent_is_mandatory'),
    ]

    operations = [
        migrations.RunPython(seed_plan_components, reverse_seed_plan_components),
    ]
