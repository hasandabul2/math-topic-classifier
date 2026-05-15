"""
Test Suite: Authentication Routes
Covers /api/register, /api/login, /api/logout
"""

import pytest


class TestRegister:
    """Tests for POST /api/register"""

    def test_register_success(self, client):
        """Registration with valid data returns 200 and success message."""
        resp = client.post(
            "/api/register",
            data={
                "username": "newuser",
                "password": "securepass",
                "email": "new@example.com",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "Registration successful" in data["message"]

    def test_register_duplicate_username(self, client, db_session):
        """Registering with an existing username returns 400."""
        from app import hash_password
        from models import User

        db_session.add(User(
            username="existing",
            email="existing@test.com",
            password_hash=hash_password("pass"),
            role="user",
            name="existing",
        ))
        db_session.commit()

        resp = client.post(
            "/api/register",
            data={
                "username": "existing",
                "password": "anotherpass",
                "email": "different@test.com",
            },
        )
        assert resp.status_code == 400
        assert resp.json()["success"] is False

    def test_register_duplicate_email(self, client, db_session):
        """Registering with an existing email returns 400."""
        from app import hash_password
        from models import User

        db_session.add(User(
            username="user1",
            email="shared@test.com",
            password_hash=hash_password("pass"),
            role="user",
            name="user1",
        ))
        db_session.commit()

        resp = client.post(
            "/api/register",
            data={
                "username": "user2",
                "password": "pass2",
                "email": "shared@test.com",
            },
        )
        assert resp.status_code == 400
        assert resp.json()["success"] is False


class TestLogin:
    """Tests for POST /api/login"""

    def test_login_success(self, client, db_session):
        """Login with valid credentials returns 200, success, and sets cookie."""
        from app import hash_password
        from models import User, Subscription

        user = User(
            username="logintest",
            email="login@test.com",
            password_hash=hash_password("correct"),
            role="user",
            name="Login Test",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        db_session.add(Subscription(user_id=user.id, plan_type="free"))
        db_session.commit()

        resp = client.post(
            "/api/login",
            data={"username": "logintest", "password": "correct"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["username"] == "logintest"
        assert data["role"] == "user"
        # Verify session cookie was set
        assert "session_id" in resp.cookies

    def test_login_wrong_password(self, client, db_session):
        """Login with incorrect password returns 401."""
        from app import hash_password
        from models import User

        db_session.add(User(
            username="wrongpass",
            email="wrong@test.com",
            password_hash=hash_password("right"),
            role="user",
            name="Wrong",
        ))
        db_session.commit()

        resp = client.post(
            "/api/login",
            data={"username": "wrongpass", "password": "wrong"},
        )
        assert resp.status_code == 401
        assert resp.json()["success"] is False

    def test_login_nonexistent_user(self, client):
        """Login with a username that doesn't exist returns 401."""
        resp = client.post(
            "/api/login",
            data={"username": "ghost", "password": "anything"},
        )
        assert resp.status_code == 401


class TestLogout:
    """Tests for GET /api/logout"""

    def test_logout_clears_session(self, authenticated_client):
        """Logout returns 200 and clears the session cookie."""
        resp = authenticated_client.get("/api/logout")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    def test_logout_without_session(self, client):
        """Logout without a session still returns 200 gracefully."""
        resp = client.get("/api/logout")
        assert resp.status_code == 200
        assert resp.json()["success"] is True
