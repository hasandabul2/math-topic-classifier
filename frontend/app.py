import requests
import json
import random
import os
import io
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# --- Database ---
from database import SessionLocal, engine
from models import Base, User, DbSession, Subscription, ClassificationHistory
from datetime import timezone

try:
    Base.metadata.create_all(bind=engine)
    print("[*] Database tables created/verified.")
except Exception as _db_init_err:
    print(f"[!] DB init warning (will retry on first request): {_db_init_err}")
# ----------------

from fastapi import FastAPI, Request, Form, HTTPException, status, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, RedirectResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime, timedelta
import hashlib

# Load .env file if it exists
load_dotenv()

# ── Model Endpoint Configuration ──────────────────────────────────────────
ENDPOINT_URL = os.environ.get("ENDPOINT_URL", "").strip()
HF_TOKEN = os.environ.get("HF_TOKEN", "").strip()
MODEL_MODE = "production" if ENDPOINT_URL else "demo"

# ── Configurable URLs (for Docker / cloud deployment) ─────────────────────
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")
PAYMENT_CALLBACK_URL = os.environ.get("PAYMENT_CALLBACK_URL", "http://localhost:8000/api/payment/callback").strip()

app = FastAPI(title="Math Topic Classification API", redirect_slashes=False)

# ── CORS (allow React dev server + Docker frontend) ──────────────────────
cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost",
    "http://127.0.0.1",
]
if FRONTEND_URL and FRONTEND_URL not in cors_origins:
    cors_origins.append(FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Subscription tiers
SUBSCRIPTION_TIERS = {
    "free": {"name": "Free", "price": 0, "features": ["Up to 10 classifications per day", "Basic prediction accuracy", "Standard support", "7-day history"]},
    "pro": {"name": "Pro", "price": 9.99, "features": ["Unlimited classifications", "Advanced prediction accuracy", "Priority support", "30-day history", "Export results as CSV", "Custom analytics"]},
    "premium": {"name": "Premium", "price": 19.99, "features": ["Unlimited classifications", "Highest prediction accuracy", "24/7 Premium support", "Unlimited history", "Export results as CSV/PDF", "Custom analytics & reports", "API access", "Batch processing", "Admin dashboard access"]}
}

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(stored_hash, password):
    return stored_hash == hash_password(password) or stored_hash == password

def create_session(username, role):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user: return None
        session_id = hashlib.sha256(f"{username}{datetime.now()}".encode()).hexdigest()
        new_session = DbSession(
            session_id=session_id,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
        )
        db.add(new_session)
        db.commit()
        return session_id
    finally:
        db.close()

def get_session(session_id):
    db = SessionLocal()
    try:
        session = db.query(DbSession).filter(DbSession.session_id == session_id).first()
        if session:
            # Normalise both sides to naive-UTC so SQLite (no tz) and
            # PostgreSQL (tz-aware) both work.
            expires = session.expires_at.replace(tzinfo=None) if session.expires_at else None
            if expires and expires > datetime.now(timezone.utc).replace(tzinfo=None):
                return {"username": session.user.username, "role": session.user.role}
        return None
    except Exception as e:
        print("Session error:", e)
        return None
    finally:
        db.close()

def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id:
        return get_session(session_id)
    return None

print(f"[*] API server starting in {MODEL_MODE} mode...")
if ENDPOINT_URL:
    print(f"[*] Model endpoint: {ENDPOINT_URL}")

# Topic mapping
TOPICS = {
    0: "Algebra",
    1: "Geometry and Trigonometry",
    2: "Calculus and Analysis",
    3: "Probability and Statistics",
    4: "Number Theory",
    5: "Combinatorics and Discrete Math",
    6: "Linear Algebra",
    7: "Abstract Algebra and Topology"
}

# Sample math questions for the random question feature
SAMPLE_QUESTIONS = [
    "Solve the quadratic equation x^2 - 5x + 6 = 0.",
    "Factor the expression 2x³ - 4x² - 22x + 24.",
    "Simplify the expression (3x⁴y²)³ ÷ (9x²y⁵)².",
    "Find the area of a triangle with vertices at (0,0), (3,4), and (-1,2).",
    "Calculate the volume of a cone with radius 5 cm and height 12 cm.",
    "If sin(θ) = 0.6, what is the value of cos(θ)?",
    "Find the limit of (1+1/n)^n as n approaches infinity.",
    "Calculate the derivative of f(x) = x^3 - 3x^2 + 2x - 1.",
    "Evaluate the integral of x*ln(x) from x=1 to x=e.",
    "If P(A) = 0.3 and P(B) = 0.4 and A and B are independent events, what is P(A and B)?",
    "What is the probability of rolling a sum of 8 with two dice?",
    "Calculate the mean and standard deviation of the dataset: 4, 7, 8, 11, 12, 14.",
    "Find all prime numbers p such that p+2 is also prime.",
    "Prove that the square root of 3 is irrational.",
    "Find the greatest common divisor of 168 and 180.",
    "How many ways can 5 books be arranged on a shelf?",
    "In how many ways can a committee of 3 be chosen from 9 people?",
    "Solve the recurrence relation an = an-1 + 2an-2 with a0 = 1 and a1 = 3.",
    "For the matrix A = [[1,2,3],[4,5,6],[7,8,9]], find the eigenvalues and eigenvectors.",
    "Determine if the vectors (1,2,3), (2,3,4), and (3,4,5) are linearly independent.",
    "Find the eigenvalues of the matrix [[4,1],[6,-1]].",
    "Prove that the set of continuous functions on [0,1] is a vector space.",
    "Show that the set of all rational numbers is dense in the real numbers.",
    "Prove that every compact metric space is complete."
]


# ── Auth Endpoints ────────────────────────────────────────────────────────

@app.post("/api/login", response_class=JSONResponse)
async def login(username: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user and verify_password(user.password_hash, password):
            session_id = create_session(username, user.role)
            if not session_id:
                return JSONResponse({"success": False, "error": "Session creation failed. Database issue?"}, status_code=500)
            response = JSONResponse({"success": True, "username": username, "role": user.role})
            response.set_cookie("session_id", session_id, max_age=86400, httponly=True, path="/", samesite="lax")
            return response
        return JSONResponse({"success": False, "error": "Invalid username or password"}, status_code=401)
    except Exception as e:
        return JSONResponse({"success": False, "error": f"Database error: {str(e)}"}, status_code=500)
    finally:
        db.close()

@app.post("/api/register", response_class=JSONResponse)
async def register(username: str = Form(...), password: str = Form(...), email: str = Form(...)):
    db = SessionLocal()
    try:
        if db.query(User).filter((User.username == username) | (User.email == email)).first():
            return JSONResponse({"success": False, "error": "Username or email already exists"}, status_code=400)

        new_user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role="user",
            name=username
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        db.add(Subscription(user_id=new_user.id, plan_type="free"))
        db.commit()
        return JSONResponse({"success": True, "message": "Registration successful! Please log in."})
    finally:
        db.close()

@app.get("/api/logout", response_class=JSONResponse)
async def logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id:
        db = SessionLocal()
        try:
            db.query(DbSession).filter(DbSession.session_id == session_id).delete()
            db.commit()
        finally:
            db.close()
    response = JSONResponse({"success": True})
    response.delete_cookie("session_id", path="/")
    return response

# ── Google OAuth ──────────────────────────────────────────────────────────

import urllib.parse

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback").strip()

@app.get("/auth/google")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url=url)

@app.get("/auth/google/callback")
@app.get("/auth/google/callback/")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback."""
    print(f"[DEBUG] Google callback hit: code={'present' if code else 'MISSING'}, error={error}")
    print(f"[DEBUG] Using client_id: {GOOGLE_CLIENT_ID[:20]}...")
    print(f"[DEBUG] Using client_secret: {GOOGLE_CLIENT_SECRET[:10]}...")
    print(f"[DEBUG] Using redirect_uri: {GOOGLE_REDIRECT_URI}")
    if error or not code:
        print(f"[!] Google callback: no code or error present. error={error}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=Google+login+cancelled")

    try:
        # Exchange code for tokens
        token_resp = requests.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        token_data = token_resp.json()
        print(f"[DEBUG] Google token response status: {token_resp.status_code}")
        print(f"[DEBUG] Google token response: {token_data}")

        if "access_token" not in token_data:
            google_error = token_data.get("error_description", token_data.get("error", "Unknown error"))
            print(f"[!] Google token error: {token_data}")
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error={urllib.parse.quote(google_error)}")

        # Fetch user info
        userinfo_resp = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo = userinfo_resp.json()

        email = userinfo.get("email", "")
        name = userinfo.get("name", email.split("@")[0])
        google_id = userinfo.get("id", "")

        # Create username from email (e.g. john@gmail.com -> john_google)
        username = email.split("@")[0] + "_google"

        # Create user in database if not exists
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password(f"google_{google_id}_{email}"),
                    role="user",
                    name=name,
                    auth_provider="google"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                db.add(Subscription(user_id=user.id, plan_type="free"))
                db.commit()
                print(f"[+] New Google user created: {username} ({email})")
            else:
                print(f"[*] Google user logged in: {username} ({email})")
            
            user_role = user.role
        finally:
            db.close()

        # Create session
        session_id = create_session(username, user_role)

        # Redirect to frontend login page with user info as query params
        params = urllib.parse.urlencode({
            "google_success": "true",
            "username": username,
            "role": user_role,
        })
        response = RedirectResponse(
            url=f"{FRONTEND_URL}/login?{params}",
            status_code=303,
        )
        response.set_cookie("session_id", session_id, max_age=86400, httponly=True, path="/")

        return response

    except Exception as e:
        print(f"[!] Google OAuth error: {e}")
        import traceback; traceback.print_exc()
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={urllib.parse.quote(str(e))}")

@app.get("/health", response_class=JSONResponse)
async def health():
    current_mode = "demo (fast)" if os.environ.get("DEMO_FAST_MODE", "0").strip() == "1" else MODEL_MODE
    return {
        "status": "ok",
        "mode": current_mode,
        "endpoint": ENDPOINT_URL[:40] + "..." if len(ENDPOINT_URL) > 40 else ENDPOINT_URL or "none (demo)"
    }


# ── XAI Rationale Engine ──────────────────────────────────────────────────

XAI_PATTERNS = {
    "Calculus and Analysis": {
        "keywords": ["limit", "derivative", "integral", "calculus", "differentiate", "integrate", "convergence", "series", "taylor", "maclaurin"],
        "latex": [r"\int", r"\sum", r"\lim", r"\frac{d", r"\partial", r"\infty", r"dx", r"dy", r"dz"],
        "label": "integral/derivative symbols"
    },
    "Linear Algebra": {
        "keywords": ["matrix", "vector", "eigenvalue", "eigenvector", "determinant", "linearly independent", "rank", "null space", "span"],
        "latex": [r"\begin{bmatrix}", r"\begin{pmatrix}", r"\det", r"\vec", r"\mathbf"],
        "label": "matrix/vector notation"
    },
    "Probability and Statistics": {
        "keywords": ["probability", "statistics", "mean", "median", "standard deviation", "dice", "random", "variance", "distribution", "expected", "bayes"],
        "latex": [r"P(", r"E[", r"\sigma", r"\mu", r"\binom"],
        "label": "probability notation"
    },
    "Geometry and Trigonometry": {
        "keywords": ["triangle", "area", "volume", "sin", "cos", "tan", "angle", "circle", "sphere", "radius", "perimeter", "hypotenuse"],
        "latex": [r"\angle", r"\triangle", r"\sin", r"\cos", r"\tan", r"\pi", r"\theta"],
        "label": "geometric/trigonometric terms"
    },
    "Number Theory": {
        "keywords": ["prime", "divisor", "gcd", "lcm", "modulo", "irrational", "rational", "congruence", "fermat", "euler"],
        "latex": [r"\mod", r"\equiv", r"\mid", r"\nmid", r"\phi"],
        "label": "number-theoretic symbols"
    },
    "Combinatorics and Discrete Math": {
        "keywords": ["permutation", "combination", "ways", "arrange", "committee", "recurrence", "graph", "path", "counting"],
        "latex": [r"\binom", r"C(", r"P(", r"n!"],
        "label": "combinatorial notation"
    },
    "Algebra": {
        "keywords": ["equation", "quadratic", "factor", "solve", "simplify", "expression", "polynomial", "root", "inequality"],
        "latex": [r"x^2", r"x^", r"\sqrt", r"\pm", r"\frac"],
        "label": "algebraic expressions"
    },
    "Abstract Algebra and Topology": {
        "keywords": ["topology", "metric space", "compact", "continuous", "vector space", "dense", "group", "ring", "field", "homomorphism", "isomorphism"],
        "latex": [r"\cong", r"\simeq", r"\otimes", r"\oplus", r"\subset"],
        "label": "abstract algebraic structures"
    }
}

def generate_rationale(question: str, predicted_topic: str) -> dict:
    """XAI: generate a human-readable explanation of why the model chose a topic."""
    question_lower = question.lower()
    matched_keywords = []
    matched_latex = []

    patterns = XAI_PATTERNS.get(predicted_topic, {})
    if patterns:
        for kw in patterns.get("keywords", []):
            if kw in question_lower:
                matched_keywords.append(kw)
        for sym in patterns.get("latex", []):
            if sym in question:
                matched_latex.append(sym)

    evidence = matched_keywords + matched_latex
    if evidence:
        evidence_str = ", ".join(f"'{e}'" for e in evidence[:5])
        rationale = f"Classified as {predicted_topic} due to {patterns.get('label', 'detected patterns')}: {evidence_str}"
    else:
        rationale = f"Classified as {predicted_topic} based on overall semantic analysis of the question."

    return {
        "rationale": rationale,
        "matched_keywords": matched_keywords,
        "matched_latex": matched_latex
    }


# ── Real Model Prediction (via HF Space Gradio API) ─────────────────────

def get_real_prediction(question: str) -> dict:
    """Call the deployed Hugging Face Space Gradio API for a real model prediction."""
    try:
        headers = {}
        if HF_TOKEN:
            headers["Authorization"] = f"Bearer {HF_TOKEN}"

        submit_url = ENDPOINT_URL.rstrip("/") + "/gradio_api/call/predict"
        response = requests.post(
            submit_url,
            json={"data": [question]},
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        event_id = response.json().get("event_id")

        result_url = f"{ENDPOINT_URL.rstrip('/')}/gradio_api/call/predict/{event_id}"
        result_response = requests.get(result_url, headers=headers, timeout=60)
        result_response.raise_for_status()

        result_text = ""
        import json as _json
        for line in result_response.text.strip().split("\n"):
            if line.startswith("data:"):
                raw = line[5:].strip()
                # Skip heartbeat null lines — keep looking for the real result array
                if not raw or raw == "null":
                    continue
                try:
                    data = _json.loads(raw)
                    if isinstance(data, list) and len(data) > 0:
                        result_text = data[0]
                        break
                except Exception:
                    continue

        label = "Algebra"
        score = 0.65
        for text_line in result_text.split("\n"):
            if text_line.startswith("Predicted Topic:"):
                label = text_line.split(":", 1)[1].strip()
            elif text_line.startswith("Confidence:"):
                score_str = text_line.split(":", 1)[1].strip().replace("%", "")
                score = float(score_str) / 100

        return {"label": label, "score": score}
    except Exception as e:
        print(f"[!] Real prediction failed, falling back to mock: {e}")
        return get_mock_prediction(question)


# ── Mock Prediction ───────────────────────────────────────────────────────

def get_mock_prediction(question: str):
    """Generate a mock prediction for demo mode"""
    question_lower = question.lower()

    topic_keywords = {
        "Algebra": ["equation", "quadratic", "factor", "solve", "simplify", "expression", "polynomial"],
        "Geometry and Trigonometry": ["triangle", "area", "volume", "sin", "cos", "tan", "angle", "circle", "sphere"],
        "Calculus and Analysis": ["limit", "derivative", "integral", "calculus", "differentiate", "integrate"],
        "Probability and Statistics": ["probability", "statistics", "mean", "median", "standard deviation", "dice", "random"],
        "Number Theory": ["prime", "divisor", "gcd", "lcm", "modulo", "irrational", "rational"],
        "Combinatorics and Discrete Math": ["permutation", "combination", "ways", "arrange", "committee", "recurrence"],
        "Linear Algebra": ["matrix", "vector", "eigenvalue", "eigenvector", "determinant", "linearly independent"],
        "Abstract Algebra and Topology": ["topology", "metric space", "compact", "continuous", "vector space", "dense"]
    }

    best_topic = "Algebra"
    max_matches = 0

    for topic, keywords in topic_keywords.items():
        matches = sum(1 for keyword in keywords if keyword in question_lower)
        if matches > max_matches:
            max_matches = matches
            best_topic = topic

    base_confidence = 65
    confidence = min(95, base_confidence + (max_matches * 8))

    return {
        "label": best_topic,
        "score": confidence / 100
    }


def get_prediction(question: str) -> dict:
    """Route to real model or mock prediction based on configuration."""
    if os.environ.get("DEMO_FAST_MODE", "0").strip() == "1":
        return get_mock_prediction(question)
    if MODEL_MODE == "production":
        return get_real_prediction(question)
    return get_mock_prediction(question)

def _save_prediction(username, question, topic, confidence, mode):
    """Helper: persist a prediction to DB."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        pred = ClassificationHistory(
            user_id=user.id if user else None,
            question_text=question,
            predicted_category=topic,
            confidence_score=confidence,
            mode=mode
        )
        db.add(pred)
        db.commit()
    finally:
        db.close()


