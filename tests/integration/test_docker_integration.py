"""
Integration Test Suite — Docker Container Communication

Run AFTER `docker-compose -f docker-compose.test.yml up -d --build`.

Tests verify:
  1. Backend /health responds from the Docker container.
  2. Full user lifecycle: register → login → predict → history.
  3. Backend writes to and reads from PostgreSQL.
  4. Frontend (Nginx) serves the React app on port 3000.
"""

import requests
import pytest
import time

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

# ── Helpers ────────────────────────────────────────────────────────────────

def wait_for_service(url, timeout=60):
    """Block until the given URL responds with 200, or timeout."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                return True
        except requests.ConnectionError:
            pass
        time.sleep(2)
    pytest.fail(f"Service at {url} did not become ready within {timeout}s")


# ── Fixtures ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def _wait_for_stack():
    """Wait for both backend and frontend to be reachable."""
    wait_for_service(f"{BACKEND_URL}/health")
    wait_for_service(FRONTEND_URL)


@pytest.fixture()
def session():
    """Provide a requests.Session for cookie persistence."""
    return requests.Session()


# ── Tests ─────────────────────────────────────────────────────────────────

class TestBackendHealth:
    """Verify the backend container is responsive."""

    def test_health_endpoint(self):
        resp = requests.get(f"{BACKEND_URL}/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["mode"] == "demo"


class TestUserLifecycle:
    """Full register → login → predict → history lifecycle."""

    def test_full_lifecycle(self, session):
        # 1. Register
        reg_resp = session.post(
            f"{BACKEND_URL}/api/register",
            data={
                "username": "integration_user",
                "password": "integ_pass_123",
                "email": "integration@test.com",
            },
        )
        assert reg_resp.status_code == 200
        assert reg_resp.json()["success"] is True

        # 2. Login
        login_resp = session.post(
            f"{BACKEND_URL}/api/login",
            data={"username": "integration_user", "password": "integ_pass_123"},
        )
        assert login_resp.status_code == 200
        assert login_resp.json()["success"] is True
        assert "session_id" in session.cookies

        # 3. Predict
        predict_resp = session.post(
            f"{BACKEND_URL}/predict",
            data={"question": "Find the derivative of x^2"},
        )
        assert predict_resp.status_code == 200
        pred_data = predict_resp.json()
        assert pred_data["success"] is True
        assert "prediction" in pred_data
        assert "confidence" in pred_data

        # 4. History (verifies DB write + read)
        history_resp = session.get(f"{BACKEND_URL}/api/history")
        assert history_resp.status_code == 200
        history_data = history_resp.json()
        assert history_data["total"] >= 1
        assert any(
            h["question"] == "Find the derivative of x^2"
            for h in history_data["history"]
        )

        # 5. Logout
        logout_resp = session.get(f"{BACKEND_URL}/api/logout")
        assert logout_resp.status_code == 200


class TestDatabasePersistence:
    """Verify backend communicates with PostgreSQL."""

    def test_user_persists_across_sessions(self, session):
        # Register a user
        session.post(
            f"{BACKEND_URL}/api/register",
            data={
                "username": "persist_user",
                "password": "persist_pass",
                "email": "persist@test.com",
            },
        )

        # Login with a fresh session (new cookies)
        new_session = requests.Session()
        login_resp = new_session.post(
            f"{BACKEND_URL}/api/login",
            data={"username": "persist_user", "password": "persist_pass"},
        )
        assert login_resp.status_code == 200
        assert login_resp.json()["success"] is True


class TestFrontendServing:
    """Verify the Nginx frontend container serves the React app."""

    def test_frontend_responds(self):
        resp = requests.get(FRONTEND_URL, timeout=10)
        assert resp.status_code == 200

    def test_frontend_serves_html(self):
        resp = requests.get(FRONTEND_URL, timeout=10)
        assert "text/html" in resp.headers.get("Content-Type", "")

    def test_frontend_contains_react_root(self):
        resp = requests.get(FRONTEND_URL, timeout=10)
        assert "root" in resp.text
