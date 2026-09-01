from django.contrib import admin
from core.models import ContactSubmission, DemoRequest, PartnershipRequest

@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'subject', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    list_filter = ('created_at',)

@admin.register(DemoRequest)
class DemoRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'company_name', 'preferred_date', 'preferred_time', 'created_at')
    search_fields = ('name', 'email', 'company_name', 'message')
    list_filter = ('preferred_date', 'created_at')

@admin.register(PartnershipRequest)
class PartnershipRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'company_name', 'partner_type', 'created_at')
    search_fields = ('name', 'email', 'company_name', 'message')
    list_filter = ('partner_type', 'created_at')


