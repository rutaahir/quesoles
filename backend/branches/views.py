from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import action
from core.permissions import IsBranchAdmin, IsCompanyAdminOnly, IsCompanyActiveOrPublic
from branches.models import Branch
from branches.serializers import BranchSerializer
from audit.utils import log_audit

class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsCompanyAdminOnly()]
        if self.action in ["list", "retrieve"]:
            return [IsCompanyActiveOrPublic()]
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            if self.action in ["list", "retrieve"]:
                return Branch.objects.filter(status="active")
            return Branch.objects.none()
        if getattr(user, "role", None) == "super_admin":
            return Branch.objects.all()
        if getattr(user, "role", None) == "branch_admin":
            return Branch.objects.filter(company=user.company, id=user.branch_id)
        if hasattr(user, "company") and user.company:
            return Branch.objects.filter(company=user.company)
        return Branch.objects.filter(status="active")

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        if not company:
            raise PermissionDenied("You must be associated with a company to create a branch.")

        # Enforce package branches limit
        active_count = Branch.objects.filter(company=company).count()
        sub = company.subscriptions.first()
        max_branches = company.package.max_branches + (sub.bonus_branches if sub else 0)

        if active_count >= max_branches:
            # Auto-create UpgradeRequest row
            from billing.models import UpgradeRequest
            UpgradeRequest.objects.create(
                company=company,
                requested_by=user,
                type="branch",
                details={"quantity": 1, "reason": "Auto-created due to limit reached during branch creation"},
                status="pending"
            )

            # Dispatch notification to Company Admins
            from django.contrib.auth import get_user_model
            AccountUser = get_user_model()
            from notifications.tasks import dispatch_notification
            company_admins = AccountUser.objects.filter(company=company, role="company_admin")
            for admin in company_admins:
                dispatch_notification(
                    user=admin,
                    company=company,
                    branch=None,
                    trigger_type="limit_reached",
                    title="Plan Limit Reached",
                    body="You have reached your branch limit. Upgrade to unlock."
                )

            raise PermissionDenied("Branch limit exceeded — plan limit reached. Upgrade your plan.")

        branch = serializer.save(company=company)

        # Enable Method 2 by default in the database
        from queuing.models import QueueMethod
        QueueMethod.objects.create(
            branch=branch,
            company=company,
            method="2",
            is_enabled=True,
            config={"numbering_style": "prefix"}
        )

        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="branch_created",
            object_type="Branch",
            object_id=branch.id,
            changes=serializer.data
        )

    def perform_update(self, serializer):
        old_data = BranchSerializer(serializer.instance).data
        branch = serializer.save()
        log_audit(
            actor=self.request.user,
            company=self.request.user.company,
            branch=branch,
            action="branch_updated",
            object_type="Branch",
            object_id=branch.id,
            changes={"old": old_data, "new": serializer.data}
        )

    def perform_destroy(self, instance):
        old_data = BranchSerializer(instance).data
        branch_id = instance.id
        company = instance.company
        instance.delete()
        log_audit(
            actor=self.request.user,
            company=company,
            branch=None,
            action="branch_deleted",
            object_type="Branch",
            object_id=branch_id,
            changes=old_data
        )

    @action(detail=True, methods=["post"], url_path="verify-kiosk-password", permission_classes=[AllowAny])
    def verify_kiosk_password(self, request, pk=None):
        branch = self.get_object()
        password = request.data.get("password")
        if not password:
            return Response({"error": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Lockout check to prevent brute-forcing
        from django.core.cache import cache
        lockout_key = f"kiosk_branch_lockout_{branch.id}"
        cooldown_key = f"kiosk_branch_cooldown_{branch.id}"
        if cache.get(cooldown_key):
            return Response({
                "error": "Too many failed attempts. Please try again after 60 seconds."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Hashed check using check_password
        from django.contrib.auth.hashers import check_password
        
        # If no password is configured, fail closed
        if not branch.kiosk_password_hash:
            return Response({
                "error": "Kiosk exit locked. Set a kiosk password from the Branch Operations console to secure and unlock exit access."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Support both plain match (for legacy fallback) and PBKDF2 hash
        is_correct = False
        if branch.kiosk_password_hash.startswith("pbkdf2_sha256$"):
            is_correct = check_password(password, branch.kiosk_password_hash)
        else:
            is_correct = (password == branch.kiosk_password_hash)

        if is_correct:
            cache.delete(lockout_key)
            return Response({"verified": True}, status=status.HTTP_200_OK)
        else:
            fails = cache.get(lockout_key, 0) + 1
            cache.set(lockout_key, fails, timeout=300)
            if fails >= 5:
                cache.set(cooldown_key, True, timeout=60)
                cache.delete(lockout_key)
                return Response({
                    "error": "Too many failed attempts. Please try again after 60 seconds."
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            return Response({"verified": False, "error": f"Invalid password. {5 - fails} attempts remaining."}, status=status.HTTP_400_BAD_REQUEST)
