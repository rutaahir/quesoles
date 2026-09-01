from django.db import migrations

def backfill_token_delivery_mapping_and_qr(apps, schema_editor):
    TokenDeliveryMethod = apps.get_model("billing", "TokenDeliveryMethod")
    PlanComponent = apps.get_model("billing", "PlanComponent")

    # 1. Backfill queue_method_code mappings
    mappings = {
        "SCREEN_ONLY": "1",
        "PRINTED_TOKEN": "2",
        "SMS": "3",
        "WHATSAPP": "4",
    }
    for key, code in mappings.items():
        TokenDeliveryMethod.objects.filter(key=key).update(queue_method_code=code)

    # 2. Fix printed_qr component category to ADDON
    PlanComponent.objects.filter(key="printed_qr").update(category="ADDON")

def reverse_backfill(apps, schema_editor):
    TokenDeliveryMethod = apps.get_model("billing", "TokenDeliveryMethod")
    PlanComponent = apps.get_model("billing", "PlanComponent")

    # Reset mapping
    TokenDeliveryMethod.objects.update(queue_method_code="")
    
    # Reset category
    PlanComponent.objects.filter(key="printed_qr").update(category="KIOSK")

class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0010_tokendeliverymethod_queue_method_code'),
    ]

    operations = [
        migrations.RunPython(backfill_token_delivery_mapping_and_qr, reverse_backfill),
    ]
