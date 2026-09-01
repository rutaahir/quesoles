import uuid
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from core.permissions import IsCompanyAdmin, IsBranchAdmin, IsCompanyAdminOnly
from core.throttles import PublicSubmitThrottle
from core.honeypot import validate_honeypot
from accounts.models import UserInvite, User
from accounts.serializers import CustomTokenObtainPairSerializer, UserInviteSerializer, UserSerializer, UserReadSerializer
from audit.utils import log_audit

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserInviteViewSet(viewsets.ModelViewSet):
    serializer_class = UserInviteSerializer

    def get_permissions(self):
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return UserInvite.objects.none()
        if user.role == "super_admin":
            return UserInvite.objects.all()
        return UserInvite.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company
        if not company:
            raise PermissionDenied("You must be associated with a company to invite staff.")

        role = serializer.validated_data.get("role")
        if user.role == "branch_admin" and role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("Branch Admins can only invite branch_admin or desk_staff roles.")

        if user.role == "branch_admin":
            serializer.validated_data["branch"] = user.branch

        branch = serializer.validated_data.get("branch")
        if branch and branch.company != company:
            raise PermissionDenied("You can only invite staff to branches belonging to your company.")

        # Enforce user seats limit (active users + pending unexpired invites)
        role_to_invite = serializer.validated_data.get("role", "desk_staff")
        from billing.models import CompanyPlanAllocation
        has_itemized = CompanyPlanAllocation.objects.filter(company=company).exists()
        
        if has_itemized and role_to_invite == "desk_staff":
            current_operators = User.objects.filter(company=company, role="desk_staff", is_active=True).count()
            pending_invites = UserInvite.objects.filter(
                company=company,
                role="desk_staff",
                status="pending",
                expires_at__gt=timezone.now()
            ).count()
            from django.db.models import Sum
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="operator_screens").aggregate(total=Sum('purchased_qty'))
            max_operators = res['total'] if res['total'] is not None else (company.package.max_users if company.package else 2)
            
            if current_operators + pending_invites >= max_operators:
                from billing.models import UpgradeRequest
                UpgradeRequest.objects.create(
                    company=company,
                    requested_by=user,
                    type="user",
                    details={"quantity": 1, "reason": "Auto-created due to limit reached during user invite creation"},
                    status="pending"
                )
                from notifications.tasks import dispatch_notification
                company_admins = User.objects.filter(company=company, role="company_admin")
                for admin in company_admins:
                    dispatch_notification(
                        user=admin,
                        company=company,
                        branch=None,
                        trigger_type="limit_reached",
                        title="Plan Limit Reached",
                        body="You have reached your user seat limit. Upgrade to unlock."
                    )
                raise PermissionDenied("User seat limit reached. Upgrade your plan to invite more staff.")
        else:
            current_users = User.objects.filter(company=company, is_active=True).count()
            pending_invites = UserInvite.objects.filter(
                company=company,
                status="pending",
                expires_at__gt=timezone.now()
            ).count()
            sub = company.subscriptions.first()
            max_users = company.package.max_users + (sub.bonus_users if sub else 0) if company.package else 5
            
            if current_users + pending_invites >= max_users:
                from billing.models import UpgradeRequest
                UpgradeRequest.objects.create(
                    company=company,
                    requested_by=user,
                    type="user",
                    details={"quantity": 1, "reason": "Auto-created due to limit reached during user invite creation"},
                    status="pending"
                )
                from notifications.tasks import dispatch_notification
                company_admins = User.objects.filter(company=company, role="company_admin")
                for admin in company_admins:
                    dispatch_notification(
                        user=admin,
                        company=company,
                        branch=None,
                        trigger_type="limit_reached",
                        title="Plan Limit Reached",
                        body="You have reached your user seat limit. Upgrade to unlock."
                    )
                raise PermissionDenied("User seat limit reached. Upgrade your plan to invite more staff.")

        token = uuid.uuid4().hex
        expires_at = timezone.now() + timezone.timedelta(days=7)

        invite = serializer.save(
            company=company,
            token=token,
            status="pending",
            expires_at=expires_at
        )

        log_audit(
            actor=user,
            company=company,
            branch=None,
            action="staff_invited",
            object_type="UserInvite",
            object_id=invite.id,
            changes=serializer.data
        )

