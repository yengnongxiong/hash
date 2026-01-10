#!/usr/bin/env python3
"""
Fine-Tune Mistral-7B on Together.ai

This script fine-tunes a Mistral-7B model for document extraction using
Together.ai's fine-tuning API.

Requirements:
    pip install together

Environment:
    TOGETHER_API_KEY=your_api_key

Usage:
    python fine_tune_together.py --prepare    # Prepare data for upload
    python fine_tune_together.py --upload     # Upload training data
    python fine_tune_together.py --train      # Start fine-tuning
    python fine_tune_together.py --status     # Check job status
    python fine_tune_together.py --all        # Run all steps
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

# Check for together package
try:
    import together
except ImportError:
    print("Installing together package...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "together"])
    import together

BASE_DIR = Path(__file__).parent
PROCESSED_DIR = BASE_DIR / "processed"
TOGETHER_DIR = BASE_DIR / "together-ai"

# Together.ai configuration
# Using Llama 3.1 8B for serverless LoRA support
MODEL_NAME = "meta-llama/Meta-Llama-3.1-8B-Instruct-Reference"
FINE_TUNED_SUFFIX = "hash-document-extraction"

# Training hyperparameters (from PRD section 7.1)
TRAINING_CONFIG = {
    "n_epochs": 3,
    "learning_rate": 2e-4,
    "batch_size": 8,  # Together.ai minimum is 8
    "warmup_ratio": 0.1,
}


def check_api_key():
    """Ensure Together API key is set."""
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        print("Error: TOGETHER_API_KEY environment variable not set")
        print("\nTo get an API key:")
        print("  1. Sign up at https://together.ai")
        print("  2. Go to Settings > API Keys")
        print("  3. Create a new API key")
        print("  4. Set it: export TOGETHER_API_KEY='your_key_here'")
        sys.exit(1)
    return api_key


def convert_to_together_format(input_path: Path, output_path: Path):
    """
    Convert JSONL to Together.ai chat format.

    Note: Mistral-7B-Instruct-v0.2 doesn't support system role,
    so we prepend the system prompt to the user message.

    Together.ai expects:
    {
        "messages": [
            {"role": "user", "content": "instruction + input"},
            {"role": "assistant", "content": "output"}
        ]
    }
    """
    print(f"Converting {input_path} to Together.ai format...")

    system_prompt = """You are an expert document extraction assistant. Your task is to analyze document text (from OCR) and extract structured data. Always respond with valid JSON containing the document type and extracted fields. Be precise and extract all available information."""

    converted = []
    with open(input_path) as f:
        for line in f:
            try:
                data = json.loads(line.strip())

                # Combine system prompt, instruction and input into user message
                # (Mistral Instruct doesn't support system role)
                user_content = f"{system_prompt}\n\n{data['instruction']}\n\n{data['input']}"

                together_format = {
                    "messages": [
                        {"role": "user", "content": user_content},
                        {"role": "assistant", "content": data["output"]}
                    ]
                }
                converted.append(together_format)
            except Exception as e:
                print(f"  Skipping malformed line: {e}")

    # Write converted data
    with open(output_path, "w") as f:
        for item in converted:
            f.write(json.dumps(item) + "\n")

    print(f"  Converted {len(converted)} examples")
    return len(converted)


def prepare_data():
    """Prepare training data for Together.ai upload."""
    print("\n" + "=" * 60)
    print("Preparing data for Together.ai")
    print("=" * 60)

    TOGETHER_DIR.mkdir(parents=True, exist_ok=True)

    # Convert extraction dataset
    if (PROCESSED_DIR / "combined_train.jsonl").exists():
        convert_to_together_format(
            PROCESSED_DIR / "combined_train.jsonl",
            TOGETHER_DIR / "train.jsonl"
        )
        convert_to_together_format(
            PROCESSED_DIR / "combined_val.jsonl",
            TOGETHER_DIR / "validation.jsonl"
        )
    else:
        print("Error: Run prepare_training_data.py first to generate training data")
        sys.exit(1)

    # Validate data
    train_path = TOGETHER_DIR / "train.jsonl"
    val_path = TOGETHER_DIR / "validation.jsonl"

    train_count = sum(1 for _ in open(train_path))
    val_count = sum(1 for _ in open(val_path))

    print(f"\nPrepared files:")
    print(f"  Train: {train_path} ({train_count} examples)")
    print(f"  Validation: {val_path} ({val_count} examples)")

    return train_path, val_path


def upload_data(train_path: Path, val_path: Path):
    """Upload training data to Together.ai."""
    print("\n" + "=" * 60)
    print("Uploading data to Together.ai")
    print("=" * 60)

    check_api_key()
    client = together.Together()

    # Upload training file
    print(f"\nUploading {train_path}...")
    train_file = client.files.upload(file=str(train_path), purpose="fine-tune")
    print(f"  Training file ID: {train_file.id}")

    # Upload validation file
    print(f"\nUploading {val_path}...")
    val_file = client.files.upload(file=str(val_path), purpose="fine-tune")
    print(f"  Validation file ID: {val_file.id}")

    # Save file IDs for later
    file_info = {
        "train_file_id": train_file.id,
        "val_file_id": val_file.id,
        "uploaded_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(TOGETHER_DIR / "file_ids.json", "w") as f:
        json.dump(file_info, f, indent=2)

    print(f"\nFile IDs saved to {TOGETHER_DIR / 'file_ids.json'}")
    return train_file.id, val_file.id


def start_fine_tuning(train_file_id: str = None, val_file_id: str = None):
    """Start fine-tuning job on Together.ai."""
    print("\n" + "=" * 60)
    print("Starting fine-tuning job")
    print("=" * 60)

    check_api_key()
    client = together.Together()

    # Load file IDs if not provided
    if not train_file_id:
        file_info_path = TOGETHER_DIR / "file_ids.json"
        if file_info_path.exists():
            with open(file_info_path) as f:
                file_info = json.load(f)
            train_file_id = file_info["train_file_id"]
            val_file_id = file_info.get("val_file_id")
        else:
            print("Error: No file IDs found. Run --upload first.")
            sys.exit(1)

    print(f"\nBase model: {MODEL_NAME}")
    print(f"Training file: {train_file_id}")
    print(f"Validation file: {val_file_id}")
    print(f"\nHyperparameters:")
    for key, value in TRAINING_CONFIG.items():
        print(f"  {key}: {value}")

    # Create fine-tuning job
    print("\nCreating fine-tuning job...")

    job = client.fine_tuning.create(
        training_file=train_file_id,
        validation_file=val_file_id,
        model=MODEL_NAME,
        n_epochs=TRAINING_CONFIG["n_epochs"],
        learning_rate=TRAINING_CONFIG["learning_rate"],
        batch_size=TRAINING_CONFIG["batch_size"],
        warmup_ratio=TRAINING_CONFIG["warmup_ratio"],
        suffix=FINE_TUNED_SUFFIX,
    )

    print(f"\nFine-tuning job created!")
    print(f"  Job ID: {job.id}")
    print(f"  Status: {job.status}")

    # Save job info
    job_info = {
        "job_id": job.id,
        "model": MODEL_NAME,
        "suffix": FINE_TUNED_SUFFIX,
        "train_file_id": train_file_id,
        "val_file_id": val_file_id,
        "config": TRAINING_CONFIG,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }

    with open(TOGETHER_DIR / "job_info.json", "w") as f:
        json.dump(job_info, f, indent=2)

    print(f"\nJob info saved to {TOGETHER_DIR / 'job_info.json'}")
    print("\nMonitor progress with: python fine_tune_together.py --status")

    return job.id


def check_status():
    """Check fine-tuning job status."""
    print("\n" + "=" * 60)
    print("Checking fine-tuning status")
    print("=" * 60)

    check_api_key()
    client = together.Together()

    # Load job ID
    job_info_path = TOGETHER_DIR / "job_info.json"
    if not job_info_path.exists():
        print("Error: No job info found. Run --train first.")
        sys.exit(1)

    with open(job_info_path) as f:
        job_info = json.load(f)

    job_id = job_info["job_id"]
    print(f"\nJob ID: {job_id}")

    # Get job status
    job = client.fine_tuning.retrieve(job_id)

    print(f"\nStatus: {job.status}")

    if hasattr(job, "output_name") and job.output_name:
        print(f"Fine-tuned model: {job.output_name}")

        # Save the model name
        job_info["fine_tuned_model"] = job.output_name
        with open(job_info_path, "w") as f:
            json.dump(job_info, f, indent=2)

        print(f"\nModel ready! You can now use it with:")
        print(f"  Model ID: {job.output_name}")

    if hasattr(job, "events") and job.events:
        print(f"\nRecent events:")
        for event in job.events[-5:]:
            print(f"  {event.created_at}: {event.message}")

    return job


def list_models():
    """List available fine-tuned models."""
    print("\n" + "=" * 60)
    print("Available fine-tuned models")
    print("=" * 60)

    check_api_key()
    client = together.Together()

    # List fine-tuning jobs
    jobs = client.fine_tuning.list()

    print("\nFine-tuning jobs:")
    for job in jobs.data:
        status_icon = "" if job.status == "completed" else "" if job.status == "failed" else ""
        print(f"  {status_icon} {job.id}")
        print(f"      Status: {job.status}")
        print(f"      Model: {job.model}")
        if hasattr(job, "output_name") and job.output_name:
            print(f"      Output: {job.output_name}")
        print()


def test_model(prompt: str = None):
    """Test the fine-tuned model with a sample prompt."""
    print("\n" + "=" * 60)
    print("Testing fine-tuned model")
    print("=" * 60)

    check_api_key()
    client = together.Together()

    # Load model name
    job_info_path = TOGETHER_DIR / "job_info.json"
    if job_info_path.exists():
        with open(job_info_path) as f:
            job_info = json.load(f)
        model_name = job_info.get("fine_tuned_model")
    else:
        model_name = None

    if not model_name:
        print("Error: No fine-tuned model found. Check --status first.")
        sys.exit(1)

    print(f"\nUsing model: {model_name}")

    # Default test prompt
    if not prompt:
        prompt = """Extract structured data from this invoice.