# ── Prediction Endpoints ──────────────────────────────────────────────────

@app.post("/predict", response_class=JSONResponse)
async def predict(request: Request, question: str = Form(...)):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    try:
        result = get_prediction(question)
        xai = generate_rationale(question, result["label"])
        conf = round(result["score"] * 100, 2)
        _save_prediction(current_user["username"], question, result["label"], conf, "predict")
        return {
            "success": True,
            "question": question,
            "prediction": result["label"],
            "confidence": conf,
            "rationale": xai["rationale"],
            "matched_keywords": xai["matched_keywords"],
            "matched_latex": xai["matched_latex"]
        }
    except Exception as e:
        return JSONResponse({"success": False, "error": f"Error: {str(e)}"}, status_code=500)

@app.get("/random-question", response_class=JSONResponse)
async def get_random_question():
    question = random.choice(SAMPLE_QUESTIONS)
    return {"question": question}


# ── OCR Image-to-Text Endpoint ────────────────────────────────────────────

@app.post("/predict/image", response_class=JSONResponse)
async def predict_image(request: Request, file: UploadFile = File(...)):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    allowed = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp"}
    if file.content_type not in allowed:
        return JSONResponse({"success": False, "error": f"Unsupported image format: {file.content_type}."}, status_code=400)

    try:
        import easyocr
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse({"success": False, "error": "Uploaded file is empty."}, status_code=400)

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        reader = easyocr.Reader(["en"], gpu=False, verbose=False)
        results = reader.readtext(tmp_path, detail=0)
        os.unlink(tmp_path)

        extracted_text = " ".join(results).strip()
        if not extracted_text:
            return JSONResponse({"success": False, "error": "Could not extract any text from the image."}, status_code=400)

        pred = get_prediction(extracted_text)
        xai = generate_rationale(extracted_text, pred["label"])
        conf = round(pred["score"] * 100, 2)
        _save_prediction(current_user["username"], extracted_text, pred["label"], conf, "ocr")

        return {
            "success": True,
            "extracted_text": extracted_text,
            "prediction": pred["label"],
            "confidence": conf,
            "rationale": xai["rationale"],
            "matched_keywords": xai["matched_keywords"]
        }
    except ImportError:
        return JSONResponse({"success": False, "error": "EasyOCR is not installed."}, status_code=500)
    except Exception as e:
        return JSONResponse({"success": False, "error": f"OCR processing failed: {str(e)}"}, status_code=500)


