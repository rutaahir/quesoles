from rest_framework.throttling import AnonRateThrottle

class PublicBurstThrottle(AnonRateThrottle):
    scope = "public_burst"

class PublicSubmitThrottle(AnonRateThrottle):
    scope = "public_submit"

class CompanySignupThrottle(AnonRateThrottle):
    scope = "company_signup"


