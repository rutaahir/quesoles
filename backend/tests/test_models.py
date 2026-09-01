import pytest
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from branches.models import Branch

User = get_user_model()

def test_user_email_uniqueness(db, seed_data):
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            User.objects.create_user(
                email="admin@comp-a.com",
                password="newpassword123",
                role="desk_staff",
                company=seed_data["company_b"]
            )

def test_branch_slug_uniqueness_per_company(db, seed_data):
    # Creating a branch with duplicate slug under Company A should fail
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Branch.objects.create(
                company=seed_data["company_a"],
                name="Another Branch A",
                slug="branch-a",
                address="Some road",
                city="Some city"
            )
    
    # Creating a branch with duplicate slug under Company B should succeed
    branch_b_alt = Branch.objects.create(
        company=seed_data["company_b"],
        name="Branch B Alt",
        slug="branch-a",
        address="Other road",
        city="Other city"
    )
    assert branch_b_alt.id is not None