# ── Batch File Processing Endpoint ────────────────────────────────────────

@app.post("/predict/file")
async def predict_file(request: Request, file: UploadFile = File(...)):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    try:
        import pandas as pd
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse({"success": False, "error": "Uploaded file is empty."}, status_code=400)

        filename = file.filename or "unknown"
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return JSONResponse({"success": False, "error": "Unsupported file format. Use .csv or .xlsx"}, status_code=400)

        if "question" not in df.columns:
            available = ", ".join(df.columns.tolist()[:10])
            return JSONResponse({"success": False, "error": f"Missing 'question' column. Found: {available}"}, status_code=400)

        if len(df) == 0:
            return JSONResponse({"success": False, "error": "File contains no data rows."}, status_code=400)

        predictions = []
        confidences = []
        for _, row in df.iterrows():
            q = str(row["question"]).strip()
            if q and q != "nan":
                pred = get_prediction(q)
                predictions.append(pred["label"])
                confidences.append(round(pred["score"] * 100, 2))
                _save_prediction(current_user["username"], q, pred["label"], round(pred["score"] * 100, 2), "batch")
            else:
                predictions.append("N/A")
                confidences.append(0)

        df["predicted_topic"] = predictions
        df["confidence_score"] = confidences

        output = io.BytesIO()
        df.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=predictions_result.xlsx"}
        )
    except ImportError:
        return JSONResponse({"success": False, "error": "pandas or openpyxl not installed."}, status_code=500)
    except Exception as e:
        return JSONResponse({"success": False, "error": f"Batch processing failed: {str(e)}"}, status_code=500)


