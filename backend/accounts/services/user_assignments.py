from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from accounts.models import User
from queuing.models import Desk, Service, DeskStaffAssignment, UserService
from audit.utils import log_audit

def validate_branch_scope(branch, desk_ids=None, service_ids=None):
    """
    Validates that provided desk IDs and service IDs strictly belong to the specified branch.
    Prevents cross-branch desk or service assignments.
    """
    if desk_ids:
        invalid_desks = Desk.objects.filter(id__in=desk_ids).exclude(branch=branch)
        if invalid_desks.exists():
            raise ValidationError("All assigned desks must belong to the user's assigned branch.")

    if service_ids:
        invalid_services = Service.objects.filter(id__in=service_ids).exclude(branch=branch)
        if invalid_services.exists():
            raise ValidationError("All assigned services must belong to the user's assigned branch.")

def create_staff_with_assignments(actor, company, branch, user_data, role, desk_ids=None, service_ids=None):
    """
    Atomically creates a staff user and establishes Desk and Service qualification assignments.
    """
    if branch and branch.company != company:
        raise PermissionDenied("Branch does not belong to your company.")

    validate_branch_scope(branch, desk_ids, service_ids)

    with transaction.atomic():
        user = User.objects.create_user(
            email=user_data.get("email"),
            password=user_data.get("password"),
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            role=role,
            company=company,
            branch=branch,
            is_active=True
        )

        # Create Desk Assignments
        now = timezone.now()
        if desk_ids:
            for d_id in desk_ids:
                desk = Desk.objects.get(id=d_id, branch=branch)
                DeskStaffAssignment.objects.create(
                    desk=desk,
                    user=user,
                    shift_start=now,
                    shift_end=now + timezone.timedelta(hours=8),
                    is_active=True
                )

        # Create Service Qualification Assignments
        if service_ids:
            for s_id in service_ids:
                service = Service.objects.get(id=s_id, branch=branch)
                UserService.objects.create(
                    user=user,
                    service=service
                )

        log_audit(
            actor=actor,
            company=company,
            branch=branch,
            action="staff_user_created",
            object_type="User",
            object_id=user.id,
            changes={"email": user.email, "role": role, "desks": desk_ids, "services": service_ids}
        )

        return user

def reassign_user_branch(actor, user, new_branch):
    """
    Atomically reassigns a user to a new branch, clearing old desk and service assignments
    to ensure strict branch scope isolation.
    """
    if user.branch == new_branch:
        return user

    with transaction.atomic():
        old_branch = user.branch
        # Wipe old branch desk assignments
        DeskStaffAssignment.objects.filter(user=user).delete()
        # Wipe old branch service qualifications
        UserService.objects.filter(user=user).delete()

        user.branch = new_branch
        user.save()

        log_audit(
            actor=actor,
            company=user.company,
            branch=new_branch,
            action="user_branch_reassigned",
            object_type="User",
            object_id=user.id,
            changes={"old_branch": old_branch.name if old_branch else None, "new_branch": new_branch.name}
        )

        return user
