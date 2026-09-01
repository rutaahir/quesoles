from rest_framework import serializers
from queuing.models import Desk, Service, DeskService, UserService, DeskStaffAssignment, QueueMethod, QrCode, Ticket, TicketNote, KotMessageTemplate, KotNotificationLog

class DeskSerializer(serializers.ModelSerializer):
    service_ids = serializers.SerializerMethodField()
    staff_name = serializers.SerializerMethodField()
    staff_id = serializers.SerializerMethodField()

    class Meta:
        model = Desk
        fields = "__all__"
        read_only_fields = ("company",)

    def get_service_ids(self, obj):
        return list(obj.desk_services.values_list("service_id", flat=True))

    def get_staff_name(self, obj):
        # Fetch name of currently assigned active staff user if exists
        assignment = obj.staff_assignments.filter(is_active=True).first()
        if assignment:
            user = assignment.user
            return f"{user.first_name} {user.last_name}".strip()
        return None

    def get_staff_id(self, obj):
        # Fetch ID of currently assigned active staff user if exists
        assignment = obj.staff_assignments.filter(is_active=True).first()
        return str(assignment.user.id) if assignment else None

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"
        read_only_fields = ("company",)

class DeskServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeskService
        fields = "__all__"

class UserServiceSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = UserService
        fields = "__all__"

class DeskStaffAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = DeskStaffAssignment
        fields = "__all__"

class QueueMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueueMethod
        fields = "__all__"
        read_only_fields = ("company",)
        extra_kwargs = {
            "branch": {"required": False, "allow_null": True}
        }

class QrCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = QrCode
        fields = "__all__"

class TicketSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    desk_label = serializers.CharField(source="desk.name", read_only=True)

    class Meta:
        model = Ticket
        fields = "__all__"
        read_only_fields = ("company", "branch", "token_number", "status", "called_at", "served_at", "closed_at")

class TicketNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketNote
        fields = "__all__"
        read_only_fields = ("user", "ticket")

    def get_author_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

class KotMessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = KotMessageTemplate
        fields = "__all__"
        read_only_fields = ("company",)

class KotNotificationLogSerializer(serializers.ModelSerializer):
    ticket_number = serializers.CharField(source="ticket.token_number", read_only=True)
    customer_name = serializers.CharField(source="ticket.customer_name", read_only=True)

    class Meta:
        model = KotNotificationLog
        fields = "__all__"
        read_only_fields = ("company", "branch", "ticket")
