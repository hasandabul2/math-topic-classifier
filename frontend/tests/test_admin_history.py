"""
Test Suite: History, Admin Stats & Subscription Routes
Covers /api/history, /api/admin/stats, /subscription, /upgrade-subscription
"""

import pytest


class TestHistory:
    """Tests for GET /api/history"""

    def test_history_requires_auth(self, client):
        """History without authentication returns 401."""
        resp = client.get("/api/history")
        assert resp.status_code == 401

    def test_history_returns_empty_initially(self, authenticated_client):
        """A new user should have an empty history."""
        resp = authenticated_client.get("/api/history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["history"] == []
        assert data["total"] == 0

    def test_history_populates_after_prediction(self, authenticated_client):
        """After making a prediction, history should contain one entry."""
        authenticated_client.post(
            "/predict",
            data={"question": "Solve x + 5 = 10"},
        )
        resp = authenticated_client.get("/api/history")
        data = resp.json()
        assert data["total"] >= 1
        entry = data["history"][0]
        assert "question" in entry
        assert "topic" in entry
        assert "confidence" in entry
        assert "timestamp" in entry
        assert "mode" in entry


class TestAdminStats:
    """Tests for GET /api/admin/stats"""

    def test_admin_stats_requires_admin_role(self, authenticated_client):
        """Regular user accessing admin stats returns 403."""
        resp = authenticated_client.get("/api/admin/stats")
        assert resp.status_code == 403

    def test_admin_stats_forbidden_without_auth(self, client):
        """Unauthenticated access to admin stats returns 401 or 403."""
        resp = client.get("/api/admin/stats")
        assert resp.status_code in (401, 403)

    def test_admin_stats_success_for_admin(self, admin_client):
        """Admin user gets 200 with stats object."""
        resp = admin_client.get("/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_predictions" in data
        assert "unique_users" in data
        assert "avg_confidence" in data
        assert "topic_distribution" in data
        assert "recent" in data

    def test_admin_stats_reflects_predictions(self, admin_client):
        """After admin makes a prediction, stats should reflect it."""
        admin_client.post(
            "/predict",
            data={"question": "Prove that sqrt(2) is irrational"},
        )
        resp = admin_client.get("/api/admin/stats")
        data = resp.json()
        assert data["total_predictions"] >= 1


class TestSubscription:
    """Tests for GET /subscription and POST /upgrade-subscription"""

    def test_subscription_requires_auth(self, client):
        """Subscription check without auth returns 401."""
        resp = client.get("/subscription")
        assert resp.status_code == 401

    def test_subscription_default_free(self, authenticated_client):
        """New user should have 'free' subscription tier."""
        resp = authenticated_client.get("/subscription")
        assert resp.status_code == 200
        data = resp.json()
        assert data["subscription"] == "free"
        assert data["username"] == "testuser"

    def test_upgrade_subscription(self, authenticated_client):
        """Upgrade subscription to 'pro' succeeds."""
        resp = authenticated_client.post(
            "/upgrade-subscription",
            data={"tier": "pro"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["subscription"] == "pro"

        # Verify the change persisted
        check_resp = authenticated_client.get("/subscription")
        assert check_resp.json()["subscription"] == "pro"

    def test_upgrade_invalid_tier(self, authenticated_client):
        """Upgrade to a non-existent tier returns 400."""
        resp = authenticated_client.post(
            "/upgrade-subscription",
            data={"tier": "ultra_mega_plan"},
        )
        assert resp.status_code == 400
        assert resp.json()["success"] is False
