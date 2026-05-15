"""
Upload the trained LoRA model to Hugging Face Hub.

Usage:
    python upload_to_hf.py --username YOUR_HF_USERNAME

Before running, make sure you have logged in:
    pip install huggingface_hub
    huggingface-cli login
"""

import argparse
import os
from huggingface_hub import HfApi, login


def main():
    parser = argparse.ArgumentParser(description="Upload model to Hugging Face Hub")
    parser.add_argument("--username", type=str, required=True, help="Your Hugging Face username")
    parser.add_argument(
        "--model_path",
        type=str,
        default=os.path.join(
            os.path.dirname(__file__),
            "final_model_extracted",
            "results",
            "20260226_183652_DeepSeek-R1-Distill-Qwen-1.5B",
            "final_model",
        ),
        help="Path to the final_model folder",
    )
    parser.add_argument("--repo_name", type=str, default="math-topic-classifier", help="Repository name on HF Hub")
    args = parser.parse_args()

    repo_id = f"{args.username}/{args.repo_name}"

    print(f"[1/3] Logging in to Hugging Face...")
    # login() will prompt for token if not already logged in

    print(f"[2/3] Creating repository: {repo_id}")
    api = HfApi()
    api.create_repo(repo_id, repo_type="model", exist_ok=True)

    print(f"[3/3] Uploading model files from: {args.model_path}")
    api.upload_folder(
        folder_path=args.model_path,
        repo_id=repo_id,
        repo_type="model",
    )

    print(f"\n{'='*60}")
    print(f"  SUCCESS! Model uploaded to:")
    print(f"  https://huggingface.co/{repo_id}")
    print(f"{'='*60}")
    print(f"\nNext step: Create a Hugging Face Space for inference.")
    print(f"Your ENDPOINT_URL will be: https://{args.username}-math-topic-classifier-api.hf.space/predict")


if __name__ == "__main__":
    main()
