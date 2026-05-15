"""
Shared Pytest Fixtures for Math Topic Classifier Backend Tests.

Strategy:
  1. Set DATABASE_URL=sqlite:// BEFORE any app/database imports.
  2. When database.py is imported, it creates an in-memory SQLite engine.
  3. When app.py is imported, its `from database import SessionLocal`
     gets the SQLite-backed SessionLocal — no monkey-patching needed.
  4. Conftest uses that same engine for table cleanup.
"""

import os
import sys

# ── 1. Force environment BEFORE any app imports ───────────────────────────

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENDPOINT_URL"] = ""
os.environ["HF_TOKEN"] = ""
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"
os.environ["GOOGLE_CLIENT_SECRET"] = "test-client-secret"
os.environ["IYZICO_API_KEY"] = ""
os.environ["IYZICO_SECRET_KEY"] = ""

# Add the frontend directory to sys.path
FRONTEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if FRONTEND_DIR not in sys.path:
    sys.path.insert(0, FRONTEND_DIR)

# ── 2. Import app (triggers database.py import with SQLite URL) ───────────
#    Need to configure the in-memory SQLite engine with:
#      - connect_args={"check_same_thread": False}  (required for SQLite in-memory with threads)
#      - pool_class=StaticPool  (keeps one connection alive so in-memory DB persists)
#    We do this by re-creating the engine after database.py is first imported.

import database as db_module
from sqlalchemy import event, create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

# Replace the engine with a properly configured in-memory SQLite engine
db_module.engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
db_module.SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=db_module.engine
)

# Enable foreign keys for SQLite
@event.listens_for(db_module.engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# Now import app — this triggers Base.metadata.create_all on the NEW engine
# But app.py already ran create_all on the OLD engine at import time.
# We need to re-create tables on our new engine.
import app as app_module  # noqa: E402
from models import Base, User, Subscription

# Create all tables on the new in-memory engine
Base.metadata.create_all(bind=db_module.engine)


# ── 3. Fixtures ───────────────────────────────────────────────────────────

import pytest
from starlette.testclient import TestClient


@pytest.fixture(autouse=True)
def _clean_tables():
    """Truncate all tables before every test for isolation."""
    with db_module.engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()


@pytest.fixture()
def db_session():
    """Yield a database session using the same engine as the app."""
    session = db_module.SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture()
def client():
    """Unauthenticated TestClient."""
    with TestClient(app_module.app) as c:
        yield c


@pytest.fixture()
def authenticated_client(db_session):
    """TestClient pre-authenticated as a regular user ('testuser')."""
    from app import hash_password

    user = User(
        username="testuser",
        email="testuser@test.com",
        password_hash=hash_password("password123"),
        role="user",
        name="Test User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    db_session.add(Subscription(user_id=user.id, plan_type="free"))
    db_session.commit()

    with TestClient(app_module.app) as c:
        resp = c.post(
            "/api/login",
            data={"username": "testuser", "password": "password123"},
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        yield c


@pytest.fixture()
def admin_client(db_session):
    """TestClient pre-authenticated as an admin user ('adminuser')."""
    from app import hash_password

    user = User(
        username="adminuser",
        email="admin@test.com",
        password_hash=hash_password("adminpass"),
        role="admin",
        name="Admin User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    db_session.add(Subscription(user_id=user.id, plan_type="premium"))
    db_session.commit()

    with TestClient(app_module.app) as c:
        resp = c.post(
            "/api/login",
            data={"username": "adminuser", "password": "adminpass"},
        )
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        yield c
