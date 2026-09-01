from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from queuing.models import Ticket, Desk, Service, DeskService, UserService, DeskStaffAssignment
from audit.utils import log_audit

def is_no_service_mode(company):
    """
    Returns True if the company is in No-Service Mode (purchased_qty of services is explicitly 0).
    """
    if not company:
        return False
    from billing.models import CompanyPlanAllocation
    try:
        from django.db.models import Sum
        res = CompanyPlanAllocation.objects.filter(
            company=company,
            plan_component__key="services"
        ).aggregate(total=Sum('purchased_qty'))
        if res['total'] is not None and res['total'] == 0:
            return True
        return False
    except Exception:
        return False

def get_eligible_desks_for_service(service):
    """
    Returns desks in service.branch that are active and support the given service.
    """
    return Desk.objects.filter(
        branch=service.branch,
        is_active=True,
        desk_services__service=service
    ).distinct()

def get_eligible_staff_for_desk_and_service(desk, service):
    """
    Returns active staff users assigned to desk AND qualified for service via UserService.
    """
    from accounts.models import User
    return User.objects.filter(
        branch=desk.branch,
        is_active=True,
        desk_assignments__desk=desk,
        desk_assignments__is_active=True,
        user_services__service=service
    ).distinct()

def claim_next_ticket(desk, user):
    """
    Atomically claims the next eligible ticket for an operator desk and user.
    Uses select_for_update(skip_locked=True) inside a database transaction to prevent
    double-claiming by concurrent operators.
    """
    if user.role not in ["company_admin", "super_admin"]:
        if user.branch and desk.branch != user.branch:
            raise PermissionDenied("Operator and Desk must belong to the same branch.")
    if user.company and desk.company != user.company:
        raise PermissionDenied("Operator and Desk must belong to the same company.")

    if not desk.is_active or desk.status == "offline":
        desk.is_active = True
        desk.status = "open"
        desk.save(update_fields=["is_active", "status"])

    no_service = is_no_service_mode(desk.company)
    eligible_service_ids = []

    if not no_service:
        # Get services handled by this desk
        desk_service_ids = list(DeskService.objects.filter(desk=desk).values_list("service_id", flat=True))
        if not desk_service_ids:
            # Fallback to all active services in this branch if desk isn't explicitly restricted
            desk_service_ids = list(Service.objects.filter(branch=desk.branch, is_active=True).values_list("id", flat=True))

        # Get services user is qualified for
        qualified_service_ids = list(UserService.objects.filter(user=user).values_list("service_id", flat=True))
        
        # Intersection of desk services and user qualifications
        if qualified_service_ids:
            eligible_service_ids = [sid for sid in desk_service_ids if sid in qualified_service_ids]
        else:
            eligible_service_ids = desk_service_ids

        if not eligible_service_ids:
            return None

    now = timezone.now()

    with transaction.atomic():
        if no_service:
            waiting_qs = Ticket.objects.filter(
                Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=now),
                branch=desk.branch,
                status="waiting"
            ).order_by("created_at")
        else:
            waiting_qs = Ticket.objects.filter(
                Q(scheduled_for__isnull=True) | Q(scheduled_for__lte=now),
                branch=desk.branch,
                service_id__in=eligible_service_ids,
                status="waiting"
            ).order_by("created_at")

        # Get tickets that belong to this desk (either predicted or explicitly assigned)
        desk_qs = waiting_qs.filter(Q(predicted_desk=desk) | Q(desk=desk))

        # Atomic row lock on waiting ticket
        from django.db.utils import NotSupportedError
        try:
            ticket = desk_qs.select_for_update(skip_locked=True).first()
        except NotSupportedError:
            ticket = desk_qs.select_for_update().first()

        if not ticket:
            return None

        # Update ticket status atomically
        ticket.status = "called"
        ticket.called_at = now
        ticket.desk = desk
        ticket.served_by = user
        ticket.save()

        log_audit(
            actor=user,
            company=desk.company,
            branch=desk.branch,
            action="ticket_called",
            object_type="Ticket",
            object_id=ticket.id,
            changes={"token": ticket.token_number, "desk": desk.name, "served_by": user.email}
        )

        return ticket


def assign_predicted_desk_for_ticket(ticket):
    """
    Assigns a predicted desk to a waiting ticket based on load balancing.
    Uses select_for_update() inside a transaction to prevent race conditions.
    """
    from queuing.models import DeskService, Desk, Ticket
    
    no_service = is_no_service_mode(ticket.company)

    if no_service:
        eligible_desk_ids = list(Desk.objects.filter(
            branch=ticket.branch,
            is_active=True
        ).values_list("id", flat=True))
    else:
        if not ticket.service:
            return
        # 1. Find eligible desks (is_active=True and supports this service)
        eligible_desk_ids = list(DeskService.objects.filter(
            service=ticket.service,
            desk__branch=ticket.branch,
            desk__is_active=True
        ).values_list("desk_id", flat=True))

    if not eligible_desk_ids:
        return

    # Use select_for_update to lock eligible desks and serialize calculation
    with transaction.atomic():
        desks = list(Desk.objects.filter(id__in=eligible_desk_ids).select_for_update().order_by("id"))
        if not desks:
            return

        best_desk = None
        min_load = float("inf")

        for d in desks:
            load = Ticket.objects.filter(
                predicted_desk=d,
                status="waiting"
            ).count()

            if load < min_load:
                min_load = load
                best_desk = d

        if best_desk:
            ticket.predicted_desk = best_desk


def redistribute_tickets_for_deactivated_desk(desk):
    """
    Redistributes all waiting tickets predicted to a deactivated desk.
    """
    from queuing.models import Ticket
    from queuing.views import broadcast_queue_update
    with transaction.atomic():
        waiting_tickets = list(Ticket.objects.filter(
            predicted_desk=desk,
            status="waiting"
        ).select_for_update().order_by("created_at"))
        
        for t in waiting_tickets:
            t.predicted_desk = None
            assign_predicted_desk_for_ticket(t)
            t.save(update_fields=["predicted_desk"])
            try:
                broadcast_queue_update(t.branch.id, t)
            except Exception as e:
                pass


def reevaluate_predictions_for_desk(desk):
    """
    Re-evaluates waiting tickets predicted to a desk. If a ticket's service is
    no longer supported by the desk, it is redistributed.
    """
    if is_no_service_mode(desk.company):
        return

    from queuing.models import Ticket, DeskService
    from queuing.views import broadcast_queue_update
    with transaction.atomic():
        # Get active services supported by this desk
        supported_service_ids = list(
            DeskService.objects.filter(desk=desk).values_list("service_id", flat=True)
        )
        
        # If the desk has no services configured, it is no longer eligible.
        # Find all waiting tickets currently predicted to it and redistribute them.
        if not supported_service_ids:
            unsupported_tickets = list(Ticket.objects.filter(
                predicted_desk=desk,
                status="waiting"
            ).select_for_update().order_by("created_at"))
        else:
            unsupported_tickets = list(Ticket.objects.filter(
                predicted_desk=desk,
                status="waiting"
            ).exclude(service_id__in=supported_service_ids).select_for_update().order_by("created_at"))
            
        for t in unsupported_tickets:
            t.predicted_desk = None
            assign_predicted_desk_for_ticket(t)
            t.save(update_fields=["predicted_desk"])
            try:
                broadcast_queue_update(t.branch.id, t)
            except Exception as e:
                pass


