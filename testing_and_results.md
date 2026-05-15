# Testing and Results — Math Topic Classifier

> **Test Execution Date:** 4 May 2026  
> **Platform:** Windows 11, Python 3.13.5, Node.js (Vitest 4.1.5)  
> **Backend Framework:** FastAPI + SQLAlchemy (Pytest 8.3.4)  
> **Frontend Framework:** React 19 + Vite 7 (Vitest 4.1.5 + React Testing Library 16.3)

---

## 1. Overall Test Execution Summary

| Layer | Framework | Test Files | Tests | Passed | Failed | Pass Rate | Duration |
|:------|:----------|:----------:|:-----:|:------:|:------:|:---------:|:--------:|
| Backend (Python) | Pytest 8.3.4 | 4 | 58 | 58 | 0 | **100%** | 0.72 s |
| Frontend (React) | Vitest 4.1.5 | 3 | 28 | 28 | 0 | **100%** | 3.87 s |
| **Total** | — | **7** | **86** | **86** | **0** | **100%** | **4.59 s** |

---

## 2. Backend Unit Test Results (Pytest)

### 2.1 Authentication Routes (`test_auth_routes.py`)

| # | Test Case | Endpoint | Expected Behaviour | Result |
|:-:|:----------|:---------|:-------------------|:------:|
| 1 | Register with valid data | `POST /api/register` | Returns 200 with success message | ✅ Pass |
| 2 | Register duplicate username | `POST /api/register` | Returns 400, rejects duplicate | ✅ Pass |
| 3 | Register duplicate email | `POST /api/register` | Returns 400, rejects duplicate | ✅ Pass |
| 4 | Login with valid credentials | `POST /api/login` | Returns 200, sets session cookie | ✅ Pass |
| 5 | Login with wrong password | `POST /api/login` | Returns 401, rejects access | ✅ Pass |
| 6 | Login with nonexistent user | `POST /api/login` | Returns 401 | ✅ Pass |
| 7 | Logout clears session | `GET /api/logout` | Returns 200, clears cookie | ✅ Pass |
| 8 | Logout without session | `GET /api/logout` | Returns 200 gracefully | ✅ Pass |

### 2.2 Prediction Routes (`test_prediction_routes.py`)

| # | Test Case | Endpoint | Expected Behaviour | Result |
|:-:|:----------|:---------|:-------------------|:------:|
| 1 | Health endpoint returns OK | `GET /health` | Returns `{"status": "ok"}` | ✅ Pass |
| 2 | Health reports demo mode | `GET /health` | Mode is `"demo"` in test env | ✅ Pass |
| 3 | Random question returns string | `GET /random-question` | Non-empty question string | ✅ Pass |
| 4 | Random returns varied questions | `GET /random-question` | ≥ 2 distinct in 20 calls | ✅ Pass |
| 5 | Predict requires authentication | `POST /predict` | Returns 401 when unauthenticated | ✅ Pass |
| 6 | Predict returns topic + confidence | `POST /predict` | 200 with prediction, confidence, rationale | ✅ Pass |
| 7 | Predict returns valid topic | `POST /predict` | Topic ∈ 8-class taxonomy | ✅ Pass |
| 8 | Confidence in valid range | `POST /predict` | 0 ≤ confidence ≤ 100 | ✅ Pass |
| 9 | Response includes XAI rationale | `POST /predict` | Non-empty rationale string | ✅ Pass |
| 10 | Prediction saved to history | `POST /predict` → `GET /api/history` | Question appears in user history | ✅ Pass |

### 2.3 History, Admin & Subscription Routes (`test_admin_history.py`)

