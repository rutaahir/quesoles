from rest_framework import serializers
from appointments.models import Appointment, AppointmentSlot, TimeSlot, OnlineBooking

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id", "branch", "company", "service", "customer_name",
            "customer_phone", "slot_start", "slot_end", "status", "manage_code",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "company", "manage_code", "created_at", "updated_at"]

class AppointmentSlotSerializer(serializers.ModelSerializer):
    available_capacity = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentSlot
        fields = [
            "id", "branch", "company", "service", "slot_start", "slot_end",
            "capacity", "booked_count", "available_capacity", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "company", "booked_count", "available_capacity", "created_at", "updated_at"]

    def get_available_capacity(self, obj):
        return max(0, obj.capacity - obj.booked_count)


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = [
            "id", "branch", "service", "day_of_week", "specific_date",
            "start_date", "end_date", "repeat_weekly",
            "start_time", "end_time", "break_start_time", "break_end_time",
            "slot_duration_minutes", "max_bookings_per_slot",
            "is_active", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class OnlineBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlineBooking
        fields = [
            "id", "branch", "service", "customer_name", "customer_phone",
            "customer_email", "notes", "date", "slot_time", "booking_reference",
            "status", "created_at", "updated_at"
        ]
        read_only_fields = ["id", "booking_reference", "created_at", "updated_at"]
