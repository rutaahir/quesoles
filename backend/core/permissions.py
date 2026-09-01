from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "super_admin"

class IsCompanyAdmin(permissions.BasePermission):
    message = "Access is restricted."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "super_admin":
            return True
            
        # Check company active status
        company = request.user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
            
        return request.user.role == "company_admin"

class IsBranchAdmin(permissions.BasePermission):
    message = "Access is restricted."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "super_admin":
            return True
            
        # Check company active status
        company = request.user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
            
        return request.user.role in ["company_admin", "branch_admin"]

class IsDeskStaff(permissions.BasePermission):
    message = "Access is restricted."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "super_admin":
            return True
            
        # Check company active status
        company = request.user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
            
        return request.user.role in ["company_admin", "branch_admin", "desk_staff"]

class IsBranchAdminOnly(permissions.BasePermission):
    message = "Access is restricted to branch and company admins."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "super_admin":
            return True
            
        company = request.user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
            
        return request.user.role in ["company_admin", "branch_admin"]

class IsCompanyAdminOnly(permissions.BasePermission):
    message = "Access is restricted to company admins."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "super_admin":
            return True
            
        company = request.user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
            
        return request.user.role == "company_admin"

class IsCompanyActiveOrPublic(permissions.BasePermission):
    message = "Access is restricted."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return True
        if user.role == "super_admin":
            return True
        company = user.company
        if not company or company.status != "active":
            status_str = company.status if company else "unknown"
            self.message = f"Your company status is {status_str}. Access is restricted."
            return False
        return True
