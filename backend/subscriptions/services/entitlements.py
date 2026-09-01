from billing.models import CompanyPlanAllocation

def get_company_entitlements(company):
    """
    Centralized backend entitlement service for company limits and feature gates.
    Derives limits from CompanyPlanAllocation records and package feature_flags.
    """
    sub = company.subscriptions.first()
    pkg = company.package if hasattr(company, 'package') and company.package else None

    # Default package feature flags
    pkg_features = pkg.feature_flags if pkg else {}
    sub_overrides = sub.feature_overrides if sub else {}

    def is_feature_enabled(key):
        return pkg_features.get(key, False) or sub_overrides.get(key, False)

    # Entitlements structure
    allocations = CompanyPlanAllocation.objects.filter(company=company)
    alloc_map = {}
    for a in allocations:
        key = a.plan_component.key
        alloc_map[key] = alloc_map.get(key, 0) + a.purchased_qty

    branch_limit = alloc_map.get("branches", pkg.max_branches if pkg else 1)
    user_limit = alloc_map.get("users", pkg.max_users if pkg else 5)
    desk_limit = alloc_map.get("operator_screens", 10)
    service_limit = alloc_map.get("services", 10)

    current_branches = company.branches.filter(status="active").count()
    current_users = company.users.filter(is_active=True).count()
    current_desks = company.desks.filter(is_active=True).count()
    current_services = company.services.filter(is_active=True).count()

    return {
        "branches": {
            "used": current_branches,
            "limit": branch_limit,
            "can_create": current_branches < branch_limit,
        },
        "users": {
            "used": current_users,
            "limit": user_limit,
            "can_create": current_users < user_limit,
        },
        "desks": {
            "used": current_desks,
            "limit": desk_limit,
            "can_create": current_desks < desk_limit,
        },
        "services": {
            "used": current_services,
            "limit": service_limit,
            "can_create": current_services < service_limit,
        },
        "features": {
            "method_1": True,  # Method 1 (Single QR) unlocked by default
            "method_2": is_feature_enabled("method2") or is_feature_enabled("method_2"),
            "method_3": is_feature_enabled("method3") or is_feature_enabled("method_3"),
            "method_4": is_feature_enabled("method4") or is_feature_enabled("method_4"),
            "display": is_feature_enabled("display"),
            "appointments": is_feature_enabled("appointments"),
            "kot": is_feature_enabled("kot"),
        }
    }

def check_company_limit(company, resource_key):
    ent = get_company_entitlements(company)
    if resource_key in ent:
        return ent[resource_key]["can_create"], ent[resource_key]["used"], ent[resource_key]["limit"]
    return True, 0, 9999
