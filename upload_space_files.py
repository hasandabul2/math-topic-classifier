"""Upload files to the Hugging Face Space."""
from huggingface_hub import HfApi

api = HfApi()
space_id = "hasandabul/math-topic-classifier-api"

# Upload hf_space_app.py as app.py in the Space
print("[1/2] Uploading app.py ...")
api.upload_file(
    path_or_fileobj="hf_space_app.py",
    path_in_repo="app.py",
    repo_id=space_id,
    repo_type="space",
)

# Create and upload requirements.txt
print("[2/2] Uploading requirements.txt ...")
requirements = """torch
transformers
peft
bitsandbytes
accelerate
gradio
safetensors
"""
api.upload_file(
    path_or_fileobj=requirements.encode(),
    path_in_repo="requirements.txt",
    repo_id=space_id,
    repo_type="space",
)

print(f"\nDone! Space will start building at:")
print(f"https://huggingface.co/spaces/{space_id}")
