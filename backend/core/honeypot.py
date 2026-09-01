from rest_framework.exceptions import ValidationError

def validate_honeypot(request_data):
    if not request_data:
        return
    # If hidden field is populated, reject the request as spam
    if request_data.get("website"):
        raise ValidationError("Spam detected.")
