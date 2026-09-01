from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from core.permissions import IsBranchAdmin, IsBranchAdminOnly

from branches.models import Branch
from queuing.models import Service, Ticket, QueueMethod
from queuing.views import broadcast_queue_update
from kot.models import Printer, KotPrintJob
from kot.serializers import PrinterSerializer, KotPrintJobSerializer
from notifications.tasks import dispatch_notification

class KioskJoinView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        branch_id = request.data.get("branch_id")
        service_id = request.data.get("service_id")
        customer_name = request.data.get("customer_name") or "Kiosk Guest"

        if not branch_id or not service_id:
            return Response({"error": "Branch ID and Service ID are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            branch = Branch.objects.get(id=branch_id)
            service = Service.objects.get(id=service_id, branch=branch)
        except (Branch.DoesNotExist, Service.DoesNotExist):
            return Response({"error": "Invalid branch or service."}, status=status.HTTP_400_BAD_REQUEST)

        qm = QueueMethod.objects.filter(branch=branch, is_enabled=True).first()
        numbering_style = qm.config.get("numbering_style", "sequential") if qm else "sequential"

        try:
            with transaction.atomic():
                from queuing.models import TokenSequence
                next_seq = TokenSequence.get_next_sequence_number(branch)

                if numbering_style == "prefix":
                    prefix = service.prefix or "A"
                    token_number = f"{prefix}{next_seq:03d}"
                else:
                    token_number = f"{next_seq:03d}"

                ticket = Ticket.objects.create(
                    branch=branch,
                    company=branch.company,
                    service=service,
                    method="2",
                    token_number=token_number,
                    customer_name=customer_name,
                    source="kiosk",
                    source_method="KOT_PRINT",
                    status="waiting"
                )

                # Get first branch printer to assign print job
                printer = Printer.objects.filter(branch=branch).first()
                if printer:
                    KotPrintJob.objects.create(
                        ticket=ticket,
                        printer=printer,
                        status="queued"
                    )

                # Broadcast live updates to operators
                broadcast_queue_update(branch.id, ticket)

                return Response({
                    "id": ticket.id,
                    "token_number": ticket.token_number,
                    "customer_name": ticket.customer_name,
                    "service_name": service.name,
                    "source": ticket.source
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PrinterHeartbeatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        printer_id = request.data.get("printer_id")
        status_val = request.data.get("status")

        if not printer_id or not status_val:
            return Response({"error": "printer_id and status are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            printer = Printer.objects.get(id=printer_id)
            printer.last_status = status_val
            printer.last_checked_at = timezone.now()
            printer.save()

            if status_val == "offline":
                # Trigger Notification for branch/company admins
                from accounts.models import User
                branch_admins = User.objects.filter(company=printer.company, role="branch_admin", branch=printer.branch)
                for admin in branch_admins:
                    dispatch_notification(
                        user=admin,
                        company=printer.company,
                        branch=printer.branch,
                        trigger_type="device_offline",
                        title="Printer Offline Alert",
                        body=f"The printer '{printer.name}' is currently offline."
                    )

            return Response({"message": "Heartbeat updated successfully."}, status=status.HTTP_200_OK)
        except Printer.DoesNotExist:
            return Response({"error": "Printer not found."}, status=status.HTTP_404_NOT_FOUND)

class PrinterJobsView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_printer(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("PrinterToken "):
            return None
        token_str = auth_header.split(" ")[1]
        try:
            return Printer.objects.get(token=token_str)
        except Printer.DoesNotExist:
            return None

    def get(self, request):
        printer = self.get_authenticated_printer(request)
        if not printer:
            return Response({"error": "Device token authorization required."}, status=status.HTTP_401_UNAUTHORIZED)

        jobs = KotPrintJob.objects.filter(printer=printer, status="queued").order_by("created_at")
        return Response(KotPrintJobSerializer(jobs, many=True).data, status=status.HTTP_200_OK)

class PrinterJobCompleteView(APIView):
    permission_classes = [AllowAny]

    def get_authenticated_printer(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("PrinterToken "):
            return None
        token_str = auth_header.split(" ")[1]
        try:
            return Printer.objects.get(token=token_str)
        except Printer.DoesNotExist:
            return None

    def post(self, request, job_id):
        printer = self.get_authenticated_printer(request)
        if not printer:
            return Response({"error": "Device token authorization required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            job = KotPrintJob.objects.get(id=job_id, printer=printer)
            job.status = "printed"
            job.printed_at = timezone.now()
            job.save()
            return Response({"message": "Job printed successfully."}, status=status.HTTP_200_OK)
        except KotPrintJob.DoesNotExist:
            return Response({"error": "Print job not found for this device."}, status=status.HTTP_404_NOT_FOUND)

class PrinterViewSet(viewsets.ModelViewSet):
    queryset = Printer.objects.all()
    serializer_class = PrinterSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBranchAdminOnly()]
        return [IsBranchAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return Printer.objects.all()
        return Printer.objects.filter(company=user.company)

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from billing.models import CompanyPlanAllocation
        from django.db.models import Sum

        user = self.request.user
        company = user.company
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if not branch:
            branch_id = self.request.data.get("branch") or self.request.data.get("branch_id")
            if branch_id:
                from branches.models import Branch
                try:
                    branch = Branch.objects.get(id=branch_id, company=company)
                except Branch.DoesNotExist:
                    raise ValidationError("Specified branch not found in your company.")

        if not branch:
            raise ValidationError("You must specify a valid branch to create printers.")

        # Enforce kiosks branch-scoped plan limit
        alloc = CompanyPlanAllocation.objects.filter(company=company, branch=branch, plan_component__key="paper_roll_screens").first()
        if alloc:
            purchased_qty = alloc.purchased_qty
            current_total = Printer.objects.filter(branch=branch).count()
            limit_msg = f"Branch plan limit reached ({purchased_qty} kiosks allocated for this branch). Please purchase an add-on."
        else:
            # Fallback to company-wide pooled limit (legacy fallback)
            res = CompanyPlanAllocation.objects.filter(company=company, plan_component__key="paper_roll_screens").aggregate(total=Sum('purchased_qty'))
            purchased_qty = res['total'] if res['total'] is not None else 1
            current_total = Printer.objects.filter(company=company).count()
            limit_msg = f"Plan limit reached ({purchased_qty} kiosks allocated). Please purchase an add-on."

        if current_total >= purchased_qty:
            raise ValidationError({
                "limit_reached": True,
                "message": limit_msg
            })

        serializer.save(company=company, branch=branch)

import uuid
import random
from django.core.cache import cache
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from kot.models import Kiosk
from kot.serializers import KioskSerializer, PublicKioskSerializer

class KioskViewSet(viewsets.ModelViewSet):
    serializer_class = KioskSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsBranchAdmin()]
        return [IsBranchAdminOnly()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Kiosk.objects.none()
        if user.role == "super_admin":
            return Kiosk.objects.all()
        if user.role == "branch_admin":
            return Kiosk.objects.filter(company=user.company, branch=user.branch)
        return Kiosk.objects.filter(company=user.company)

    def perform_create(self, serializer):
        user = self.request.user
        branch = serializer.validated_data.get("branch") or getattr(user, "branch", None)
        if not branch:
            raise ValidationError("You must specify a branch to create a kiosk.")
        
        # Enforce kiosk quota
        from kot.provisioning import provision_kiosks_for_branch
        # Let's count existing kiosks
        current_count = Kiosk.objects.filter(branch=branch, status="active").count()
        
        # Determine quota
        from billing.models import CompanyPlanAllocation
        alloc = CompanyPlanAllocation.objects.filter(
            company=user.company, branch=branch, plan_component__key="paper_roll_screens"
        ).first()
        if alloc:
            quota = alloc.purchased_qty
        else:
            comp_alloc = CompanyPlanAllocation.objects.filter(
                company=user.company, branch__isnull=True, plan_component__key="paper_roll_screens"
            ).first()
            quota = comp_alloc.purchased_qty if comp_alloc else getattr(user.company.package, "max_kiosks", 0)

        if current_count >= quota:
            raise ValidationError(f"Plan limit reached: you cannot create more than {quota} active kiosks.")

        serializer.save(company=user.company, branch=branch)

    @action(detail=True, methods=["post"], url_path="regenerate-pin")
    def regenerate_pin(self, request, pk=None):
        kiosk = self.get_object()
        
        # Generate new random 4-digit PIN
        new_pin = "".join(str(random.randint(0, 9)) for _ in range(4))
        kiosk.pin = new_pin
        
        # Evict any active session
        old_token = kiosk.session_token
        kiosk.session_token = None
        kiosk.connected_at = None
        kiosk.last_seen = None
        kiosk.save()

        if old_token:
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kiosk_{kiosk.id}",
                        {
                            "type": "kiosk.force_logout",
                            "session_token": "evicted_by_admin"
                        }
                    )
                except Exception as e:
                    print(f"Failed to send force logout broadcast: {e}")

        return Response(KioskSerializer(kiosk).data, status=status.HTTP_200_OK)

class PublicKioskListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        if not branch_id:
            return Response({"error": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        kiosks = Kiosk.objects.filter(branch_id=branch_id, status="active").order_by("kiosk_identifier")
        return Response(PublicKioskSerializer(kiosks, many=True).data, status=status.HTTP_200_OK)

class KioskLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        kiosk_id = request.data.get("kiosk_id")
        pin = request.data.get("pin")

        if not kiosk_id or not pin:
            return Response({"error": "kiosk_id and pin are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Scoped failed attempts lockout key
        lockout_key = f"kiosk_lockout_{kiosk_id}"
        cooldown_key = f"kiosk_cooldown_{kiosk_id}"

        # Check cooldown
        if cache.get(cooldown_key):
            return Response({
                "error": "Too many failed attempts. Please try again after 60 seconds."
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        try:
            kiosk = Kiosk.objects.get(id=kiosk_id, status="active")
        except Kiosk.DoesNotExist:
            return Response({"error": "Kiosk not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        if kiosk.pin == pin:
            # Reset fails
            cache.delete(lockout_key)

            # Generate new session token
            new_session_token = str(uuid.uuid4())
            kiosk.session_token = new_session_token
            kiosk.connected_at = timezone.now()
            kiosk.last_seen = timezone.now()
            kiosk.save()

            # Evict any other active session
            channel_layer = get_channel_layer()
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"kiosk_{kiosk.id}",
                        {
                            "type": "kiosk.force_logout",
                            "session_token": new_session_token
                        }
                    )
                except Exception as e:
                    print(f"Eviction failed: {e}")

            return Response({
                "session_token": new_session_token,
                "kiosk_id": str(kiosk.id),
                "kiosk_identifier": kiosk.kiosk_identifier,
            }, status=status.HTTP_200_OK)
        else:
            # Increment failed attempts
            fails = cache.get(lockout_key, 0) + 1
            cache.set(lockout_key, fails, timeout=300) # 5 minutes lockout tracking window
            
            if fails >= 5:
                # Lock out kiosk for 60 seconds
                cache.set(cooldown_key, True, timeout=60)
                cache.delete(lockout_key)
                return Response({
                    "error": "Too many failed attempts. Please try again after 60 seconds."
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            return Response({"error": f"Invalid PIN. {5 - fails} attempts remaining."}, status=status.HTTP_400_BAD_REQUEST)

class KioskLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        kiosk_id = request.data.get("kiosk_id")
        session_token = request.data.get("session_token")

        if not kiosk_id or not session_token:
            return Response({"error": "kiosk_id and session_token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            kiosk = Kiosk.objects.get(id=kiosk_id, session_token=session_token)
            kiosk.session_token = None
            kiosk.connected_at = None
            kiosk.last_seen = None
            kiosk.save()
            return Response({"message": "Logout successful."}, status=status.HTTP_200_OK)
        except Kiosk.DoesNotExist:
            return Response({"error": "Invalid session or kiosk ID."}, status=status.HTTP_400_BAD_REQUEST)
