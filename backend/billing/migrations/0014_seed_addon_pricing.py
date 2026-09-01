from django.db import migrations
from decimal import Decimal


def seed_addons(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")

    addon_seeds = [
        {
            "key": "online_module",
            "label": "Online Booking Module",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "PER_UNIT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("5000.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "globe",
            "display_order": 6,
        },
        {
            "key": "sms_pack",
            "label": "SMS Pack",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("1000.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "message-square",
            "display_order": 7,
        },
        {
            "key": "whatsapp_integration",
            "label": "WhatsApp Integration",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("1500.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "message-circle",
            "display_order": 8,
        },
        {
            "key": "custom_domain",
            "label": "Custom Domain",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("2000.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "globe",
            "display_order": 9,
        },
        {
            "key": "advanced_analytics",
            "label": "Advanced Analytics",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("2500.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "bar-chart-2",
            "display_order": 10,
        },
        {
            "key": "api_integration",
            "label": "API Integration",
            "category": "ADDON",
            "branch_mode_scope": "BOTH",
            "pricing_type": "FLAT",
            "default_included_qty": 0,
            "price_per_unit": Decimal("3000.00"),
            "is_mandatory": False,
            "is_active": True,
            "icon_key": "code",
            "display_order": 11,
        },
    ]

    for seed in addon_seeds:
        PlanComponent.objects.update_or_create(key=seed["key"], defaults=seed)


def reverse_seed_addons(apps, schema_editor):
    PlanComponent = apps.get_model("billing", "PlanComponent")
    addon_keys = ["online_module", "sms_pack", "whatsapp_integration", "custom_domain", "advanced_analytics", "api_integration"]
    PlanComponent.objects.filter(key__in=addon_keys).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0013_seed_plan_components'),
    ]

    operations = [
        migrations.RunPython(seed_addons, reverse_seed_addons),
    ]
