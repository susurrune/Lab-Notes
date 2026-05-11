"""Test fixtures for the Lab Notes API."""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.db.base import Base

# Use a temporary database for tests
_db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_DB_PATH = _db_file.name
_db_file.close()

os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["APP_ENV"] = "testing"

from app.db.session import SessionLocal
from app.main import create_app

_test_engine = create_engine(
    f"sqlite:///{_DB_PATH}",
    connect_args={"check_same_thread": False},
)
Base.metadata.create_all(bind=_test_engine)
_TestingSessionLocal = sessionmaker(
    bind=_test_engine, expire_on_commit=False, class_=Session
)


def _get_test_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _reset_db():
    """Clear all data between tests."""
    with _test_engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture
def client():
    """Create a TestClient with overridden database dependency."""
    app = create_app()
    app.dependency_overrides[get_db] = _get_test_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def user_token(client):
    """Register a test user and return the auth token."""
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "display_name": "Test User",
            "email": "test@example.com",
            "password": "testpass123",
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    return data["access_token"]


@pytest.fixture
def auth_header(user_token):
    """Return Authorization header dict."""
    return {"Authorization": f"Bearer {user_token}"}
