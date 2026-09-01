from rest_framework import serializers
from kot.models import Printer, KotPrintJob

class PrinterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Printer
        fields = ["id", "branch", "company", "name", "connection_type", "last_status", "last_checked_at", "token", "created_at", "updated_at"]
        read_only_fields = ["id", "company", "token", "created_at", "updated_at"]

class KotPrintJobSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.token_number", read_only=True)
    service_name = serializers.CharField(source="ticket.service.name", read_only=True)
    customer_name = serializers.CharField(source="ticket.customer_name", read_only=True)
    created_at = serializers.DateTimeField(source="ticket.created_at", read_only=True)
    escpos_payload = serializers.SerializerMethodField()

    class Meta:
        model = KotPrintJob
        fields = ["id", "ticket", "printer", "status", "printed_at", "ticket_number", "service_name", "customer_name", "created_at", "escpos_payload"]
        read_only_fields = ["id", "printed_at"]

    def get_escpos_payload(self, obj):
        ticket = obj.ticket
        branch_name = ticket.branch.name if ticket.branch else "Quesole Branch"
        service_name = ticket.service.name if ticket.service else "General Service"
        created_time = ticket.created_at.strftime('%d-%m-%Y %H:%M') if ticket.created_at else ""
        return (
            f"[ESC_POS_RAW]\n"
            f"SIZE: 80mm\n"
            f"ALIGN: CENTER\n"
            f"TEXT: {branch_name.upper()}\n"
            f"TEXT: ------------------------\n"
            f"TEXT: TOKEN NUMBER: {ticket.token_number}\n"
            f"TEXT: Service: {service_name}\n"
            f"TEXT: Visitor: {ticket.customer_name}\n"
            f"TEXT: Date: {created_time}\n"
            f"TEXT: ------------------------\n"
            f"CUT: PAPER\n"
        )

from kot.models import Kiosk

class KioskSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()

    class Meta:
        model = Kiosk
        fields = [
            "id",
            "company",
            "branch",
            "kiosk_identifier",
            "pin",
            "status",
            "session_token",
            "connected_at",
            "last_seen",
            "is_logged_in",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "company", "session_token", "connected_at", "last_seen", "created_at", "updated_at"]

    def get_is_logged_in(self, obj):
        return obj.is_session_active()

class PublicKioskSerializer(serializers.ModelSerializer):
    is_logged_in = serializers.SerializerMethodField()

    class Meta:
        model = Kiosk
        fields = [
            "id",
            "kiosk_identifier",
            "status",
            "is_logged_in",
        ]

    def get_is_logged_in(self, obj):
        return obj.is_session_active()