# ── Bulk Classification (JSON) ────────────────────────────────────────────

@app.post("/classify-bulk", response_class=JSONResponse)
async def classify_bulk(request: Request, file: UploadFile = File(...)):
    """Classify all questions in a CSV/XLSX file and return JSON results."""
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    try:
        import pandas as pd
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse({"success": False, "error": "Uploaded file is empty."}, status_code=400)

        filename = (file.filename or "unknown").lower()
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return JSONResponse({"success": False, "error": "Unsupported file format. Please upload a .csv or .xlsx file."}, status_code=400)

        # Try to find a question column (case-insensitive)
        q_col = None
        for col in df.columns:
            if col.strip().lower() == "question":
                q_col = col
                break
        if q_col is None:
            available = ", ".join(df.columns.tolist()[:10])
            return JSONResponse({"success": False, "error": f"Missing 'question' column. Found columns: {available}"}, status_code=400)

        if len(df) == 0:
            return JSONResponse({"success": False, "error": "File contains no data rows."}, status_code=400)

        results = []
        for idx, row in df.iterrows():
            q = str(row[q_col]).strip()
            if q and q.lower() != "nan":
                pred = get_prediction(q)
                conf = round(pred["score"] * 100, 2)
                _save_prediction(current_user["username"], q, pred["label"], conf, "bulk")
                results.append({"question": q, "predicted_topic": pred["label"], "confidence": conf})
            else:
                results.append({"question": q, "predicted_topic": "N/A", "confidence": 0})

        return {"success": True, "total": len(results), "results": results}

    except ImportError:
        return JSONResponse({"success": False, "error": "pandas or openpyxl not installed on the server."}, status_code=500)
    except Exception as e:
        return JSONResponse({"success": False, "error": f"Bulk classification failed: {str(e)}"}, status_code=500)


