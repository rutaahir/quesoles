from django.db import models
from django.conf import settings
from core.models import BaseModel
from core.managers import TenantManager

class PlanComponent(BaseModel):
    CATEGORY_CHOICES = [
        ("SOLUTION_TYPE", "Solution Type"),
        ("SERVICE", "Service"),
        ("OPERATOR_DESK", "Operator Desk"),
        ("KIOSK", "Kiosk"),
        ("TOKEN_DELIVERY", "Token Delivery"),
        ("ADDON", "Add-on"),
        ("BRANCH_SETUP", "Branch Setup"),
    ]

    MODE_SCOPE_CHOICES = [
        ("SERVICE_BASED", "Service-Based"),
        ("NON_SERVICE_BASED", "Non-Service-Based"),
        ("BOTH", "Both"),
        ("N_A", "N/A"),
    ]

    PRICING_TYPE_CHOICES = [
        ("PER_UNIT", "Per Unit"),
        ("FLAT", "Flat"),
        ("TOGGLE_FREE", "Toggle Free"),
        ("TOGGLE_PAID", "Toggle Paid"),
    ]

    key = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    unit_label = models.CharField(max_length=100, default="unit")
    default_included_qty = models.IntegerField(default=0)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_toggle = models.BooleanField(default=False)
    min_qty = models.IntegerField(default=0)
    max_qty = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_mandatory = models.BooleanField(default=False)
    is_recurring = models.BooleanField(default=True)

    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="ADDON")
    branch_mode_scope = models.CharField(max_length=50, choices=MODE_SCOPE_CHOICES, default="BOTH")
    pricing_type = models.CharField(max_length=50, choices=PRICING_TYPE_CHOICES, default="PER_UNIT")
    max_qty_per_branch = models.IntegerField(null=True, blank=True)
    is_addon_only = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    icon_key = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.label} ({self.key})"

class CompanyPlanAllocation(BaseModel):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="allocations")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="allocations", null=True, blank=True)
    plan_component = models.ForeignKey(PlanComponent, on_delete=models.CASCADE, related_name="allocations")
    purchased_qty = models.IntegerField(default=0)
    unit_price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ("company", "branch", "plan_component")

    def __str__(self):
        return f"{self.company.name} - {self.plan_component.key}: {self.purchased_qty}"

class PlanPurchase(BaseModel):
    TYPE_CHOICES = [
        ("initial_registration", "Initial Registration"),
        ("add_on", "Add-on Purchase"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="plan_purchases")
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default="initial_registration")
    line_items = models.JSONField(default=list, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_reference = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return f"{self.company.name} - {self.type} ({self.payment_status}: ₹{self.total_amount})"

class Package(BaseModel):
    name = models.CharField(max_length=255, unique=True)
    max_branches = models.IntegerField()
    max_users = models.IntegerField()
    max_kiosks = models.IntegerField(default=0)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    feature_flags = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Subscription(BaseModel):
    CYCLE_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("past_due", "Past Due"),
        ("cancelled", "Cancelled"),
        ("rejected", "Rejected"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="subscriptions")
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name="subscriptions")
    billing_cycle = models.CharField(max_length=20, choices=CYCLE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    auto_renew = models.BooleanField(default=True)
    bonus_branches = models.IntegerField(default=0)
    bonus_users = models.IntegerField(default=0)
    feature_overrides = models.JSONField(default=dict, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    trial_end_date = models.DateField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"{self.company.name} - {self.package.name} ({self.status})"

class Invoice(BaseModel):
    STATUS_CHOICES = [
        ("paid", "Paid"),
        ("pending", "Pending"),
        ("failed", "Failed"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="invoices")
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name="invoices")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_gateway_ref = models.CharField(max_length=255, null=True, blank=True)
    issued_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Inv #{self.id} - {self.company.name} ({self.amount} {self.currency})"

class UpgradeRequest(BaseModel):
    TYPE_CHOICES = [
        ("branch", "Branch Limit"),
        ("user", "User Limit"),
        ("feature", "Feature Gate"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="upgrade_requests")
    requested_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="requested_upgrades")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_upgrades")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Upgrade Req #{self.id} - {self.company.name} ({self.type})"


class QueueSolutionType(BaseModel):
    key = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    icon_key = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)

    def __str__(self):
        return self.label


class TokenDeliveryMethod(BaseModel):
    key = models.CharField(max_length=100, unique=True)
    label = models.CharField(max_length=255)
    price_per_branch = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    requires_hardware = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    queue_method_code = models.CharField(max_length=10, blank=True, default="", help_text="The code mapping to QueueMethod.method (e.g. '1', '2', '3', '4')")

    def __str__(self):
        return self.label


class SubscriptionDurationTier(BaseModel):
    months = models.IntegerField(unique=True)
    discount_percent = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.months} Months"


class PriceChangeLog(BaseModel):
    plan_component = models.ForeignKey(PlanComponent, on_delete=models.CASCADE, related_name="price_logs")
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="price_changes")
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.plan_component.key}: {self.old_price} -> {self.new_price}"

