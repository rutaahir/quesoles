import logging
from celery import shared_task
from django.utils import timezone
from django.db import models
from django.db.models import Avg, Count
from datetime import datetime, timedelta

from queuing.models import Ticket
from branches.models import Branch
from analytics.models import ReportSnapshot
from notifications.tasks import dispatch_notification
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task
def aggregate_daily_snapshots():
    logger.info("Running aggregate_daily_snapshots task...")
    now = timezone.now()
    today_date = now.date()
    
    start_of_day = timezone.make_aware(datetime.combine(today_date, datetime.min.time()))
    end_of_day = timezone.make_aware(datetime.combine(today_date, datetime.max.time()))
    
    active_branches = Branch.objects.filter(status="active")
    for branch in active_branches:
        tickets = Ticket.objects.filter(
            branch=branch,
            created_at__range=(start_of_day, end_of_day)
        )
        
        total_tickets = tickets.count()
        served_tickets = tickets.filter(status="served")
        served_count = served_tickets.count()
        no_show_count = tickets.filter(status="no_show").count()
        
        avg_wait = 0
        served_with_wait = served_tickets.filter(called_at__isnull=False)
        if served_with_wait.exists():
            total_wait_sec = 0
            for t in served_with_wait:
                total_wait_sec += (t.called_at - t.created_at).total_seconds()
            avg_wait = (total_wait_sec / served_with_wait.count()) / 60.0
            
        avg_handle = 0
        served_with_handle = served_tickets.filter(called_at__isnull=False, served_at__isnull=False)
        if served_with_handle.exists():
            total_handle_sec = 0
            for t in served_with_handle:
                total_handle_sec += (t.served_at - t.called_at).total_seconds()
            avg_handle = (total_handle_sec / served_with_handle.count()) / 60.0
            
        peak_hours = {}
        for t in tickets:
            hour_str = t.created_at.strftime("%H")
            peak_hours[hour_str] = peak_hours.get(hour_str, 0) + 1
            
        staff_perf = []
        operators = User.objects.filter(company=branch.company, branch=branch, role="desk_staff")
        for op in operators:
            op_tickets = tickets.filter(served_by=op, status="served")
            op_served = op_tickets.count()
            op_avg_handle = 0
            op_tickets_with_handle = op_tickets.filter(called_at__isnull=False, served_at__isnull=False)
            if op_tickets_with_handle.exists():
                op_total_handle = sum((t.served_at - t.called_at).total_seconds() for t in op_tickets_with_handle)
                op_avg_handle = (op_total_handle / op_tickets_with_handle.count()) / 60.0
            staff_perf.append({
                "operator_id": op.id,
                "operator_name": f"{op.first_name} {op.last_name}",
                "served_count": op_served,
                "avg_handle_minutes": op_avg_handle
            })
            
        metrics = {
            "total_tickets": total_tickets,
            "served_count": served_count,
            "no_show_count": no_show_count,
            "avg_wait_minutes": avg_wait,
            "avg_handle_minutes": avg_handle,
            "peak_hours": peak_hours,
            "staff_performance": staff_perf
        }
        
        ReportSnapshot.objects.filter(branch=branch, report_date=today_date).delete()
        snapshot = ReportSnapshot.objects.create(
            branch=branch,
            company=branch.company,
            report_date=today_date,
            metrics=metrics
        )
        
        company_admins = User.objects.filter(company=branch.company, role="company_admin")
        title = f"Scheduled Daily Report Ready: {today_date}"
        body = f"The nightly queue summary snapshot for {branch.name} has been pre-aggregated and is ready to view."
        
        for ca in company_admins:
            dispatch_notification(
                user=ca,
                company=branch.company,
                branch=branch,
                trigger_type="report_ready",
                title=title,
                body=body
            )
            
    logger.info("Report snapshots aggregation finished.")
