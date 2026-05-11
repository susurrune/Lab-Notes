"""Tests for the auth endpoints."""


class TestRegister:
    def test_success(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "display_name": "New User",
                "email": "new@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["access_token"]
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["display_name"] == "New User"

    def test_duplicate_email(self, client, user_token):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "display_name": "Another",
                "email": "test@example.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 409
        assert "already registered" in resp.text.lower()

    def test_invalid_email(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "display_name": "Bad Email",
                "email": "not-an-email",
                "password": "password123",
            },
        )
        assert resp.status_code == 422

    def test_short_password(self, client):
        resp = client.post(
            "/api/v1/auth/register",
            json={
                "display_name": "Short Pwd",
                "email": "short@example.com",
                "password": "123",
            },
        )
        assert resp.status_code == 422


class TestLogin:
    def test_success(self, client, user_token):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "testpass123"},
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["access_token"]
        assert data["user"]["email"] == "test@example.com"

    def test_wrong_password(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpass"},
        )
        assert resp.status_code == 401

    def test_nonexistent_user(self, client):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "testpass123"},
        )
        assert resp.status_code == 401


class TestMe:
    def test_authenticated(self, client, auth_header):
        resp = client.get("/api/v1/auth/me", headers=auth_header)
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["email"] == "test@example.com"
        assert data["display_name"] == "Test User"

    def test_unauthenticated(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_invalid_token(self, client):
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"},
        )
        assert resp.status_code == 401
