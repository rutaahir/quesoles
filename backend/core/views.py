from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from queuing_solutions.celery import app

def healthz(request):
    health_status = {
        'status': 'healthy',
        'database': 'disconnected',
        'redis': 'disconnected',
        'celery': 'disconnected',
    }
    is_healthy = True

    # 1. Database Check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['database'] = 'connected'
    except Exception as e:
        is_healthy = False
        health_status['status'] = 'unhealthy'
        health_status['database'] = f'error: {str(e)}'

    # 2. Redis Check
    try:
        cache.set("healthz_ping", "ok", timeout=5)
        if cache.get("healthz_ping") == "ok":
            health_status['redis'] = 'connected'
        else:
            is_healthy = False
            health_status['status'] = 'unhealthy'
    except Exception as e:
        is_healthy = False
        health_status['status'] = 'unhealthy'
        health_status['redis'] = f'error: {str(e)}'

    # 3. Celery Check
    try:
        # Ping workers with a tight timeout
        ping_res = app.control.ping(timeout=0.5)
        if ping_res:
            health_status['celery'] = 'connected'
        else:
            is_healthy = False
            health_status['status'] = 'unhealthy'
            health_status['celery'] = 'no_workers_found'
    except Exception as e:
        is_healthy = False
        health_status['status'] = 'unhealthy'
        health_status['celery'] = f'error: {str(e)}'


    status_code = 200 if is_healthy else 503
    return JsonResponse(health_status, status=status_code)


from rest_framework import serializers, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.models import ContactSubmission, DemoRequest, PartnershipRequest

class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at']

class ContactSubmissionView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ContactSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "Inquiry submitted successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DemoRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoRequest
        fields = ['id', 'name', 'email', 'phone', 'company_name', 'preferred_date', 'preferred_time', 'message', 'created_at']

class DemoRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DemoRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "Demo request submitted successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PartnershipRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnershipRequest
        fields = ['id', 'name', 'email', 'phone', 'company_name', 'partner_type', 'message', 'created_at']

class PartnershipRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PartnershipRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "message": "Partnership request submitted successfully"},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