@app.post("/classify-bulk/download")
async def classify_bulk_download(request: Request, file: UploadFile = File(...)):
    """Classify all questions and return an Excel file for download."""
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    try:
        import pandas as pd
        contents = await file.read()
        if len(contents) == 0:
            return JSONResponse({"success": False, "error": "Uploaded file is empty."}, status_code=400)

        filename = (file.filename or "unknown").lower()
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            return JSONResponse({"success": False, "error": "Unsupported file format."}, status_code=400)

        q_col = None
        for col in df.columns:
            if col.strip().lower() == "question":
                q_col = col
                break
        if q_col is None:
            return JSONResponse({"success": False, "error": "Missing 'question' column."}, status_code=400)

        predictions = []
        confidences = []
        for _, row in df.iterrows():
            q = str(row[q_col]).strip()
            if q and q.lower() != "nan":
                pred = get_prediction(q)
                predictions.append(pred["label"])
                confidences.append(round(pred["score"] * 100, 2))
            else:
                predictions.append("N/A")
                confidences.append(0)

        df["predicted_topic"] = predictions
        df["confidence_score"] = confidences

        output = io.BytesIO()
        df.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=bulk_classification_results.xlsx"}
        )
    except Exception as e:
        return JSONResponse({"success": False, "error": f"Download failed: {str(e)}"}, status_code=500)