class InviteAcceptView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicSubmitThrottle]

    def post(self, request):
        validate_honeypot(request.data)
        token = request.data.get("token")
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        password = request.data.get("password")
        phone = request.data.get("phone")

        if not all([token, first_name, last_name, password]):
            raise ValidationError("Token, first name, last name, and password are required.")

        try:
            invite = UserInvite.objects.get(
                token=token,
                status="pending",
                expires_at__gt=timezone.now()
            )
        except UserInvite.DoesNotExist:
            return Response({"error": "Invalid or expired invite token."}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce password strength rules
        if len(password) < 10:
            return Response({"error": "Password must be at least 10 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        if not any(char.isdigit() for char in password):
            return Response({"error": "Password must contain at least one number."}, status=status.HTTP_400_BAD_REQUEST)
        if not any(char.isalpha() for char in password):
            return Response({"error": "Password must contain at least one letter."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                new_user = User.objects.create_user(
                    email=invite.email_or_phone,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role=invite.role,
                    company=invite.company,
                    branch=invite.branch,
                    phone=phone or ""
                )
                
                invite.status = "accepted"
                invite.save()

                log_audit(
                    actor=new_user,
                    company=invite.company,
                    branch=None,
                    action="staff_invite_accepted",
                    object_type="User",
                    object_id=new_user.id,
                    changes={"email": new_user.email, "role": new_user.role}
                )

            return Response({
                "message": "Invite accepted and user registered successfully.",
                "email": new_user.email
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserViewSet(viewsets.ModelViewSet):

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return UserReadSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == "check_email":
            return [IsCompanyAdmin()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdmin()]
        if self.action in ["retrieve", "list"]:
            return [IsAuthenticated()]
        return [IsBranchAdmin()]

    def get_throttles(self):
        if self.action == "check_email":
            return [PublicSubmitThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return User.objects.none()
        if user.role == "super_admin":
            return User.objects.all()
        if user.role == "desk_staff":
            return User.objects.filter(id=user.id)
        if user.role == "branch_admin":
            # Branch admins see all active users in their branch
            return User.objects.filter(company=user.company, branch=user.branch, is_active=True)
        # Company admins see all staff (including inactive) for reactivation
        return User.objects.filter(company=user.company).exclude(role__in=["super_admin", "company_admin"])

    def perform_create(self, serializer):
        user = self.request.user
        company = user.company

        if not company:
            raise PermissionDenied("You must be associated with a company to create staff.")

        # RBAC: only company_admin or branch_admin can create staff
        if user.role not in ["company_admin", "branch_admin"]:
            raise PermissionDenied("Only Company Admins and Branch Admins can create staff.")

        # Role restriction: can only create branch_admin or desk_staff
        role = serializer.validated_data.get("role")
        if role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("You can only create Branch Admin or Desk Staff users.")

        # Branch admins can only create staff for their own branch
        branch = serializer.validated_data.get("branch")
        if user.role == "branch_admin":
            branch = user.branch
            serializer.validated_data["branch"] = branch

        # Tenant isolation: branch must belong to this company
        if branch and branch.company != company:
            raise PermissionDenied("The assigned branch does not belong to your company.")

        # Enforce user seats limit
        role_to_create = serializer.validated_data.get("role", "desk_staff")
        from billing.models import CompanyPlanAllocation
        has_itemized = CompanyPlanAllocation.objects.filter(company=company).exists()
        
        if has_itemized and role_to_create == "desk_staff":
            current_operators = User.objects.filter(company=company, role="desk_staff", is_active=True).count()
            from django.db.models import Sum
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="operator_screens").aggregate(total=Sum('purchased_qty'))
            max_operators = res['total'] if res['total'] is not None else (company.package.max_users if company.package else 2)
            
            if current_operators >= max_operators:
                from billing.models import UpgradeRequest
                UpgradeRequest.objects.create(
                    company=company,
                    requested_by=user,
                    type="user",
                    details={"quantity": 1, "reason": "Auto-created: user seat limit reached during staff creation"},
                    status="pending"
                )
                from notifications.tasks import dispatch_notification
                company_admins = User.objects.filter(company=company, role="company_admin")
                for admin in company_admins:
                    dispatch_notification(
                        user=admin,
                        company=company,
                        branch=None,
                        trigger_type="limit_reached",
                        title="Plan Limit Reached",
                        body="You have reached your user seat limit. Upgrade to unlock."
                    )
                raise PermissionDenied("User seat limit reached. Upgrade your plan to add more staff.")
        else:
            current_users = User.objects.filter(company=company, is_active=True).count()
            sub = company.subscriptions.first()
            max_users = company.package.max_users + (sub.bonus_users if sub else 0) if company.package else 5
            
            if current_users >= max_users:
                from billing.models import UpgradeRequest
                UpgradeRequest.objects.create(
                    company=company,
                    requested_by=user,
                    type="user",
                    details={"quantity": 1, "reason": "Auto-created: user seat limit reached during staff creation"},
                    status="pending"
                )
                from notifications.tasks import dispatch_notification
                company_admins = User.objects.filter(company=company, role="company_admin")
                for admin in company_admins:
                    dispatch_notification(
                        user=admin,
                        company=company,
                        branch=None,
                        trigger_type="limit_reached",
                        title="Plan Limit Reached",
                        body="You have reached your user seat limit. Upgrade to unlock."
                    )
                raise PermissionDenied("User seat limit reached. Upgrade your plan to add more staff.")

        new_user = serializer.save(company=company)

        log_audit(
            actor=user,
            company=company,
            branch=branch,
            action="staff_created",
            object_type="User",
            object_id=new_user.id,
            changes={"email": new_user.email, "role": new_user.role}
        )

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.instance

        # Branch admins can only manage users in their branch
        if user.role == "branch_admin" and instance.branch != user.branch:
            raise PermissionDenied("You can only manage users assigned to your branch.")

        # Tenant isolation on branch reassignment
        new_branch = serializer.validated_data.get("branch")
        if new_branch and new_branch.company != user.company:
            raise PermissionDenied("Target branch does not belong to your company.")

        # Role elevation guard
        new_role = serializer.validated_data.get("role")
        if new_role and user.role == "branch_admin" and new_role not in ["branch_admin", "desk_staff"]:
            raise PermissionDenied("Branch Admins cannot assign roles higher than branch_admin.")

        old_is_active = instance.is_active
        old_branch = instance.branch

        # If branch changed, perform atomic reassignment cleanup
        if new_branch and new_branch != old_branch:
            from accounts.services.user_assignments import reassign_user_branch
            reassign_user_branch(actor=user, user=instance, new_branch=new_branch)

        updated = serializer.save()

        # Audit: deactivation
        if "is_active" in serializer.validated_data:
            new_active = serializer.validated_data["is_active"]
            if old_is_active and not new_active:
                log_audit(
                    actor=user,
                    company=user.company,
                    branch=instance.branch,
                    action="staff_deactivated",
                    object_type="User",
                    object_id=instance.id,
                    changes={"email": instance.email, "is_active": False}
                )
            elif not old_is_active and new_active:
                log_audit(
                    actor=user,
                    company=user.company,
                    branch=instance.branch,
                    action="staff_reactivated",
                    object_type="User",
                    object_id=instance.id,
                    changes={"email": instance.email, "is_active": True}
                )

        # Audit: branch reassignment
        if new_branch and old_branch != new_branch:
            log_audit(
                actor=user,
                company=user.company,
                branch=new_branch,
                action="staff_branch_reassigned",
                object_type="User",
                object_id=instance.id,
                changes={
                    "email": instance.email,
                    "from_branch": str(old_branch.id) if old_branch else None,
                    "to_branch": str(new_branch.id)
                }
            )

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == "branch_admin" and instance.branch != user.branch:
            raise PermissionDenied("You can only manage users assigned to your branch.")

        instance.is_active = False
        instance.save()

        log_audit(
            actor=self.request.user,
            company=self.request.user.company,
            branch=instance.branch,
            action="staff_deactivated",
            object_type="User",
            object_id=instance.id,
            changes={"email": instance.email, "role": instance.role, "is_active": False}
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="check-email",
        permission_classes=[IsCompanyAdmin],
        throttle_classes=[PublicSubmitThrottle]
    )
    def check_email(self, request):
        """
        Global email uniqueness check — validates against the real DB unique constraint.
        Returns {"available": false} if email exists ANYWHERE on the platform,
        without revealing which company owns the conflicting account.
        """
        email = request.query_params.get("email", "").strip()
        if not email:
            return Response({"available": False, "error": "Email is required."}, status=400)
        exists = User.objects.filter(email__iexact=email).exists()
        return Response({"available": not exists})

