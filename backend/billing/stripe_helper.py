import stripe
import secrets
from django.conf import settings
from django.core.cache import cache

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", None)

def is_simulation_enabled():
    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    return getattr(settings, "STRIPE_SIMULATION", True) or not stripe_key

def create_checkout_session(company, package, billing_cycle, success_url, cancel_url):
    """
    Creates a Stripe Checkout Session for subscription checkout.
    If simulation is enabled, returns a local simulation URL.
    """
    if is_simulation_enabled():
        session_id = f"cs_sim_{secrets.token_hex(16)}"
        # Store metadata in Django cache to retrieve later
        session_data = {
            "id": session_id,
            "company_id": company.id,
            "package_id": package.id,
            "package_name": package.name,
            "billing_cycle": billing_cycle,
            "price": float(package.price_monthly if billing_cycle == "monthly" else package.price_yearly),
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        cache.set(session_id, session_data, timeout=3600)  # cache for 1 hour
        checkout_url = f"/api/billing/public/stripe-simulator/?session_id={session_id}"
        return session_id, checkout_url

    # Real Stripe Session Creation
    price_amount = package.price_monthly if billing_cycle == "monthly" else package.price_yearly
    price_in_cents = int(price_amount * 100)

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": f"Quesole - {package.name} ({billing_cycle.capitalize()})",
                },
                "unit_amount": price_in_cents,
                "recurring": {
                    "interval": "month" if billing_cycle == "monthly" else "year",
                },
            },
            "quantity": 1,
        }],
        mode="subscription",
        client_reference_id=str(company.id),
        metadata={
            "package_id": str(package.id),
            "billing_cycle": billing_cycle
        },
        success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=cancel_url,
    )
    return session.id, session.url

def retrieve_checkout_session(session_id):
    """
    Retrieves the Checkout Session.
    If it's a simulated session, returns cached mock details.
    """
    if session_id.startswith("cs_sim_"):
        data = cache.get(session_id)
        if not data:
            return None
        
        # Build mock Stripe-like session object
        class MockSession:
            def __init__(self, d):
                self.id = d["id"]
                self.client_reference_id = str(d["company_id"])
                self.customer = f"cus_sim_{secrets.token_hex(8)}"
                self.subscription = f"sub_sim_{secrets.token_hex(8)}"
                self.payment_status = "paid"
                self.metadata = {
                    "package_id": str(d["package_id"]),
                    "billing_cycle": d["billing_cycle"]
                }
                self.amount_total = int(d["price"] * 100)
                self.currency = "usd"
        return MockSession(data)

    return stripe.checkout.Session.retrieve(session_id)