# ── History & Admin API Endpoints ─────────────────────────────────────────

@app.get("/api/history", response_class=JSONResponse)
async def get_history(request: Request):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return JSONResponse({"error": "User not found"}, status_code=404)
        history = [
            {
                "question": p.question_text,
                "topic": p.predicted_category,
                "confidence": p.confidence_score,
                "mode": p.mode,
                "timestamp": p.created_at.strftime("%Y-%m-%d %H:%M:%S") if p.created_at else ""
            }
            for p in user.history
        ]
        return {"username": username, "history": history, "total": len(history)}
    finally:
        db.close()

@app.get("/api/admin/stats", response_class=JSONResponse)
async def admin_stats_api(request: Request):
    current_user = get_current_user(request)
    if not current_user or current_user["role"] != "admin":
        return JSONResponse({"error": "Admin access required"}, status_code=403)

    db = SessionLocal()
    try:
        all_preds = db.query(ClassificationHistory).order_by(ClassificationHistory.created_at.desc()).all()
        topic_counts = {}
        total_confidence = 0
        for p in all_preds:
            topic_counts[p.predicted_category] = topic_counts.get(p.predicted_category, 0) + 1
            total_confidence += p.confidence_score
        
        avg_confidence = round(total_confidence / len(all_preds), 1) if all_preds else 0
        unique_users = db.query(User).count()
        recent = [
            {
                "question": p.question_text,
                "topic": p.predicted_category,
                "confidence": p.confidence_score,
                "mode": p.mode,
                "timestamp": p.created_at.strftime("%Y-%m-%d %H:%M:%S") if p.created_at else "",
                "username": p.user.username if p.user else "Unknown"
            }
            for p in all_preds[:20]
        ]

        return {
            "total_predictions": len(all_preds),
            "unique_users": unique_users,
            "avg_confidence": avg_confidence,
            "topic_distribution": topic_counts,
            "recent": recent
        }
    finally:
        db.close()

