from django.urls import path, include
from rest_framework.routers import DefaultRouter
from appointments.views import (
    OtpSendView,
    OtpVerifyView,
    AppointmentSlotViewSet,
    BulkSlotCreateView,
    AppointmentBookingView,
    AppointmentManageView,
    AppointmentRescheduleView,
    AppointmentCancelView,
    TimeSlotViewSet,
    OnlineBookingViewSet,
    PublicCompanyResolveView,
    PublicBranchTimeSlotsView,
    PublicOnlineBookingCreateView,
    BookingPageConfigView,
)

router = DefaultRouter()
router.register("slots", AppointmentSlotViewSet, basename="appointment-slots")
router.register("time-slots", TimeSlotViewSet, basename="time-slots")
router.register("online-bookings", OnlineBookingViewSet, basename="online-bookings")

urlpatterns = [
    path("public/company-booking-config/", BookingPageConfigView.as_view(), name="company-booking-config"),
    path("public/appointments/otp/send/", OtpSendView.as_view(), name="otp-send"),
    path("public/appointments/otp/verify/", OtpVerifyView.as_view(), name="otp-verify"),
    path("public/appointments/slots/bulk-create/", BulkSlotCreateView.as_view(), name="slots-bulk-create"),
    path("public/appointments/book/", AppointmentBookingView.as_view(), name="appointment-book"),
    path("public/appointments/manage/<str:manage_code>/", AppointmentManageView.as_view(), name="appointment-manage"),
    path("public/appointments/manage/<str:manage_code>/reschedule/", AppointmentRescheduleView.as_view(), name="appointment-reschedule"),
    path("public/appointments/manage/<str:manage_code>/cancel/", AppointmentCancelView.as_view(), name="appointment-cancel"),
    
    # Public unauthenticated online booking flow URLs
    path("public/company/<str:slug>/", PublicCompanyResolveView.as_view(), name="public-company-resolve"),
    path("public/branches/<str:branch_id>/slots/", PublicBranchTimeSlotsView.as_view(), name="public-branch-time-slots"),
    path("public/bookings/", PublicOnlineBookingCreateView.as_view(), name="public-online-booking-create"),

    path("", include(router.urls)),
]
