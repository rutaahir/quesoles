from rest_framework import serializers
from .models import AlertRule, AlertEvent, Notification, NotificationTemplate

class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = [
            "id", "company", "branch", "trigger_type", "threshold", 
            "channels", "recipients", "is_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "company", "created_at", "updated_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["company"] = user.company
        return super().create(validated_data)

class AlertEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertEvent
        fields = [
            "id", "alert_rule", "branch", "company", "payload", 
            "triggered_at", "resolved_at", "created_at"
        ]
        read_only_fields = ["id", "company", "created_at"]

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "user", "company", "branch", "type", 
            "title", "body", "channel", "is_read", "created_at"
        ]
        read_only_fields = ["id", "user", "company", "branch", "channel", "created_at"]

class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = ["id", "company", "code", "channel", "subject", "body_template"]
        read_only_fields = ["id", "company"]
