"""Tests for the datasets endpoints."""

from uuid import uuid4


class TestCreate:
    def test_create_authenticated(self, client, auth_header):
        resp = client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={
                "name": "My Experiment",
                "payload": {"kind": "record", "data": "some data"},
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["name"] == "My Experiment"
        assert data["payload"]["kind"] == "record"
        assert data["datasetVersion"] == 1

    def test_create_without_auth(self, client):
        dataset_id = str(uuid4())
        resp = client.post(
            "/api/v1/datasets",
            json={
                "id": dataset_id,
                "name": "Anonymous Dataset",
                "payload": {"kind": "record"},
            },
        )
        assert resp.status_code == 201
        data = resp.json()["data"]
        assert data["id"] == dataset_id
        assert data["name"] == "Anonymous Dataset"

    def test_create_uses_authenticated_owner(self, client, user_token, auth_header):
        """Authenticated user should be set as owner automatically."""
        resp = client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={
                "name": "My Dataset",
                "payload": {"kind": "record"},
            },
        )
        assert resp.status_code == 201
        # Get current user ID
        me = client.get("/api/v1/auth/me", headers=auth_header).json()["data"]
        # The dataset should be owned by the authenticated user
        ds_id = resp.json()["data"]["id"]
        ds = client.get(
            f"/api/v1/datasets/{ds_id}", headers=auth_header
        ).json()["data"]
        assert ds["ownerId"] == me["id"]


class TestList:
    def test_list_authenticated_shows_own(self, client, auth_header):
        # Create 2 datasets as authenticated user
        for i in range(2):
            client.post(
                "/api/v1/datasets",
                headers=auth_header,
                json={"name": f"My Dataset {i}", "payload": {"kind": "record"}},
            )
        resp = client.get("/api/v1/datasets", headers=auth_header)
        assert resp.status_code == 200
        items = resp.json()["data"]
        assert len(items) == 2

    def test_list_shows_all_without_auth(self, client):
        for i in range(2):
            client.post(
                "/api/v1/datasets",
                json={
                    "name": f"Anon Dataset {i}",
                    "payload": {"kind": "record"},
                    "ownerId": f"anon-{i}",
                },
            )
        resp = client.get("/api/v1/datasets")
        assert resp.status_code == 200
        items = resp.json()["data"]
        assert len(items) == 2

    def test_list_does_not_show_other_users_data(self, client, auth_header):
        # Create one dataset as auth user
        client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={"name": "Mine", "payload": {"kind": "record"}},
        )
        # Create another dataset as anonymous
        client.post(
            "/api/v1/datasets",
            json={
                "name": "Theirs",
                "payload": {"kind": "record"},
                "ownerId": "other-user",
            },
        )
        # Auth user should only see their own
        resp = client.get("/api/v1/datasets", headers=auth_header)
        names = [item["name"] for item in resp.json()["data"]]
        assert "Mine" in names
        assert "Theirs" not in names


class TestGet:
    def test_get_own_dataset(self, client, auth_header):
        created = client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={"name": "Get Test", "payload": {"kind": "record"}},
        ).json()["data"]
        resp = client.get(f"/api/v1/datasets/{created['id']}", headers=auth_header)
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Get Test"

    def test_get_others_dataset_denied(self, client, auth_header):
        # Create dataset as anonymous
        anon = client.post(
            "/api/v1/datasets",
            json={
                "name": "Not Mine",
                "payload": {"kind": "record"},
                "ownerId": "someone-else",
            },
        ).json()["data"]
        # Auth user should get 403
        resp = client.get(
            f"/api/v1/datasets/{anon['id']}", headers=auth_header
        )
        assert resp.status_code == 403

    def test_get_nonexistent(self, client, auth_header):
        resp = client.get(
            f"/api/v1/datasets/{uuid4()}", headers=auth_header
        )
        assert resp.status_code == 404


class TestUpdate:
    def test_update_own_dataset(self, client, auth_header):
        created = client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={"name": "Before", "payload": {"kind": "record"}},
        ).json()["data"]
        resp = client.put(
            f"/api/v1/datasets/{created['id']}",
            headers=auth_header,
            json={"name": "After", "payload": {"kind": "record"}},
        )
        assert resp.status_code == 200
        updated = resp.json()["data"]
        assert updated["name"] == "After"
        assert updated["datasetVersion"] == 2  # Version bumped

    def test_update_others_dataset_denied(self, client, auth_header):
        anon = client.post(
            "/api/v1/datasets",
            json={
                "name": "Not Mine",
                "payload": {"kind": "record"},
                "ownerId": "someone-else",
            },
        ).json()["data"]
        resp = client.put(
            f"/api/v1/datasets/{anon['id']}",
            headers=auth_header,
            json={"name": "Hacked", "payload": {"kind": "record"}},
        )
        assert resp.status_code == 403

    def test_update_nonexistent(self, client, auth_header):
        resp = client.put(
            f"/api/v1/datasets/{uuid4()}",
            headers=auth_header,
            json={"name": "Ghost", "payload": {}},
        )
        assert resp.status_code == 404


class TestDelete:
    def test_delete_own_dataset(self, client, auth_header):
        created = client.post(
            "/api/v1/datasets",
            headers=auth_header,
            json={"name": "Delete Me", "payload": {"kind": "record"}},
        ).json()["data"]
        resp = client.delete(
            f"/api/v1/datasets/{created['id']}", headers=auth_header
        )
        assert resp.status_code == 200
        assert resp.json()["data"]["deleted"] is True

    def test_delete_others_dataset_denied(self, client, auth_header):
        anon = client.post(
            "/api/v1/datasets",
            json={
                "name": "Not Mine",
                "payload": {"kind": "record"},
                "ownerId": "someone-else",
            },
        ).json()["data"]
        resp = client.delete(
            f"/api/v1/datasets/{anon['id']}", headers=auth_header
        )
        assert resp.status_code == 403

    def test_delete_nonexistent(self, client, auth_header):
        resp = client.delete(
            f"/api/v1/datasets/{uuid4()}", headers=auth_header
        )
        assert resp.status_code == 404
