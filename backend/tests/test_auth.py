import pytest
from django.urls import reverse
from rest_framework import status

def test_valid_login(api_client, seed_data):
    url = reverse("token_obtain_pair")
    response = api_client.post(url, {
        "email": "admin@comp-a.com",
        "password": "password123"
    })
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data
    assert response.data["user"]["email"] == "admin@comp-a.com"

def test_invalid_login(api_client, seed_data):
    url = reverse("token_obtain_pair")
    response = api_client.post(url, {
        "email": "admin@comp-a.com",
        "password": "wrongpassword"
    })
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_refresh_token(api_client, seed_data):
    url = reverse("token_obtain_pair")
    response = api_client.post(url, {
        "email": "admin@comp-a.com",
        "password": "password123"
    })
    refresh_token = response.data["refresh"]

    refresh_url = reverse("token_refresh")
    refresh_response = api_client.post(refresh_url, {
        "refresh": refresh_token
    })
    assert refresh_response.status_code == status.HTTP_200_OK
    assert "access" in refresh_response.data

@pytest.mark.django_db
def test_protected_healthz_endpoint_is_public(api_client):
    url = reverse("healthz")
    from unittest.mock import patch
    from queuing_solutions.celery import app
    with patch("django.core.cache.cache.set", return_value=True), \
         patch("django.core.cache.cache.get", return_value="ok"), \
         patch.object(app.control, "ping", return_value=["pong"]):
        response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK



def test_logout_blacklist(api_client, seed_data):
    url = reverse("token_obtain_pair")
    login_res = api_client.post(url, {
        "email": "admin@comp-a.com",
        "password": "password123"
    })
    access_token = login_res.data["access"]
    refresh_token = login_res.data["refresh"]

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    logout_url = reverse("token_blacklist")
    logout_res = api_client.post(logout_url, {
        "refresh": refresh_token
    })
    assert logout_res.status_code == status.HTTP_200_OK

    # Try to reuse the blacklisted refresh token
    refresh_url = reverse("token_refresh")
    api_client.credentials()  # clear credentials
    refresh_res = api_client.post(refresh_url, {
        "refresh": refresh_token
    })
    assert refresh_res.status_code == status.HTTP_401_UNAUTHORIZED
