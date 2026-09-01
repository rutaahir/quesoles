from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from django.db import models
from .models import AlertRule, AlertEvent, Notification, NotificationTemplate
from .serializers import AlertRuleSerializer, AlertEventSerializer, NotificationSerializer, NotificationTemplateSerializer
from core.permissions import IsCompanyAdmin, IsBranchAdmin, IsCompanyAdminOnly

class AlertRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AlertRuleSerializer

    def get_permissions(self):
        if self.action in ["create", "destroy"]:
            return [IsCompanyAdminOnly()]
        if self.action in ["update", "partial_update"]:
            return [IsBranchAdmin()]
        # list/retrieve: desk_staff allowed (receive-only)
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return AlertRule.objects.none()
        if user.role == "super_admin":
            return AlertRule.objects.all()
        if user.role in ["branch_admin", "desk_staff"]:
            return AlertRule.objects.filter(company=user.company, branch=user.branch)
        return AlertRule.objects.filter(company=user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

class AlertEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AlertEvent.objects.all()
    serializer_class = AlertEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "super_admin":
            return AlertEvent.all_objects.all()
        return AlertEvent.objects.filter(company=user.company)

class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            user=user,
            company=user.company,
            branch=user.branch,
            channel="in_app"
        )

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_as_read(self, request):
        notifications = self.get_queryset().filter(is_read=False)
        count = notifications.update(is_read=True)
        return Response({"message": f"Marked {count} notifications as read."}, status=status.HTTP_200_OK)

class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsCompanyAdminOnly()]
        return [IsCompanyAdmin()]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return NotificationTemplate.objects.none()
        if user.role == "super_admin":
            return NotificationTemplate.objects.all()
        return NotificationTemplate.objects.filter(models.Q(company=user.company) | models.Q(company__isnull=True))

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "super_admin":
            serializer.save(company=None)
        else:
            serializer.save(company=user.company)