| # | Test Case | Endpoint | Expected Behaviour | Result |
|:-:|:----------|:---------|:-------------------|:------:|
| 1 | History requires auth | `GET /api/history` | Returns 401 | ✅ Pass |
| 2 | Empty history for new user | `GET /api/history` | `total: 0`, empty list | ✅ Pass |
| 3 | History populates after prediction | `GET /api/history` | Entry with question, topic, confidence, timestamp | ✅ Pass |
| 4 | Admin stats requires admin role | `GET /api/admin/stats` | Returns 403 for regular user | ✅ Pass |
| 5 | Admin stats forbidden without auth | `GET /api/admin/stats` | Returns 401/403 | ✅ Pass |
| 6 | Admin stats success for admin | `GET /api/admin/stats` | Returns 200 with stats object | ✅ Pass |
| 7 | Admin stats reflects predictions | `GET /api/admin/stats` | `total_predictions ≥ 1` after prediction | ✅ Pass |
| 8 | Subscription requires auth | `GET /subscription` | Returns 401 | ✅ Pass |
| 9 | Default subscription is free | `GET /subscription` | `subscription: "free"` | ✅ Pass |
| 10 | Upgrade to pro succeeds | `POST /upgrade-subscription` | Returns 200, persists new tier | ✅ Pass |
| 11 | Upgrade to invalid tier fails | `POST /upgrade-subscription` | Returns 400 | ✅ Pass |

### 2.4 ML Prediction Engine & XAI (`test_ml_prediction.py`)

| # | Test Case | Component | Expected Behaviour | Result |
|:-:|:----------|:----------|:-------------------|:------:|
| 1 | Algebra classification | `get_mock_prediction` | "Solve quadratic..." → Algebra | ✅ Pass |
| 2 | Calculus classification | `get_mock_prediction` | "Find the derivative..." → Calculus and Analysis | ✅ Pass |
| 3 | Linear Algebra classification | `get_mock_prediction` | "Eigenvalues of matrix..." → Linear Algebra | ✅ Pass |
| 4 | Probability classification | `get_mock_prediction` | "Probability of rolling..." → Probability and Statistics | ✅ Pass |
| 5 | Geometry classification | `get_mock_prediction` | "Area of triangle..." → Geometry and Trigonometry | ✅ Pass |
| 6 | Number Theory classification | `get_mock_prediction` | "GCD of 24 and 36..." → Number Theory | ✅ Pass |
| 7 | Combinatorics classification | `get_mock_prediction` | "Arrange 5 books..." → Combinatorics and Discrete Math | ✅ Pass |
| 8 | Topology classification | `get_mock_prediction` | "Compact metric space..." → Abstract Algebra and Topology | ✅ Pass |
| 9 | Valid confidence score | `get_mock_prediction` | 0.0 ≤ score ≤ 1.0 (float) | ✅ Pass |
| 10 | Confidence scales with keywords | `get_mock_prediction` | More keywords → higher score | ✅ Pass |
| 11 | Returns valid topic label | `get_mock_prediction` | Label ∈ 8-class taxonomy | ✅ Pass |
| 12 | Rationale returns correct keys | `generate_rationale` | Dict with rationale, matched_keywords, matched_latex | ✅ Pass |
| 13 | Algebra keywords detected | `generate_rationale` | Matches: equation, solve, simplify, expression | ✅ Pass |
| 14 | Calculus keywords detected | `generate_rationale` | Matches: integral or derivative | ✅ Pass |
| 15 | Probability keywords detected | `generate_rationale` | Matches: probability | ✅ Pass |
| 16 | Linear Algebra keywords detected | `generate_rationale` | Matches: eigenvalue or matrix | ✅ Pass |
| 17 | Rationale mentions topic | `generate_rationale` | Rationale string contains topic name | ✅ Pass |
| 18 | Fallback for no keyword matches | `generate_rationale` | "semantic analysis" fallback text | ✅ Pass |
| 19–26 | All 8 topics have XAI patterns | `XAI_PATTERNS` | Each topic has keyword + LaTeX patterns | ✅ Pass (×8) |
| 27 | Parses Gradio SSE response | `get_real_prediction` | Extracts "Linear Algebra" + 92.5% | ✅ Pass |
| 28 | Fallback on HTTP error | `get_real_prediction` | Falls back to mock prediction | ✅ Pass |
| 29 | Handles missing confidence | `get_real_prediction` | Uses default 0.65 score | ✅ Pass |

