"""
Hugging Face Space app for Math Topic Classification inference.

This app loads the fine-tuned DeepSeek-R1-Distill-Qwen-1.5B LoRA model
and serves predictions via a Gradio interface + API.
"""

import os
import torch
import gradio as gr
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from peft import PeftModel, PeftConfig

# ── Configuration ─────────────────────────────────────────────────────────
MODEL_REPO = os.environ.get("MODEL_REPO", "hasandabul/math-topic-classifier")

TOPICS = {
    0: "Algebra",
    1: "Geometry and Trigonometry",
    2: "Calculus and Analysis",
    3: "Probability and Statistics",
    4: "Number Theory",
    5: "Combinatorics and Discrete Math",
    6: "Linear Algebra",
    7: "Abstract Algebra and Topology",
}

# ── Load model at startup ────────────────────────────────────────────────
print(f"[*] Loading model from {MODEL_REPO} ...")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[*] Using device: {device}")

# Load PEFT config to find the base model
peft_config = PeftConfig.from_pretrained(MODEL_REPO)

# Load the base model — use quantization only if GPU is available
if device == "cuda":
    try:
        from transformers import BitsAndBytesConfig
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )
        base_model = AutoModelForSequenceClassification.from_pretrained(
            peft_config.base_model_name_or_path,
            num_labels=8,
            quantization_config=bnb_config,
            device_map="auto",
        )
    except Exception as e:
        print(f"[!] Quantized loading failed ({e}), falling back to float16")
        base_model = AutoModelForSequenceClassification.from_pretrained(
            peft_config.base_model_name_or_path,
            num_labels=8,
            torch_dtype=torch.float16,
            device_map="auto",
        )
else:
    # CPU: load in float32
    base_model = AutoModelForSequenceClassification.from_pretrained(
        peft_config.base_model_name_or_path,
        num_labels=8,
        torch_dtype=torch.float32,
    )

tokenizer = AutoTokenizer.from_pretrained(MODEL_REPO)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token or "[PAD]"
base_model.config.pad_token_id = tokenizer.pad_token_id

# Load LoRA adapters
model = PeftModel.from_pretrained(base_model, MODEL_REPO)
model = model.to(device)
model.eval()
print("[*] Model loaded successfully!")


# ── Prediction function ──────────────────────────────────────────────────
def classify_question(question: str) -> str:
    """Classify a math question into one of 8 topics. Returns formatted text."""
    if not question.strip():
        return "Please enter a math question."

    inputs = tokenizer(
        question,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=512,
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)
        predicted_id = torch.argmax(probabilities, dim=-1).item()
        confidence = probabilities[0][predicted_id].item()

    all_scores = {TOPICS[i]: round(probabilities[0][i].item(), 4) for i in range(8)}

    # Build formatted output
    lines = [
        f"Predicted Topic: {TOPICS[predicted_id]}",
        f"Confidence: {confidence*100:.1f}%",
        f"Label ID: {predicted_id}",
        "",
        "All Scores:",
    ]
    for topic, score in sorted(all_scores.items(), key=lambda x: -x[1]):
        bar = "█" * int(score * 30)
        lines.append(f"  {topic}: {score*100:.1f}% {bar}")

    return "\n".join(lines)


# ── Gradio Interface ─────────────────────────────────────────────────────
demo = gr.Interface(
    fn=classify_question,
    inputs=gr.Textbox(label="Math Question", placeholder="e.g. Find the derivative of x^2 + 3x", lines=3),
    outputs=gr.Textbox(label="Classification Result", lines=12),
    title="Math Topic Classifier",
    description="Classify math questions into 8 topics using a fine-tuned DeepSeek-R1-Distill-Qwen-1.5B model.",
    examples=[
        ["Solve the quadratic equation x^2 - 5x + 6 = 0."],
        ["Find the derivative of f(x) = x^3 - 3x^2 + 2x - 1."],
        ["What is the probability of rolling a sum of 8 with two dice?"],
        ["Find the eigenvalues of the matrix [[4,1],[6,-1]]."],
    ],
    api_name="predict",
)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
