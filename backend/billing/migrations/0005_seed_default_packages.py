from django.db import migrations

def seed_packages(apps, schema_editor):
    Package = apps.get_model("billing", "Package")
    default_packages = [
        {
            "name": "Starter",
            "max_branches": 1,
            "max_users": 2,
            "price_monthly": 49.00,
            "price_yearly": 490.00,
            "feature_flags": {"method1": True, "kot": True},
            "is_active": True
        },
        {
            "name": "Standard",
            "max_branches": 3,
            "max_users": 5,
            "price_monthly": 99.00,
            "price_yearly": 990.00,
            "feature_flags": {"method1": True, "method2": True},
            "is_active": True
        },
        {
            "name": "Advanced",
            "max_branches": 10,
            "max_users": 20,
            "price_monthly": 199.00,
            "price_yearly": 1990.00,
            "feature_flags": {"method1": True, "method2": True, "method3": True, "display": True},
            "is_active": True
        },
        {
            "name": "Enterprise",
            "max_branches": 999,
            "max_users": 999,
            "price_monthly": 499.00,
            "price_yearly": 4990.00,
            "feature_flags": {
                "method1": True, "method2": True, "method3": True, "method4": True,
                "display": True, "kot": True, "remote_booking": True
            },
            "is_active": True
        }
    ]
    for pkg in default_packages:
        Package.objects.update_or_create(
            name=pkg["name"],
            defaults=pkg
        )

def unseed_packages(apps, schema_editor):
    Package = apps.get_model("billing", "Package")
    Package.objects.filter(name__in=["Starter", "Standard", "Advanced", "Enterprise"]).delete()

class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0004_subscription_stripe_customer_id_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_packages, reverse_code=unseed_packages),
    ]

