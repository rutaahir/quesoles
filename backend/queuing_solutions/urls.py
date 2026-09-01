from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from analytics.views import ReportTrendsView, ReportExportView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from core.views import healthz, ContactSubmissionView, DemoRequestView, PartnershipRequestView
from accounts.views import CustomTokenObtainPairView, LogoutView, UserInviteViewSet, InviteAcceptView, UserViewSet
from companies.views import CompanyRegistrationView, CompanyViewSet, CheckSlugView
from branches.views import BranchViewSet
from billing.views import PackageViewSet, UpgradeRequestViewSet
from audit.views import AuditLogViewSet
from queuing.views import (
    DeskViewSet,
    ServiceViewSet,
    DeskServiceViewSet,
    UserServiceViewSet,
    DeskStaffAssignmentViewSet,
    QueueMethodViewSet,
    QrCodeGenerateView,
    PublicJoinQueueView,
    VerifyLocationView,
    ManualTicketIssueView,
    TicketViewSet,
    PublicTrackingView,
    PublicDisplayView,
    PublicTicketCancelView,
    PublicTicketDetailView,
    KotMessageTemplateViewSet,
    KotNotificationLogViewSet
)

router = DefaultRouter()
router.register("packages", PackageViewSet, basename="packages")
router.register("companies", CompanyViewSet, basename="companies")
router.register("branches", BranchViewSet, basename="branches")
router.register("invites", UserInviteViewSet, basename="invites")
router.register("users", UserViewSet, basename="users")
router.register("upgrades", UpgradeRequestViewSet, basename="upgrades")
router.register("audit-logs", AuditLogViewSet, basename="audit-logs")

# Phase 2 ViewSets
router.register("desks", DeskViewSet, basename="desks")
router.register("services", ServiceViewSet, basename="services")
router.register("desk-services", DeskServiceViewSet, basename="desk-services")
router.register("user-services", UserServiceViewSet, basename="user-services")
router.register("desk-staff-assignments", DeskStaffAssignmentViewSet, basename="desk-staff-assignments")
router.register("queue-methods", QueueMethodViewSet, basename="queue-methods")
router.register("tickets", TicketViewSet, basename="tickets")
router.register("kot-message-templates", KotMessageTemplateViewSet, basename="kot-message-templates")
router.register("kot-notification-logs", KotNotificationLogViewSet, basename="kot-notification-logs")

# Phase 3 ViewSets
from notifications.views import AlertRuleViewSet, AlertEventViewSet, NotificationViewSet, NotificationTemplateViewSet
router.register("alert-rules", AlertRuleViewSet, basename="alert-rules")
router.register("alert-events", AlertEventViewSet, basename="alert-events")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("notification-templates", NotificationTemplateViewSet, basename="notification-templates")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz", healthz, name="healthz"),
    path("", include("django_prometheus.urls")),
    
    # API Schema and docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    
    # Auth endpoints
    path("api/auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="token_blacklist"),
    
    # Onboarding & Invites
    path("api/companies/register/", CompanyRegistrationView.as_view(), name="company_register"),
    path("api/companies/check-slug/", CheckSlugView.as_view(), name="company_check_slug"),
    path("api/invites/accept/", InviteAcceptView.as_view(), name="invite_accept"),
    path("api/contact/", ContactSubmissionView.as_view(), name="contact_submit"),
    path("api/demo-request/", DemoRequestView.as_view(), name="demo_request_submit"),
    path("api/partnership-request/", PartnershipRequestView.as_view(), name="partnership_request_submit"),
    
    # Phase 2 public & branch actions
    path("api/branches/<str:branch_id>/generate-qr/", QrCodeGenerateView.as_view(), name="generate_qr"),
    path("api/public/join/", PublicJoinQueueView.as_view(), name="public_join"),
    path("api/public/verify-location/", VerifyLocationView.as_view(), name="public_verify_location"),
    path("api/tickets/manual-issue/", ManualTicketIssueView.as_view(), name="tickets_manual_issue"),
    path("api/public/tracking/<str:tracking_code>/", PublicTrackingView.as_view(), name="public_tracking"),
    path("api/public/ticket/<str:ticket_id>/", PublicTicketDetailView.as_view(), name="public_ticket_detail"),
    path("api/public/display/<str:branch_id>/", PublicDisplayView.as_view(), name="public_display"),
    path("api/public/tickets/<str:tracking_code>/cancel/", PublicTicketCancelView.as_view(), name="public_ticket_cancel"),
    
    # Phase 3 reporting actions
    path("api/reports/trends/", ReportTrendsView.as_view(), name="report_trends"),
    path("api/reports/export/", ReportExportView.as_view(), name="report_export"),
    
    # Router endpoints
    path("api/billing/", include("billing.urls")),
    path("api/", include("appointments.urls")),
    path("api/", include("kot.urls")),
    path("api/", include(router.urls)),
]
