from audit.models import AuditLog

def log_audit(actor, company, branch, action, object_type, object_id, changes=None, ip_address=None):
    """
    Creates a row in the AuditLog database table to log a security/administrative action.
    """
    if changes is None:
        changes = {}
        
    return AuditLog.objects.create(
        actor=actor,
        company=company,
        branch=branch,
        action=action,
        object_type=object_type,
        object_id=str(object_id) if object_id is not None else "",
        changes=changes,
        ip_address=ip_address or ""
    )
