from django.apps import AppConfig


class KotConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "kot"

    def ready(self):
        import kot.signals