@app.get("/subscription", response_class=JSONResponse)
async def get_subscription(request: Request):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first() if user else None
        subscription = sub.plan_type if sub else "free"
        return {
            "username": username,
            "subscription": subscription,
            "tier_info": SUBSCRIPTION_TIERS.get(subscription, SUBSCRIPTION_TIERS["free"])
        }
    finally:
        db.close()

@app.post("/upgrade-subscription", response_class=JSONResponse)
async def upgrade_subscription(request: Request, tier: str = Form(...)):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    if tier not in SUBSCRIPTION_TIERS:
        return JSONResponse({"success": False, "error": "Invalid subscription tier"}, status_code=400)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            if sub:
                sub.plan_type = tier
            else:
                db.add(Subscription(user_id=user.id, plan_type=tier))
            db.commit()
            return JSONResponse({
                "success": True,
                "message": f"Upgraded to {SUBSCRIPTION_TIERS[tier]['name']} subscription!",
                "subscription": tier
            })
        return JSONResponse({"success": False, "error": "User not found"}, status_code=404)
    finally:
        db.close()


# ── iyzico Payment Integration ────────────────────────────────────────────

import iyzipay

IYZICO_API_KEY = os.environ.get("IYZICO_API_KEY", "").strip()
IYZICO_SECRET_KEY = os.environ.get("IYZICO_SECRET_KEY", "").strip()
IYZICO_BASE_URL = os.environ.get("IYZICO_BASE_URL", "sandbox-api.iyzipay.com").strip()

# In-memory payment tracking
payment_tokens = {}  # token -> {username, tier, status}

TIER_PRICES = {
    "pro": {"price": "9.99", "name": "Pro"},
    "premium": {"price": "19.99", "name": "Premium"},
}

@app.post("/api/payment/init", response_class=JSONResponse)
async def payment_init(request: Request, tier: str = Form(...)):
    """Initialize iyzico checkout form for subscription upgrade."""
    current_user = get_current_user(request)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == current_user["username"]).first() if current_user else None
        user_email = user.email if user else f"{current_user['username']}@example.com"
    finally:
        db.close()
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    if tier not in TIER_PRICES:
        return JSONResponse({"success": False, "error": "Invalid tier"}, status_code=400)

    if not IYZICO_API_KEY or not IYZICO_SECRET_KEY:
        return JSONResponse({"success": False, "error": "Payment not configured"}, status_code=500)

    username = current_user["username"]
    price_info = TIER_PRICES[tier]
    conversation_id = f"MTC-{username}-{tier}-{int(datetime.now().timestamp())}"

    options = {
        'api_key': IYZICO_API_KEY,
        'secret_key': IYZICO_SECRET_KEY,
        'base_url': IYZICO_BASE_URL,
    }

    checkout_request = {
        'locale': 'en',
        'conversationId': conversation_id,
        'price': price_info["price"],
        'paidPrice': price_info["price"],
        'currency': 'TRY',
        'basketId': f'BASKET-{conversation_id}',
        'paymentGroup': 'SUBSCRIPTION',
        'callbackUrl': PAYMENT_CALLBACK_URL,
        'enabledInstallments': [1],
        'buyer': {
            'id': username,
            'name': username,
            'surname': 'User',
            'gsmNumber': '+905350000000',
            'email': user_email,
            'identityNumber': '74300864791',
            'lastLoginDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'registrationDate': '2024-01-01 12:00:00',
            'registrationAddress': 'Istanbul, Turkey',
            'ip': '85.34.78.112',
            'city': 'Istanbul',
            'country': 'Turkey',
            'zipCode': '34000',
        },
        'shippingAddress': {
            'contactName': f'{username} User',
            'city': 'Istanbul',
            'country': 'Turkey',
            'address': 'Istanbul, Turkey',
            'zipCode': '34000',
        },
        'billingAddress': {
            'contactName': f'{username} User',
            'city': 'Istanbul',
            'country': 'Turkey',
            'address': 'Istanbul, Turkey',
            'zipCode': '34000',
        },
        'basketItems': [
            {
                'id': f'ITEM-{tier}',
                'name': f'MathClassifier {price_info["name"]} Subscription',
                'category1': 'Subscription',
                'category2': 'AI Services',
                'itemType': 'VIRTUAL',
                'price': price_info["price"],
            }
        ],
    }

    try:
        checkout_form_initialize = iyzipay.CheckoutFormInitialize().create(checkout_request, options)
        result = checkout_form_initialize.read().decode('utf-8')
        result_json = json.loads(result)

        if result_json.get('status') == 'success':
            token = result_json.get('token', '')
            payment_tokens[token] = {
                'username': username,
                'tier': tier,
                'conversation_id': conversation_id,
                'status': 'pending',
            }
            # Also store by conversation_id for callback lookup
            payment_tokens[conversation_id] = payment_tokens[token]

            return {
                "success": True,
                "paymentPageUrl": result_json.get('paymentPageUrl', ''),
                "checkoutFormContent": result_json.get('checkoutFormContent', ''),
                "token": token,
                "conversationId": conversation_id,
            }
        else:
            error_msg = result_json.get('errorMessage', 'Payment initialization failed')
            return JSONResponse({"success": False, "error": error_msg}, status_code=400)

    except Exception as e:
        print(f"[!] iyzico payment init error: {e}")
        return JSONResponse({"success": False, "error": f"Payment error: {str(e)}"}, status_code=500)


