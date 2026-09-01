from rest_framework import serializers
from billing.models import (
    Package, UpgradeRequest, Subscription, Invoice, PlanComponent,
    CompanyPlanAllocation, PlanPurchase, QueueSolutionType,
    TokenDeliveryMethod, SubscriptionDurationTier, PriceChangeLog
)

class PlanComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanComponent
        fields = "__all__"

class CompanyPlanAllocationSerializer(serializers.ModelSerializer):
    component_key = serializers.CharField(source="plan_component.key", read_only=True)
    component_label = serializers.CharField(source="plan_component.label", read_only=True)
    component_unit_label = serializers.CharField(source="plan_component.unit_label", read_only=True)
    is_toggle = serializers.BooleanField(source="plan_component.is_toggle", read_only=True)
    description = serializers.CharField(source="plan_component.description", read_only=True)
    min_qty = serializers.IntegerField(source="plan_component.min_qty", read_only=True)
    max_qty = serializers.IntegerField(source="plan_component.max_qty", read_only=True)

    class Meta:
        model = CompanyPlanAllocation
        fields = "__all__"

class PlanPurchaseSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = PlanPurchase
        fields = "__all__"

class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = "__all__"

class UpgradeRequestSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    requested_by_email = serializers.CharField(source="requested_by.email", read_only=True)

    class Meta:
        model = UpgradeRequest
        fields = "__all__"
        read_only_fields = ("company", "requested_by", "status", "reviewed_by", "reviewed_at")

class SubscriptionSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = ("company", "status", "stripe_subscription_id", "stripe_customer_id")

class InvoiceSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    package_name = serializers.CharField(source="subscription.package.name", read_only=True)

    class Meta:
        model = Invoice
        fields = "__all__"


class QueueSolutionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueueSolutionType
        fields = "__all__"


class TokenDeliveryMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenDeliveryMethod
        fields = "__all__"


class SubscriptionDurationTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionDurationTier
        fields = "__all__"


class PriceChangeLogSerializer(serializers.ModelSerializer):
    changed_by_email = serializers.CharField(source="changed_by.email", read_only=True)
    component_label = serializers.CharField(source="plan_component.label", read_only=True)
    component_key = serializers.CharField(source="plan_component.key", read_only=True)

    class Meta:
        model = PriceChangeLog
        fields = "__all__"


