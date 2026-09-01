from rest_framework import serializers
from django.utils.text import slugify
from branches.models import Branch

class BranchSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(required=False)
    enabled_methods = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = "__all__"
        read_only_fields = ("company",)

    def get_enabled_methods(self, obj):
        try:
            return [int(m) for m in obj.queue_methods.filter(is_enabled=True).values_list("method", flat=True)]
        except Exception:
            return [1, 2]

    def validate(self, data):
        # Generate unique slug within the company if not provided
        if not data.get("slug") and data.get("name"):
            base_slug = slugify(data.get("name"))
            
            # Resolve company context
            company = None
            request = self.context.get("request")
            if request and hasattr(request, "user") and request.user.is_authenticated:
                company = request.user.company
                
            slug = base_slug
            if company:
                counter = 1
                # Check for existing branches with same slug under this company
                while Branch.objects.filter(company=company, slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
            data["slug"] = slug
            
        return data
