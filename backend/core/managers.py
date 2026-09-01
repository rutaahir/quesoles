from django.db import models
from core.middleware import get_current_user

class TenantQuerySet(models.QuerySet):
    def for_user(self, user):
        """
        Filters the queryset for a given user.
        """
        if not user or not user.is_authenticated:
            return self.none()

        if user.role == 'super_admin':
            return self

        # Check model fields
        has_company = hasattr(self.model, 'company') or any(f.name == 'company' for f in self.model._meta.fields)
        has_branch = hasattr(self.model, 'branch') or any(f.name == 'branch' for f in self.model._meta.fields)

        if user.role == 'company_admin':
            if has_company:
                return self.filter(company=user.company)
            elif has_branch:
                return self.filter(branch__company=user.company)
            return self

        elif user.role in ['branch_admin', 'desk_staff']:
            if has_branch:
                return self.filter(branch=user.branch)
            elif has_company:
                return self.filter(company=user.company)
            return self

        return self.none()

class TenantManager(models.Manager):
    def get_queryset(self):
        qs = TenantQuerySet(self.model, using=self._db)
        user = get_current_user()
        if user:
            return qs.for_user(user)
        return qs
