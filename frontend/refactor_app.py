import re

filename = r"c:\Users\hasan\OneDrive\Desktop\math-topic-classifier-main1\math-topic-classifier-main\frontend\app.py"

with open(filename, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add database imports
import_db = """from dotenv import load_dotenv

# --- Database ---
from database import SessionLocal, User, Session as DbSession, Prediction
from datetime import timezone
# ----------------
"""
content = content.replace("from dotenv import load_dotenv", import_db)

# 2. Remove in-memory stores
content = re.sub(r'# Simple in-memory session storage.*?prediction_log = \[\]\n', '', content, flags=re.DOTALL)

# Re-add SUBSCRIPTION_TIERS and helper functions since I deleted them with the big regex
helpers = """
# Subscription tiers
SUBSCRIPTION_TIERS = {
    "free": {"name": "Free", "price": 0, "features": ["Up to 10 classifications per day", "Basic prediction accuracy", "Standard support", "7-day history"]},
    "pro": {"name": "Pro", "price": 9.99, "features": ["Unlimited classifications", "Advanced prediction accuracy", "Priority support", "30-day history", "Export results as CSV", "Custom analytics"]},
    "premium": {"name": "Premium", "price": 19.99, "features": ["Unlimited classifications", "Highest prediction accuracy", "24/7 Premium support", "Unlimited history", "Export results as CSV/PDF", "Custom analytics & reports", "API access", "Batch processing", "Admin dashboard access"]}
}

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(stored_hash, password):
    return stored_hash == hash_password(password)

def create_session(username, role):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user: return None
        session_id = hashlib.sha256(f"{username}{datetime.now()}".encode()).hexdigest()
        new_session = DbSession(
            session_id=session_id,
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
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
        if session and session.expires_at > datetime.now(timezone.utc):
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
"""
# Insert helpers before print(f"[*] API server starting...)
content = content.replace('print(f"[*] API server starting', helpers + '\nprint(f"[*] API server starting')


# 3. Replace login
login_old = """@app.post("/api/login", response_class=JSONResponse)
async def login(username: str = Form(...), password: str = Form(...)):
    user = users_db.get(username)
    if user and verify_password(user["password"], password):
        session_id = create_session(username, user["role"])
        response = JSONResponse({"success": True, "username": username, "role": user["role"]})
        response.set_cookie("session_id", session_id, max_age=86400, httponly=True, path="/", samesite="lax")
        return response
    return JSONResponse({"success": False, "error": "Invalid username or password"}, status_code=401)"""
login_new = """@app.post("/api/login", response_class=JSONResponse)
async def login(username: str = Form(...), password: str = Form(...)):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user and verify_password(user.password_hash, password):
            session_id = create_session(username, user.role)
            response = JSONResponse({"success": True, "username": username, "role": user.role})
            response.set_cookie("session_id", session_id, max_age=86400, httponly=True, path="/", samesite="lax")
            return response
        return JSONResponse({"success": False, "error": "Invalid username or password"}, status_code=401)
    finally:
        db.close()"""
content = content.replace(login_old, login_new)

# 4. Replace register
register_old = """@app.post("/api/register", response_class=JSONResponse)
async def register(username: str = Form(...), password: str = Form(...), email: str = Form(...)):
    if username in users_db:
        return JSONResponse({"success": False, "error": "Username already exists"}, status_code=400)

    users_db[username] = {
        "password": hash_password(password),
        "role": "user",
        "email": email,
        "subscription": "free",
        "history": []
    }
    return JSONResponse({"success": True, "message": "Registration successful! Please log in."})"""
register_new = """@app.post("/api/register", response_class=JSONResponse)
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
            subscription="free"
        )
        db.add(new_user)
        db.commit()
        return JSONResponse({"success": True, "message": "Registration successful! Please log in."})
    finally:
        db.close()"""
content = content.replace(register_old, register_new)

# 5. Replace logout
logout_old = """@app.get("/api/logout", response_class=JSONResponse)
async def logout(request: Request):
    session_id = request.cookies.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
    response = JSONResponse({"success": True})
    response.delete_cookie("session_id", path="/")
    return response"""
logout_new = """@app.get("/api/logout", response_class=JSONResponse)
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
    return response"""
content = content.replace(logout_old, logout_new)

# 6. Replace _save_prediction
save_pred_old = """def _save_prediction(username, question, topic, confidence, mode):
    \"\"\"Helper: persist a prediction to user history + global log.\"\"\"
    entry = {
        "question": question,
        "topic": topic,
        "confidence": confidence,
        "mode": mode,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "username": username
    }
    if username in users_db:
        users_db[username].setdefault("history", []).insert(0, entry)
    prediction_log.insert(0, entry)"""
save_pred_new = """def _save_prediction(username, question, topic, confidence, mode):
    \"\"\"Helper: persist a prediction to DB.\"\"\"
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        pred = Prediction(
            user_id=user.id if user else None,
            question=question,
            topic=topic,
            confidence=confidence,
            mode=mode
        )
        db.add(pred)
        db.commit()
    finally:
        db.close()"""
content = content.replace(save_pred_old, save_pred_new)

# 7. Replace google logic
content = re.sub(r'# Create user in database if not exists.*?return response', """# Create user in database if not exists
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password(f"google_{google_id}_{email}"),
                    role="user",
                    subscription="free",
                    auth_provider="google",
                    google_name=name
                )
                db.add(user)
                db.commit()
                db.refresh(user)
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
            url=f"http://localhost:3000/login?{params}",
            status_code=303,
        )
        response.set_cookie("session_id", session_id, max_age=86400, httponly=True, path="/")

        return response""", content, flags=re.DOTALL)

with open(filename, "w", encoding="utf-8") as f:
    f.write(content)

print("done basic refactor")