ACME Corporation
123 Business Street
New York, NY 10001

INVOICE

Invoice #: INV-2024-001
Date: January 15, 2024
Due Date: February 14, 2024

Bill To:
XYZ Company
456 Client Avenue
Los Angeles, CA 90001

Description                    Qty    Price     Amount
Consulting Services            10     $150.00   $1,500.00
Software License               1      $500.00   $500.00

                               Subtotal:        $2,000.00
                               Tax (8%):        $160.00
                               Total:           $2,160.00

Payment Terms: Net 30
"""

    print(f"\nTest prompt:\n{prompt[:200]}...")

    # Call the model
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {
                "role": "system",
                "content": "You are an expert document extraction assistant. Extract structured data as JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=2000,
        temperature=0.1,
    )

    print(f"\nModel response:")
    print(response.choices[0].message.content)


def main():
    parser = argparse.ArgumentParser(description="Fine-tune Mistral-7B on Together.ai")
    parser.add_argument("--prepare", action="store_true", help="Prepare data for upload")
    parser.add_argument("--upload", action="store_true", help="Upload training data")
    parser.add_argument("--train", action="store_true", help="Start fine-tuning")
    parser.add_argument("--status", action="store_true", help="Check job status")
    parser.add_argument("--list", action="store_true", help="List fine-tuned models")
    parser.add_argument("--test", action="store_true", help="Test the fine-tuned model")
    parser.add_argument("--all", action="store_true", help="Run prepare, upload, and train")

    args = parser.parse_args()

    if args.all:
        train_path, val_path = prepare_data()
        train_file_id, val_file_id = upload_data(train_path, val_path)
        start_fine_tuning(train_file_id, val_file_id)
    elif args.prepare:
        prepare_data()
    elif args.upload:
        train_path = TOGETHER_DIR / "train.jsonl"
        val_path = TOGETHER_DIR / "validation.jsonl"
        if not train_path.exists():
            print("Run --prepare first")
            sys.exit(1)
        upload_data(train_path, val_path)
    elif args.train:
        start_fine_tuning()
    elif args.status:
        check_status()
    elif args.list:
        list_models()
    elif args.test:
        test_model()
    else:
        parser.print_help()
        print("\n" + "=" * 60)
        print("Quick Start Guide")
        print("=" * 60)
        print("\n1. Set your Together.ai API key:")
        print("   export TOGETHER_API_KEY='your_key_here'")
        print("\n2. Prepare training data (run prepare_training_data.py first):")
        print("   python fine_tune_together.py --prepare")
        print("\n3. Upload to Together.ai:")
        print("   python fine_tune_together.py --upload")
        print("\n4. Start fine-tuning:")
        print("   python fine_tune_together.py --train")
        print("\n5. Monitor progress:")
        print("   python fine_tune_together.py --status")
        print("\n6. Test the model:")
        print("   python fine_tune_together.py --test")
        print("\nOr run all at once:")
        print("   python fine_tune_together.py --all")


if __name__ == "__main__":
    main()
