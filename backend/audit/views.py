from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsSuperAdmin, IsCompanyAdmin, IsBranchAdmin
from audit.models import AuditLog
from audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/audit-logs/          – list audit log entries (tenant-scoped)
    GET /api/audit-logs/{id}/     – retrieve single entry

    Access tiers:
      super_admin   → all logs, no company filter
      company_admin → scoped to their company
      branch_admin  → scoped to their company + their branch

    Query params:
      action        – filter by action name (e.g. "staff_deactivated")
      object_type   – filter by object type (e.g. "User")
      actor_id      – filter by actor user ID
      start_date    – ISO date lower bound on created_at (YYYY-MM-DD)
      end_date      – ISO date upper bound on created_at (YYYY-MM-DD)
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsCompanyAdmin]  # company_admin + super_admin pass this; branch_admin excluded

    def get_permissions(self):
        # Allow branch_admin to list/retrieve as well
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params

        # Super Admin: unrestricted view of all audit logs
        if user.role == "super_admin":
            qs = AuditLog.all_objects.all()
        # Company Admin: see all logs for their company
        elif user.role == "company_admin":
            qs = AuditLog.all_objects.filter(company=user.company)
        # Branch Admin: see logs scoped to their branch (and company for context)
        else:
            qs = AuditLog.all_objects.filter(company=user.company, branch=user.branch)

        # Optional filters
        if action := params.get("action"):
            qs = qs.filter(action=action)
        if object_type := params.get("object_type"):
            qs = qs.filter(object_type=object_type)
        if actor_id := params.get("actor_id"):
            qs = qs.filter(actor_id=actor_id)
        if start_date := params.get("start_date"):
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date := params.get("end_date"):
            qs = qs.filter(created_at__date__lte=end_date)

        return qs.order_by("-created_at")