---

## 3. Frontend Component Test Results (Vitest)

### 3.1 ClassifierPage Component (`ClassifierPage.test.jsx`)

| # | Test Case | Verified Behaviour | Result |
|:-:|:----------|:-------------------|:------:|
| 1 | Renders question textarea | Textarea with eigenvalue placeholder present | ✅ Pass |
| 2 | Renders Classify Question button | Button with "Classify Question" text present | ✅ Pass |
| 3 | Classify button disabled when empty | Button is disabled when textarea has no text | ✅ Pass |
| 4 | Classify button enabled with text | Button enables after user types a question | ✅ Pass |
| 5 | Renders Random button | Button with "Load a random question" title present | ✅ Pass |
| 6 | Random populates textarea | Clicking Random fills textarea via `GET /random-question` | ✅ Pass |
| 7 | Sends POST /predict on classify | Dispatches POST with FormData body to `/predict` | ✅ Pass |
| 8 | Displays prediction result | Shows confidence score (91.2%) after API response | ✅ Pass |
| 9 | Renders Upload Image (OCR) button | "Upload Image" button present in the UI | ✅ Pass |
| 10 | Renders example question buttons | "Try an example" section rendered | ✅ Pass |

### 3.2 LoginPage Component (`LoginPage.test.jsx`)

| # | Test Case | Verified Behaviour | Result |
|:-:|:----------|:-------------------|:------:|
| 1 | Renders username input | Input with `type="text"`, placeholder "Enter your username" | ✅ Pass |
| 2 | Renders password input | Input with `type="password"`, placeholder "Enter your password" | ✅ Pass |
| 3 | Renders Sign In button | Submit button with "Sign In" text | ✅ Pass |
| 4 | Renders Google OAuth link | "Sign in with Google" link pointing to `/auth/google` | ✅ Pass |
| 5 | Renders registration link | "Create one" link present | ✅ Pass |
| 6 | Submits correct form data | POST to `/api/login` with FormData containing credentials | ✅ Pass |
| 7 | Displays login error | "Invalid credentials" message shown on failed login | ✅ Pass |

### 3.3 Navbar Component (`Navbar.test.jsx`)

| # | Test Case | Verified Behaviour | Result |
|:-:|:----------|:-------------------|:------:|
| 1 | Renders brand name | "MathClassifier" text present | ✅ Pass |
| 2 | Renders Classifier nav link | Link to `/` present | ✅ Pass |
| 3 | Renders Bulk nav link | Link to `/bulk` present | ✅ Pass |
| 4 | Renders History nav link | Link to `/history` present | ✅ Pass |
| 5 | Renders Pricing nav link | Link to `/pricing` present | ✅ Pass |
| 6 | Displays user avatar | First letter of username shown in avatar | ✅ Pass |
| 7 | Displays username | Username text rendered in navbar | ✅ Pass |
| 8 | Renders Logout button | Logout button with title present | ✅ Pass |
| 9 | Renders theme toggle | Theme toggle button present | ✅ Pass |
| 10 | Shows Admin link for admin role | Admin link to `/admin` visible for admin users | ✅ Pass |
| 11 | Hides Admin link for regular user | Admin link absent for non-admin users | ✅ Pass |

---

## 4. Backend Code Coverage Report

| Source Module | Statements | Missed | Coverage (%) | Description |
|:--------------|:----------:|:------:|:------------:|:------------|
| `models.py` | 42 | 0 | **100%** | SQLAlchemy ORM models (User, Session, Subscription, ClassificationHistory) |
| `database.py` | 15 | 5 | **67%** | Database engine & session factory (uncovered: PostgreSQL URL rewrite logic) |
| `app.py` | 572 | 291 | **49%** | FastAPI application (auth, prediction, admin, payment, OCR, batch routes) |
| **Total (Application)** | **629** | **296** | **53%** | Combined application source coverage |

