"""
Test Suite: Prediction Routes
Covers /predict, /random-question, /health
"""

import pytest

# The 8-topic taxonomy that every prediction must belong to.
VALID_TOPICS = {
    "Algebra",
    "Geometry and Trigonometry",
    "Calculus and Analysis",
    "Probability and Statistics",
    "Number Theory",
    "Combinatorics and Discrete Math",
    "Linear Algebra",
    "Abstract Algebra and Topology",
}


class TestHealth:
    """Tests for GET /health"""

    def test_health_returns_ok(self, client):
        """Health endpoint returns 200 with status ok."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    def test_health_reports_demo_mode(self, client):
        """In test env (no ENDPOINT_URL), mode should be 'demo'."""
        resp = client.get("/health")
        data = resp.json()
        assert data["mode"] == "demo"


class TestRandomQuestion:
    """Tests for GET /random-question"""

    def test_returns_question_string(self, client):
        """Random question endpoint returns a non-empty question."""
        resp = client.get("/random-question")
        assert resp.status_code == 200
        data = resp.json()
        assert "question" in data
        assert isinstance(data["question"], str)
        assert len(data["question"]) > 0

    def test_returns_different_questions(self, client):
        """Multiple calls should eventually return different questions."""
        questions = set()
        for _ in range(20):
            resp = client.get("/random-question")
            questions.add(resp.json()["question"])
        # With 24 sample questions and 20 calls, we should get at least 2 distinct
        assert len(questions) >= 2


class TestPredict:
    """Tests for POST /predict"""

    def test_predict_requires_auth(self, client):
        """Prediction without authentication returns 401."""
        resp = client.post("/predict", data={"question": "Solve x^2 = 4"})
        assert resp.status_code == 401

    def test_predict_success(self, authenticated_client):
        """Authenticated prediction returns topic and confidence."""
        resp = authenticated_client.post(
            "/predict",
            data={"question": "Find the derivative of x^3"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "prediction" in data
        assert "confidence" in data
        assert "rationale" in data

    def test_predict_returns_valid_topic(self, authenticated_client):
        """Prediction must be one of the 8 valid math topics."""
        resp = authenticated_client.post(
            "/predict",
            data={"question": "What is the probability of rolling a 6?"},
        )
        data = resp.json()
        assert data["prediction"] in VALID_TOPICS

    def test_predict_confidence_range(self, authenticated_client):
        """Confidence score must be between 0 and 100."""
        resp = authenticated_client.post(
            "/predict",
            data={"question": "Solve the quadratic equation x^2 - 5x + 6 = 0"},
        )
        data = resp.json()
        assert 0 <= data["confidence"] <= 100

    def test_predict_includes_rationale(self, authenticated_client):
        """Response should include an XAI rationale string."""
        resp = authenticated_client.post(
            "/predict",
            data={"question": "Find the eigenvalues of the matrix [[1,2],[3,4]]"},
        )
        data = resp.json()
        assert isinstance(data["rationale"], str)
        assert len(data["rationale"]) > 0

    def test_predict_saves_to_history(self, authenticated_client):
        """After a prediction, the question should appear in user history."""
        question = "Integrate x^2 dx from 0 to 1"
        authenticated_client.post("/predict", data={"question": question})

        history_resp = authenticated_client.get("/api/history")
        history = history_resp.json()["history"]
        questions_in_history = [h["question"] for h in history]
        assert question in questions_in_history
