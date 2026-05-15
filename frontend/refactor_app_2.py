import re

filename = r"c:\Users\hasan\OneDrive\Desktop\math-topic-classifier-main1\math-topic-classifier-main\frontend\app.py"

with open(filename, "r", encoding="utf-8") as f:
    content = f.read()

# 8. History API
history_old = """@app.get("/api/history", response_class=JSONResponse)
async def get_history(request: Request):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    user_data = users_db.get(username, {})
    history = user_data.get("history", [])

    return {"username": username, "history": history, "total": len(history)}"""
history_new = """@app.get("/api/history", response_class=JSONResponse)
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
                "question": p.question,
                "topic": p.topic,
                "confidence": p.confidence,
                "mode": p.mode,
                "timestamp": p.timestamp.strftime("%Y-%m-%d %H:%M:%S") if p.timestamp else ""
            }
            for p in user.predictions
        ]
        return {"username": username, "history": history, "total": len(history)}
    finally:
        db.close()"""
content = content.replace(history_old, history_new)

# 9. Admin Stats API
admin_old = """@app.get("/api/admin/stats", response_class=JSONResponse)
async def admin_stats_api(request: Request):
    current_user = get_current_user(request)
    if not current_user or current_user["role"] != "admin":
        return JSONResponse({"error": "Admin access required"}, status_code=403)

    topic_counts = {}
    total_confidence = 0
    for entry in prediction_log:
        t = entry.get("topic", "Unknown")
        topic_counts[t] = topic_counts.get(t, 0) + 1
        total_confidence += entry.get("confidence", 0)

    avg_confidence = round(total_confidence / len(prediction_log), 1) if prediction_log else 0
    unique_users = len(set(e.get("username", "") for e in prediction_log))

    return {
        "total_predictions": len(prediction_log),
        "unique_users": unique_users,
        "avg_confidence": avg_confidence,
        "topic_distribution": topic_counts,
        "recent": prediction_log[:20]
    }"""
admin_new = """@app.get("/api/admin/stats", response_class=JSONResponse)
async def admin_stats_api(request: Request):
    current_user = get_current_user(request)
    if not current_user or current_user["role"] != "admin":
        return JSONResponse({"error": "Admin access required"}, status_code=403)

    db = SessionLocal()
    try:
        all_preds = db.query(Prediction).order_by(Prediction.timestamp.desc()).all()
        topic_counts = {}
        total_confidence = 0
        for p in all_preds:
            topic_counts[p.topic] = topic_counts.get(p.topic, 0) + 1
            total_confidence += p.confidence
        
        avg_confidence = round(total_confidence / len(all_preds), 1) if all_preds else 0
        unique_users = db.query(User).count()
        recent = [
            {
                "question": p.question,
                "topic": p.topic,
                "confidence": p.confidence,
                "mode": p.mode,
                "timestamp": p.timestamp.strftime("%Y-%m-%d %H:%M:%S") if p.timestamp else "",
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
        db.close()"""
content = content.replace(admin_old, admin_new)

# 10. Subscription
subs_old = """@app.get("/subscription", response_class=JSONResponse)
async def get_subscription(request: Request):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    user_data = users_db.get(username)
    subscription = user_data.get("subscription", "free") if user_data else "free"

    return {
        "username": username,
        "subscription": subscription,
        "tier_info": SUBSCRIPTION_TIERS.get(subscription, SUBSCRIPTION_TIERS["free"])
    }"""
subs_new = """@app.get("/subscription", response_class=JSONResponse)
async def get_subscription(request: Request):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        subscription = user.subscription if user else "free"
        return {
            "username": username,
            "subscription": subscription,
            "tier_info": SUBSCRIPTION_TIERS.get(subscription, SUBSCRIPTION_TIERS["free"])
        }
    finally:
        db.close()"""
content = content.replace(subs_old, subs_new)

# 11. Upgrade Subscription
upg_old = """@app.post("/upgrade-subscription", response_class=JSONResponse)
async def upgrade_subscription(request: Request, tier: str = Form(...)):
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"success": False, "error": "Not authenticated"}, status_code=401)

    if tier not in SUBSCRIPTION_TIERS:
        return JSONResponse({"success": False, "error": "Invalid subscription tier"}, status_code=400)

    username = current_user["username"]
    if username in users_db:
        users_db[username]["subscription"] = tier
        return JSONResponse({
            "success": True,
            "message": f"Upgraded to {SUBSCRIPTION_TIERS[tier]['name']} subscription!",
            "subscription": tier
        })

    return JSONResponse({"success": False, "error": "User not found"}, status_code=404)"""
upg_new = """@app.post("/upgrade-subscription", response_class=JSONResponse)
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
            user.subscription = tier
            db.commit()
            return JSONResponse({
                "success": True,
                "message": f"Upgraded to {SUBSCRIPTION_TIERS[tier]['name']} subscription!",
                "subscription": tier
            })
        return JSONResponse({"success": False, "error": "User not found"}, status_code=404)
    finally:
        db.close()"""
content = content.replace(upg_old, upg_new)


# 12. Payment Init
payinit_old = """'email': users_db.get(username, {}).get("email", f"{username}@example.com"),"""
content = content.replace(payinit_old, """'email': f"{username}@example.com",  # Email fallback""")


# 13. Payment Callback
paycback_old = """if username and tier and username in users_db:
                users_db[username]["subscription"] = tier"""
paycback_new = """if username and tier:
                db = SessionLocal()
                try:
                    user_to_upgrade = db.query(User).filter(User.username == username).first()
                    if user_to_upgrade:
                        user_to_upgrade.subscription = tier
                        db.commit()
                finally:
                    db.close()"""
content = content.replace(paycback_old, paycback_new)

# 14. Payment Status
paystat_old = """@app.get("/api/payment/status", response_class=JSONResponse)
async def payment_status(request: Request):
    \"\"\"Check current subscription status.\"\"\"
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    user_data = users_db.get(username, {})

    return {
        "username": username,
        "subscription": user_data.get("subscription", "free"),
        "tier_info": SUBSCRIPTION_TIERS.get(user_data.get("subscription", "free"), SUBSCRIPTION_TIERS["free"]),
    }"""
paystat_new = """@app.get("/api/payment/status", response_class=JSONResponse)
async def payment_status(request: Request):
    \"\"\"Check current subscription status.\"\"\"
    current_user = get_current_user(request)
    if not current_user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    username = current_user["username"]
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        subscription = user.subscription if user else "free"
        return {
            "username": username,
            "subscription": subscription,
            "tier_info": SUBSCRIPTION_TIERS.get(subscription, SUBSCRIPTION_TIERS["free"]),
        }
    finally:
        db.close()"""
content = content.replace(paystat_old, paystat_new)

# Add small missing logic email to payinit
# I will just write a small replace for payinit missing email:
import textwrap

payinit_fn_old = """def payment_init(request: Request, tier: str = Form(...)):
    \"\"\"Initialize iyzico checkout form for subscription upgrade.\"\"\"
    current_user = get_current_user(request)"""
payinit_fn_new = """def payment_init(request: Request, tier: str = Form(...)):
    \"\"\"Initialize iyzico checkout form for subscription upgrade.\"\"\"
    current_user = get_current_user(request)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == current_user["username"]).first() if current_user else None
        user_email = user.email if user else f"{current_user['username']}@example.com"
    finally:
        db.close()"""
content = content.replace(payinit_fn_old, payinit_fn_new)
content = content.replace("""'email': f"{username}@example.com",  # Email fallback""", """'email': user_email,""")

with open(filename, "w", encoding="utf-8") as f:
    f.write(content)

print("done second refactor")