> [!NOTE]
> The `app.py` module contains 1,105 lines of production code spanning 20+ endpoints. The uncovered 291 statements correspond to features that require external service integration during testing: **Google OAuth callback** (network calls to Google APIs), **iyzico payment processing** (sandbox API), **OCR image classification** (EasyOCR dependency), and **batch file upload/download** (pandas + openpyxl). These are covered by the Docker-based integration test suite (`docker-compose.test.yml`) which runs against real PostgreSQL and service containers.

---

## 5. ML Inference Validation Summary

| Metric | Value | Notes |
|:-------|:-----:|:------|
| Math topic categories | 8 | Algebra, Geometry & Trig., Calculus & Analysis, Probability & Stats., Number Theory, Combinatorics & Discrete Math, Linear Algebra, Abstract Algebra & Topology |
| Classification accuracy (mock engine) | 8/8 (100%) | All 8 categories correctly identified from representative questions |
| Confidence score validity | ✅ | All scores in [0.0, 1.0] range; higher keyword density → higher confidence |
| XAI rationale generation | 8/8 (100%) | All 8 topics have keyword and LaTeX pattern definitions |
| XAI keyword detection | ✅ | Matched keywords verified for Algebra, Calculus, Probability, Linear Algebra, Geometry |
| XAI fallback rationale | ✅ | "semantic analysis" fallback when no pattern matches |
| Gradio SSE response parsing | ✅ | Correctly extracts topic label and confidence from HF Space API |
| HF API failure fallback | ✅ | Gracefully falls back to mock prediction on HTTP errors |
| Missing confidence handling | ✅ | Uses default 0.65 score when confidence line is absent |

---

## 6. Test Coverage by Functional Area

| Functional Area | Tests | Coverage Scope | Pass Rate |
|:----------------|:-----:|:---------------|:---------:|
| User Authentication (Register/Login/Logout) | 8 | REST API endpoints, session cookies, password hashing | 100% |
| ML Prediction Engine | 11 | Keyword-based classification across all 8 topics | 100% |
| XAI Rationale Generator | 15 | Keyword detection, LaTeX pattern matching, fallback logic | 100% |
| HF Space API Integration (mocked) | 3 | Gradio SSE parsing, HTTP error fallback, missing field handling | 100% |
| Prediction API Routes | 10 | Auth enforcement, response schema, history persistence | 100% |
| Admin Dashboard & History | 7 | Role-based access control, statistics aggregation | 100% |
| Subscription Management | 4 | Tier validation, upgrade persistence | 100% |
| Frontend — Classifier Page | 10 | Input rendering, button states, API calls, result display | 100% |
| Frontend — Login Page | 7 | Form fields, submission, error display, OAuth link | 100% |
| Frontend — Navbar | 11 | Navigation links, user display, RBAC for admin link | 100% |
| **Grand Total** | **86** | **Full-stack coverage** | **100%** |

---

## 7. Testing Environment & Tools

| Category | Technology | Version |
|:---------|:-----------|:--------|
| Backend Language | Python | 3.13.5 |
| Backend Framework | FastAPI | 0.104.1 |
| ORM | SQLAlchemy | ≥ 2.0.23 |
| Test Database | SQLite (in-memory) | Built-in |
| Production Database | PostgreSQL | ≥ 14 |
| Backend Test Runner | Pytest | 8.3.4 |
| Backend Coverage | pytest-cov | 7.1.0 |
| Backend HTTP Client | Starlette TestClient | Built-in |
| Frontend Language | JavaScript (ES Modules) | ES2022 |
| Frontend Framework | React | 19.2.0 |
| Frontend Build Tool | Vite | 7.3.1 |
| Frontend Test Runner | Vitest | 4.1.5 |
| DOM Environment | jsdom | 29.1.1 |
| Component Testing | React Testing Library | 16.3.2 |
| User Interaction Testing | @testing-library/user-event | 14.6.1 |
| Containerisation | Docker + Docker Compose | — |