@app.post("/api/payment/callback")
async def payment_callback(request: Request):
    """Handle iyzico payment callback after user completes payment."""
    try:
        form_data = await request.form()
        token = form_data.get("token", "")

        if not token:
            return HTMLPaymentResult(False, "No payment token received")

        options = {
            'api_key': IYZICO_API_KEY,
            'secret_key': IYZICO_SECRET_KEY,
            'base_url': IYZICO_BASE_URL,
        }

        checkout_result = iyzipay.CheckoutForm().retrieve({
            'locale': 'en',
            'conversationId': '',
            'token': token,
        }, options)

        result = checkout_result.read().decode('utf-8')
        result_json = json.loads(result)

        payment_status = result_json.get('paymentStatus', '')
        pay_status = result_json.get('status', '')

        if pay_status == 'success' and payment_status == 'SUCCESS':
            # Find payment info and upgrade user
            payment_info = payment_tokens.get(token, {})
            username = payment_info.get('username', '')
            tier = payment_info.get('tier', '')

            if username and tier:
                db = SessionLocal()
                try:
                    user_to_upgrade = db.query(User).filter(User.username == username).first()
                    if user_to_upgrade:
                        sub = db.query(Subscription).filter(Subscription.user_id == user_to_upgrade.id).first()
                        if sub:
                            sub.plan_type = tier
                        else:
                            db.add(Subscription(user_id=user_to_upgrade.id, plan_type=tier))
                        db.commit()
                finally:
                    db.close()
                payment_info['status'] = 'success'
                print(f"[OK] Payment SUCCESS: {username} upgraded to {tier}")

            # Redirect to React success page
            return RedirectResponse(
                url=f"{FRONTEND_URL}/payment-result?status=success&tier={tier}",
                status_code=303,
            )
        else:
            error_msg = result_json.get('errorMessage', 'Payment failed')
            payment_info = payment_tokens.get(token, {})
            if payment_info:
                payment_info['status'] = 'failed'
            print(f"[FAIL] Payment FAILED: {error_msg}")

            return RedirectResponse(
                url=f"{FRONTEND_URL}/payment-result?status=failed&error={error_msg}",
                status_code=303,
            )

    except Exception as e:
        print(f"[!] Payment callback error: {e}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/payment-result?status=error&error={str(e)}",
            status_code=303,
        )


@app.get("/api/payment/status", response_class=JSONResponse)
async def payment_status(request: Request):
    """Check current subscription status."""
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first() if user else None
        subscription = sub.plan_type if sub else "free"
        return {
            "username": username,
            "subscription": subscription,
            "tier_info": SUBSCRIPTION_TIERS.get(subscription, SUBSCRIPTION_TIERS["free"]),
        }
    finally:
        db.close()


# ── Serve React Static Build (Render / Production) ───────────────────────
# When deployed on Render, the React build output is copied to ./static_build
# by the Dockerfile. FastAPI serves it as static files + SPA catch-all route.
# In local dev mode, this directory doesn't exist, so it's safely skipped.

STATIC_BUILD_DIR = Path(__file__).parent / "static_build"

if STATIC_BUILD_DIR.is_dir():
    # Serve static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(STATIC_BUILD_DIR / "assets")), name="static_assets")

    # Serve other static files at root level (favicon, manifest, etc.)
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """SPA catch-all: serve index.html for any unmatched route."""
        # Try to serve the exact file first (e.g. favicon.ico, robots.txt)
        file_path = STATIC_BUILD_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html for React Router
        return FileResponse(str(STATIC_BUILD_DIR / "index.html"))

    print(f"[*] Serving React build from: {STATIC_BUILD_DIR}")
else:
    print(f"[*] No static build found at {STATIC_BUILD_DIR} — API-only mode")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)