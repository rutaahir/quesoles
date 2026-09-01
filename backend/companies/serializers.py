import re
from rest_framework import serializers
from companies.models import Company
from billing.models import Package
from django.contrib.auth import get_user_model

User = get_user_model()

class CompanyRegistrationSerializer(serializers.Serializer):
    company_name = serializers.CharField(min_length=2, max_length=120, required=True)
    industry = serializers.ChoiceField(choices=[
        ("Healthcare", "Healthcare"),
        ("Banking", "Banking"),
        ("Banking & Finance", "Banking & Finance"),
        ("Government", "Government"),
        ("Retail", "Retail"),
        ("Retail & Service", "Retail & Service"),
        ("Education", "Education"),
        ("Telecom", "Telecom"),
        ("Corporate", "Corporate"),
        ("Corporate Office", "Corporate Office"),
        ("Other", "Other")
    ], required=True)
    contact_email = serializers.EmailField(required=True)
    contact_phone = serializers.CharField(max_length=50, required=True)
    address = serializers.CharField(required=True)
    city = serializers.CharField(required=True)
    logo = serializers.FileField(required=False, allow_null=True)
    brand_primary_color = serializers.CharField(max_length=7, required=False, default="#6366F1")
    estimated_branch_count = serializers.IntegerField(min_value=1, required=True)
    package = serializers.PrimaryKeyRelatedField(queryset=Package.objects.filter(is_active=True), required=True)
    billing_cycle = serializers.ChoiceField(choices=[("monthly", "Monthly"), ("yearly", "Yearly")], required=True)
    slug = serializers.CharField(max_length=255, required=False, allow_blank=True)
    website = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    # Admin details
    admin_first_name = serializers.CharField(max_length=150, required=True)
    admin_last_name = serializers.CharField(max_length=150, required=True)
    admin_email = serializers.EmailField(required=True)
    admin_password = serializers.CharField(write_only=True, required=True)
    admin_confirm_password = serializers.CharField(write_only=True, required=True)
    admin_phone = serializers.CharField(max_length=50, required=True)
    
    terms_consent = serializers.BooleanField(required=True)

    def validate_contact_email(self, value):
        if Company.objects.filter(contact_email=value).exists():
            raise serializers.ValidationError("A company is already registered with this contact email.")
        return value

    def validate_slug(self, value):
        if value:
            import re
            if not re.match(r'^[a-z0-9-]+$', value):
                raise serializers.ValidationError("Slug must only contain lowercase alphanumeric characters and hyphens.")
            if Company.objects.filter(slug=value).exists():
                raise serializers.ValidationError("This company URL slug is already taken.")
        return value

    def validate_admin_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user account is already registered with this login email.")
        return value

    def validate_brand_primary_color(self, value):
        if not re.match(r"^#[0-9a-fA-F]{6}$", value):
            raise serializers.ValidationError("Enter a valid HEX color code (e.g. #FF5733).")
        return value

    def validate_logo(self, value):
        if value:
            # Validate size (max 2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Logo file size must not exceed 2MB.")
            # Validate format png/jpg/jpeg/svg
            ext = value.name.split('.')[-1].lower()
            if ext not in ['png', 'jpg', 'jpeg', 'svg']:
                raise serializers.ValidationError("Logo must be a PNG, JPG, JPEG or SVG file.")
        return value

    def validate_admin_password(self, value):
        if not any(char.isdigit() for char in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not any(char.isalpha() for char in value):
            raise serializers.ValidationError("Password must contain at least one letter.")
        return value

    def validate_terms_consent(self, value):
        if not value:
            raise serializers.ValidationError("You must consent to the Terms of Service and Privacy Policy.")
        return value

    def validate(self, data):
        if data.get("admin_password") != data.get("admin_confirm_password"):
            raise serializers.ValidationError({"admin_confirm_password": "Passwords do not match."})
        return data
