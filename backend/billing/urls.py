from django.urls import path, include
from rest_framework.routers import DefaultRouter
from billing.views import (
    CheckoutSessionView,
    BuyAddOnView,
    UsageView,
    StripeSimulatorView,
    StripeWebhookView,
    StripeSuccessView,
    InvoiceViewSet,
    InvoiceDownloadView,
    PlanComponentViewSet,
    CompanyPlanAllocationViewSet,
    PlanPurchaseViewSet,
    QueueSolutionTypeViewSet,
    TokenDeliveryMethodViewSet,
    SubscriptionDurationTierViewSet,
    PriceChangeLogViewSet,
    BillingConfigView,
    CalculateQuoteView,
    CheckoutUpgradeView,
    CompanyBranchesSummaryView,
)

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("plan-components", PlanComponentViewSet, basename="plan-components")
router.register("allocations", CompanyPlanAllocationViewSet, basename="allocations")
router.register("purchases", PlanPurchaseViewSet, basename="purchases")
router.register("solution-types", QueueSolutionTypeViewSet, basename="solution-types")
router.register("token-delivery-methods", TokenDeliveryMethodViewSet, basename="token-delivery-methods")
router.register("duration-tiers", SubscriptionDurationTierViewSet, basename="duration-tiers")
router.register("price-change-logs", PriceChangeLogViewSet, basename="price-change-logs")

urlpatterns = [
    path("checkout/", CheckoutSessionView.as_view(), name="billing-checkout"),
    path("buy-addon/", BuyAddOnView.as_view(), name="billing-buy-addon"),
    path("usage/", UsageView.as_view(), name="billing-usage"),
    path("webhook/", StripeWebhookView.as_view(), name="billing-webhook"),
    path("config/", BillingConfigView.as_view(), name="billing-config"),
    path("calculate-quote/", CalculateQuoteView.as_view(), name="billing-calculate-quote"),
    path("checkout-upgrade/", CheckoutUpgradeView.as_view(), name="billing-checkout-upgrade"),
    path("company/branches-summary/", CompanyBranchesSummaryView.as_view(), name="billing-company-branches-summary"),
    
    # Public sandbox simulation endpoints
    path("public/stripe-simulator/", StripeSimulatorView.as_view(), name="stripe-simulator"),
    path("public/stripe/success/", StripeSuccessView.as_view(), name="stripe-success"),
    
    # PDF Invoice Downloader
    path("invoices/<int:invoice_id>/download/", InvoiceDownloadView.as_view(), name="invoice-download"),
    
    path("", include(router.urls)),
]
