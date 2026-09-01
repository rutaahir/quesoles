from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from accounts.models import UserInvite

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        token['company_id'] = user.company_id
        token['branch_id'] = user.branch_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'email': user.email,
            'role': user.role,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'name': f"{user.first_name} {user.last_name}".strip(),
            'companyId': str(user.company.id) if user.company else "",
            'branchId': str(user.branch.id) if user.branch else "",
            'deskId': "",
        }
        return data

class UserSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    password = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, required=False, style={"input_type": "password"})

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'role',
            'phone', 'is_active', 'branch', 'branch_name', 'company',
            'password', 'password_confirm',
        )

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.get("password_confirm")

        # Required during creation
        if self.instance is None:
            if not password:
                raise serializers.ValidationError({"password": "This field is required."})
            if not password_confirm:
                raise serializers.ValidationError({"password_confirm": "This field is required."})

        # Validate if either is provided
        if password or password_confirm:
            if password != password_confirm:
                raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
            if len(password) < 8:
                raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
            if not any(c.isalpha() for c in password):
                raise serializers.ValidationError({"password": "Password must contain at least one letter."})
            if not any(c.isdigit() for c in password):
                raise serializers.ValidationError({"password": "Password must contain at least one number."})

        return attrs


    def create(self, validated_data):
        validated_data.pop("password_confirm", None)
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        # Password is not updatable via this serializer — use change-password endpoint
        validated_data.pop("password", None)
        validated_data.pop("password_confirm", None)
        return super().update(instance, validated_data)


class UserReadSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing/retrieving users — no password fields exposed."""
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'role',
            'phone', 'is_active', 'branch', 'branch_name', 'company',
        )


class UserInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserInvite
        fields = "__all__"
        read_only_fields = ("company", "token", "status", "expires_at")

