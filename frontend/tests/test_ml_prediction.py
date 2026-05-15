"""
Test Suite: ML Prediction Engine & XAI Rationale Generator

Tests the core ML-adjacent functions that run without GPU or model weights:
  - get_mock_prediction: keyword-based topic classification
  - generate_rationale: XAI explanation generator
  - get_real_prediction: HF Space API interaction (mocked HTTP)
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Ensure imports resolve
FRONTEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if FRONTEND_DIR not in sys.path:
    sys.path.insert(0, FRONTEND_DIR)

from app import get_mock_prediction, generate_rationale, get_real_prediction, TOPICS


# ── Mock Prediction Engine ─────────────────────────────────────────────────

class TestMockPrediction:
    """Tests for the keyword-based mock prediction engine."""

    def test_algebra_classification(self):
        """Algebraic question should classify as Algebra."""
        result = get_mock_prediction("Solve the quadratic equation x^2 + 3x = 0")
        assert result["label"] == "Algebra"

    def test_calculus_classification(self):
        """Calculus question should classify as Calculus and Analysis."""
        result = get_mock_prediction("Find the derivative of f(x) = x^3 - 2x")
        assert result["label"] == "Calculus and Analysis"

    def test_linear_algebra_classification(self):
        """Linear algebra question should classify as Linear Algebra."""
        result = get_mock_prediction("Find the eigenvalues of the matrix [[1,2],[3,4]]")
        assert result["label"] == "Linear Algebra"

    def test_probability_classification(self):
        """Probability question should classify as Probability and Statistics."""
        result = get_mock_prediction(
            "What is the probability of rolling a sum of 7 with two dice?"
        )
        assert result["label"] == "Probability and Statistics"

    def test_geometry_classification(self):
        """Geometry question should classify as Geometry and Trigonometry."""
        result = get_mock_prediction(
            "Calculate the area of a triangle with base 5 and height 10"
        )
        assert result["label"] == "Geometry and Trigonometry"

    def test_number_theory_classification(self):
        """Number theory question should classify as Number Theory."""
        result = get_mock_prediction("Find the greatest common divisor (gcd) of 24 and 36")
        assert result["label"] == "Number Theory"

    def test_combinatorics_classification(self):
        """Combinatorics question should classify as Combinatorics and Discrete Math."""
        result = get_mock_prediction(
            "In how many ways can you arrange 5 books on a shelf?"
        )
        assert result["label"] == "Combinatorics and Discrete Math"

    def test_topology_classification(self):
        """Topology question should classify as Abstract Algebra and Topology."""
        result = get_mock_prediction(
            "Prove that every compact metric space is complete"
        )
        assert result["label"] == "Abstract Algebra and Topology"

    def test_score_is_valid_float(self):
        """Score must be a float between 0.0 and 1.0."""
        result = get_mock_prediction("Solve x + 1 = 2")
        assert isinstance(result["score"], float)
        assert 0.0 <= result["score"] <= 1.0

    def test_score_increases_with_more_keywords(self):
        """More matching keywords should increase confidence."""
        weak = get_mock_prediction("solve equation")
        strong = get_mock_prediction(
            "solve the quadratic equation and factor the polynomial expression"
        )
        assert strong["score"] >= weak["score"]

    def test_returns_valid_topic(self):
        """Prediction label must be one of the 8 defined topics."""
        valid_topics = set(TOPICS.values())
        result = get_mock_prediction("some random math question")
        assert result["label"] in valid_topics


# ── XAI Rationale Generator ───────────────────────────────────────────────

class TestGenerateRationale:
    """Tests for the XAI rationale generation engine."""

    def test_rationale_returns_dict(self):
        """generate_rationale should return a dict with required keys."""
        result = generate_rationale("Solve x^2 = 0", "Algebra")
        assert isinstance(result, dict)
        assert "rationale" in result
        assert "matched_keywords" in result
        assert "matched_latex" in result

    def test_algebra_keywords_detected(self):
        """Algebra keywords should be matched for algebraic questions."""
        result = generate_rationale(
            "Solve the equation and simplify the expression", "Algebra"
        )
        assert len(result["matched_keywords"]) > 0
        assert any(
            kw in result["matched_keywords"]
            for kw in ["equation", "solve", "simplify", "expression"]
        )

    def test_calculus_keywords_detected(self):
        """Calculus keywords should be matched."""
        result = generate_rationale(
            "Find the integral and derivative", "Calculus and Analysis"
        )
        assert "integral" in result["matched_keywords"] or "derivative" in result["matched_keywords"]

    def test_probability_keywords_detected(self):
        """Probability keywords should be matched."""
        result = generate_rationale(
            "What is the probability and mean?", "Probability and Statistics"
        )
        assert "probability" in result["matched_keywords"]

    def test_linear_algebra_keywords_detected(self):
        """Linear algebra keywords should be matched."""
        result = generate_rationale(
            "Find the eigenvalue of the matrix", "Linear Algebra"
        )
        matched = result["matched_keywords"]
        assert "eigenvalue" in matched or "matrix" in matched

    def test_rationale_string_mentions_topic(self):
        """The rationale string should mention the predicted topic."""
        result = generate_rationale("Find angle of triangle", "Geometry and Trigonometry")
        assert "Geometry and Trigonometry" in result["rationale"]

    def test_fallback_rationale_for_no_matches(self):
        """When no keywords match, a fallback semantic rationale is returned."""
        result = generate_rationale("xyzzy foobar baz", "Algebra")
        assert "semantic analysis" in result["rationale"]
        assert result["matched_keywords"] == []

    @pytest.mark.parametrize("topic", list(TOPICS.values()))
    def test_all_topics_have_patterns(self, topic):
        """Every topic in the taxonomy should have XAI patterns defined."""
        from app import XAI_PATTERNS
        assert topic in XAI_PATTERNS, f"Missing XAI pattern for: {topic}"


# ── Real Prediction (Mocked HTTP) ─────────────────────────────────────────

class TestRealPrediction:
    """Tests for get_real_prediction with mocked HTTP responses."""

    @patch("app.requests.post")
    @patch("app.requests.get")
    @patch("app.ENDPOINT_URL", "https://fake-hf-space.hf.space")
    def test_parses_successful_gradio_response(self, mock_get, mock_post):
        """Correctly parses Predicted Topic and Confidence from Gradio SSE."""
        # Mock the submit call
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_post_resp.json.return_value = {"event_id": "abc123"}
        mock_post_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_post_resp

        # Mock the result call (SSE-style text)
        mock_get_resp = MagicMock()
        mock_get_resp.status_code = 200
        mock_get_resp.text = (
            'event: complete\n'
            'data: ["Predicted Topic: Linear Algebra\\n'
            'Confidence: 92.5%"]\n'
        )
        mock_get_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_get_resp

        result = get_real_prediction("Find the eigenvalues of [[1,2],[3,4]]")
        assert result["label"] == "Linear Algebra"
        assert abs(result["score"] - 0.925) < 0.001

    @patch("app.requests.post")
    @patch("app.ENDPOINT_URL", "https://fake-hf-space.hf.space")
    def test_falls_back_to_mock_on_http_error(self, mock_post):
        """When the HF API call fails, falls back to mock prediction."""
        mock_post.side_effect = Exception("Connection refused")

        result = get_real_prediction("Solve x^2 = 4")
        # Fallback should still return a valid prediction
        assert "label" in result
        assert "score" in result
        assert result["label"] in set(TOPICS.values())

    @patch("app.requests.post")
    @patch("app.requests.get")
    @patch("app.ENDPOINT_URL", "https://fake-hf-space.hf.space")
    def test_handles_missing_confidence(self, mock_get, mock_post):
        """If Confidence line is missing, uses default score."""
        mock_post_resp = MagicMock()
        mock_post_resp.json.return_value = {"event_id": "xyz"}
        mock_post_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_post_resp

        mock_get_resp = MagicMock()
        mock_get_resp.text = 'data: ["Predicted Topic: Algebra"]\n'
        mock_get_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_get_resp

        result = get_real_prediction("Solve x = 5")
        assert result["label"] == "Algebra"
        # Default score when confidence is missing
        assert result["score"] == 0.65
