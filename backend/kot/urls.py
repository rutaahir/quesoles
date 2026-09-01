from django.urls import path, include
from rest_framework.routers import DefaultRouter
from kot.views import (
    KioskJoinView,
    PrinterHeartbeatView,
    PrinterJobsView,
    PrinterJobCompleteView,
    PrinterViewSet,
    KioskViewSet,
    PublicKioskListView,
    KioskLoginView,
    KioskLogoutView,
)

router = DefaultRouter()
router.register("devices", PrinterViewSet, basename="printers")
router.register("kiosks", KioskViewSet, basename="kiosks")

urlpatterns = [
    path("public/kiosk/join/", KioskJoinView.as_view(), name="kiosk-join"),
    path("printers/heartbeat/", PrinterHeartbeatView.as_view(), name="printer-heartbeat"),
    path("printers/jobs/pending/", PrinterJobsView.as_view(), name="printer-jobs-pending"),
    path("printers/jobs/<int:job_id>/complete/", PrinterJobCompleteView.as_view(), name="printer-job-complete"),
    path("public/kiosks/", PublicKioskListView.as_view(), name="public-kiosks-list"),
    path("public/kiosks/login/", KioskLoginView.as_view(), name="public-kiosks-login"),
    path("public/kiosks/logout/", KioskLogoutView.as_view(), name="public-kiosks-logout"),
    path("kot/", include(router.urls)),
]
