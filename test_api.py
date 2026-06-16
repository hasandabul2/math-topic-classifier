"""Quick test: call the HF Space Gradio API end-to-end."""
import requests, json, time

base = "https://hasandabul-math-topic-classifier.hf.space"

# Step 1: Submit
r = requests.post(f"{base}/gradio_api/call/predict", json={"data": ["Find the derivative of x^2"]}, timeout=30)
print(f"Submit status: {r.status_code}")
event_id = r.json()["event_id"]
print(f"Event ID: {event_id}")

# Step 2: Get result
r2 = requests.get(f"{base}/gradio_api/call/predict/{event_id}", timeout=60)
print(f"Result status: {r2.status_code}")
print(f"Raw response:\n{r2.text}")

# Parse
for line in r2.text.strip().split("\n"):
    if line.startswith("data:"):
        data = json.loads(line[5:].strip())
        if isinstance(data, list) and len(data) > 0:
            text = data[0]
            for t in text.split("\n"):
                if t.startswith("Predicted Topic:"):
                    print(f"\n>>> LABEL: {t.split(':',1)[1].strip()}")
                elif t.startswith("Confidence:"):
                    s = t.split(":",1)[1].strip().replace("%","")
                    print(f">>> SCORE: {float(s)/100}")
        break
