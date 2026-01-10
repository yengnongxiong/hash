#!/usr/bin/env python3
"""
Download public datasets for document extraction fine-tuning.

Datasets:
- FUNSD: Form understanding dataset (199 forms)
- CORD: Receipt parsing dataset (1,000 receipts)
- CORU/ReceiptSense: Multilingual receipts (20,000+)
- invoice-ocr-json: Invoice extraction dataset

Usage:
    pip install datasets pillow tqdm
    python download_datasets.py
"""

import json
import subprocess
import sys
from pathlib import Path

# Check if datasets library is available
try:
    from datasets import load_dataset
    from tqdm import tqdm
except ImportError:
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "datasets", "pillow", "tqdm"])
    from datasets import load_dataset
    from tqdm import tqdm


BASE_DIR = Path(__file__).parent
PUBLIC_DATASETS_DIR = BASE_DIR / "public-datasets"


def download_funsd():
    """Download FUNSD form understanding dataset."""
    print("\n" + "="*60)
    print("Downloading FUNSD dataset...")
    print("="*60)

    output_dir = PUBLIC_DATASETS_DIR / "funsd"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        dataset = load_dataset("nielsr/funsd", trust_remote_code=True)

        # Save dataset info
        info = {
            "name": "FUNSD",
            "description": "Form Understanding in Noisy Scanned Documents",
            "source": "https://huggingface.co/datasets/nielsr/funsd",
            "size": {
                "train": len(dataset["train"]) if "train" in dataset else 0,
                "test": len(dataset["test"]) if "test" in dataset else 0,
            },
            "fields": ["image", "words", "bboxes", "ner_tags"],
            "use_case": "Form field extraction, layout understanding"
        }

        with open(output_dir / "dataset_info.json", "w") as f:
            json.dump(info, f, indent=2)

        # Save samples
        for split in ["train", "test"]:
            if split in dataset:
                split_dir = output_dir / split
                split_dir.mkdir(exist_ok=True)

                for i, example in enumerate(tqdm(dataset[split], desc=f"Saving {split}")):
                    # Save image if present
                    if "image" in example and example["image"]:
                        img_path = split_dir / f"{i:04d}.png"
                        example["image"].save(img_path)

                    # Save annotations
                    annotations = {
                        "words": example.get("words", []),
                        "bboxes": example.get("bboxes", []),
                        "ner_tags": example.get("ner_tags", []),
                    }
                    with open(split_dir / f"{i:04d}.json", "w") as f:
                        json.dump(annotations, f, indent=2)

        print(f"FUNSD saved to {output_dir}")
        return True
    except Exception as e:
        print(f"Error downloading FUNSD: {e}")
        return False


def download_cord():
    """Download CORD receipt dataset."""
    print("\n" + "="*60)
    print("Downloading CORD dataset...")
    print("="*60)

    output_dir = PUBLIC_DATASETS_DIR / "cord"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        dataset = load_dataset("naver-clova-ix/cord-v2", trust_remote_code=True)

        # Save dataset info
        info = {
            "name": "CORD",
            "description": "Consolidated Receipt Dataset for Post-OCR Parsing",
            "source": "https://huggingface.co/datasets/naver-clova-ix/cord-v2",
            "size": {
                "train": len(dataset["train"]) if "train" in dataset else 0,
                "validation": len(dataset["validation"]) if "validation" in dataset else 0,
                "test": len(dataset["test"]) if "test" in dataset else 0,
            },
            "fields": ["image", "ground_truth"],
            "use_case": "Receipt parsing, menu items extraction"
        }

        with open(output_dir / "dataset_info.json", "w") as f:
            json.dump(info, f, indent=2)

        # Save samples
        for split in ["train", "validation", "test"]:
            if split in dataset:
                split_dir = output_dir / split
                split_dir.mkdir(exist_ok=True)

                for i, example in enumerate(tqdm(dataset[split], desc=f"Saving {split}")):
                    # Save image
                    if "image" in example and example["image"]:
                        img_path = split_dir / f"{i:04d}.png"
                        example["image"].save(img_path)

                    # Save ground truth
                    gt = example.get("ground_truth", {})
                    with open(split_dir / f"{i:04d}.json", "w") as f:
                        json.dump(gt, f, indent=2)

        print(f"CORD saved to {output_dir}")
        return True
    except Exception as e:
        print(f"Error downloading CORD: {e}")
        return False


def download_coru():
    """Download CORU/ReceiptSense multilingual receipt dataset."""
    print("\n" + "="*60)
    print("Downloading CORU (ReceiptSense) dataset...")
    print("="*60)

    output_dir = PUBLIC_DATASETS_DIR / "coru"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        dataset = load_dataset("abdoelsayed/CORU", trust_remote_code=True)

        # Save dataset info
        info = {
            "name": "CORU/ReceiptSense",
            "description": "Multilingual receipt dataset with 20,000+ samples",
            "source": "https://huggingface.co/datasets/abdoelsayed/CORU",
            "size": {
                split: len(dataset[split]) for split in dataset.keys()
            },
            "fields": list(dataset[list(dataset.keys())[0]].features.keys()) if dataset else [],
            "use_case": "Receipt OCR, multilingual document processing"
        }

        with open(output_dir / "dataset_info.json", "w") as f:
            json.dump(info, f, indent=2)

        # Save samples (limit to first 5000 per split to save space)
        max_samples = 5000
        for split in dataset.keys():
            split_dir = output_dir / split
            split_dir.mkdir(exist_ok=True)

            split_data = dataset[split]
            num_samples = min(len(split_data), max_samples)

            for i in tqdm(range(num_samples), desc=f"Saving {split}"):
                example = split_data[i]

                # Save image if present
                if "image" in example and example["image"]:
                    img_path = split_dir / f"{i:04d}.png"
                    try:
                        example["image"].save(img_path)
                    except Exception:
                        pass

                # Save all other fields as JSON
                data = {k: v for k, v in example.items() if k != "image"}
                with open(split_dir / f"{i:04d}.json", "w") as f:
                    json.dump(data, f, indent=2, default=str)

        print(f"CORU saved to {output_dir}")
        return True
    except Exception as e:
        print(f"Error downloading CORU: {e}")
        return False


def download_invoice_ocr():
    """Download invoice-ocr-json dataset."""
    print("\n" + "="*60)
    print("Downloading invoice-ocr-json dataset...")
    print("="*60)

    output_dir = PUBLIC_DATASETS_DIR / "invoice-ocr-json"
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        dataset = load_dataset("GokulRajaR/invoice-ocr-json", trust_remote_code=True)

        # Save dataset info
        info = {
            "name": "invoice-ocr-json",
            "description": "Invoice OCR with structured JSON labels",
            "source": "https://huggingface.co/datasets/GokulRajaR/invoice-ocr-json",
            "size": {
                split: len(dataset[split]) for split in dataset.keys()
            },
            "fields": list(dataset[list(dataset.keys())[0]].features.keys()) if dataset else [],
            "use_case": "Invoice extraction, field recognition"
        }

        with open(output_dir / "dataset_info.json", "w") as f:
            json.dump(info, f, indent=2)

        # Save samples
        for split in dataset.keys():
            split_dir = output_dir / split
            split_dir.mkdir(exist_ok=True)

            for i, example in enumerate(tqdm(dataset[split], desc=f"Saving {split}")):
                # Save image if present
                if "image" in example and example["image"]:
                    img_path = split_dir / f"{i:04d}.png"
                    try:
                        example["image"].save(img_path)
                    except Exception:
                        pass

                # Save all data as JSON
                data = {k: v for k, v in example.items() if k != "image"}
                with open(split_dir / f"{i:04d}.json", "w") as f:
                    json.dump(data, f, indent=2, default=str)

        print(f"invoice-ocr-json saved to {output_dir}")
        return True
    except Exception as e:
        print(f"Error downloading invoice-ocr-json: {e}")
        return False


def download_sroie():
    """Provide instructions for SROIE dataset (requires manual download)."""
    print("\n" + "="*60)
    print("SROIE Dataset Information")
    print("="*60)

    output_dir = PUBLIC_DATASETS_DIR / "sroie"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save download instructions
    instructions = {
        "name": "SROIE",
        "description": "ICDAR 2019 Robust Reading Challenge on Scanned Receipts OCR and Information Extraction",
        "source": "https://rrc.cvc.uab.es/?ch=13",
        "manual_download_required": True,
        "instructions": [
            "1. Visit https://rrc.cvc.uab.es/?ch=13",
            "2. Register for an account (free)",
            "3. Download the training and test data",
            "4. Extract to training-data/public-datasets/sroie/",
            "5. Expected structure:",
            "   - sroie/train/img/ (receipt images)",
            "   - sroie/train/box/ (bounding boxes)",
            "   - sroie/train/entities/ (extracted fields)",
        ],
        "fields": ["company", "date", "address", "total"],
        "size": {"train": 626, "test": 347},
        "use_case": "Receipt OCR, key information extraction"
    }

    with open(output_dir / "README.json", "w") as f:
        json.dump(instructions, f, indent=2)

    readme_text = """# SROIE Dataset

## Manual Download Required

The SROIE dataset requires manual download from the ICDAR competition website.

### Instructions:

1. Visit: https://rrc.cvc.uab.es/?ch=13
2. Register for a free account
3. Download Task 1 (Text Localization), Task 2 (Scanned Receipts OCR), and Task 3 (Key Information Extraction)
4. Extract the files to this directory

### Expected Structure:
```
sroie/
├── train/
│   ├── img/          # Receipt images (.jpg)
│   ├── box/          # Bounding box annotations
│   └── entities/     # Key-value extractions
└── test/
    ├── img/
    └── box/
```

### Fields Extracted:
- company: Company name
- date: Receipt date
- address: Store address
- total: Total amount

### Size:
- Training: 626 receipts
- Test: 347 receipts
"""

    with open(output_dir / "README.md", "w") as f:
        f.write(readme_text)

    print(f"SROIE instructions saved to {output_dir}")
    print("NOTE: SROIE requires manual download from https://rrc.cvc.uab.es/?ch=13")
    return True


def create_dataset_summary():
    """Create a summary of all downloaded datasets."""
    print("\n" + "="*60)
    print("Creating dataset summary...")
    print("="*60)

    summary = {
        "datasets": [],
        "total_samples": 0,
        "download_date": str(Path(__file__).stat().st_mtime) if Path(__file__).exists() else "unknown"
    }

    for dataset_dir in PUBLIC_DATASETS_DIR.iterdir():
        if dataset_dir.is_dir():
            info_file = dataset_dir / "dataset_info.json"
            readme_file = dataset_dir / "README.json"

            if info_file.exists():
                with open(info_file) as f:
                    info = json.load(f)
                    summary["datasets"].append({
                        "name": info.get("name", dataset_dir.name),
                        "path": str(dataset_dir),
                        "size": info.get("size", {}),
                        "use_case": info.get("use_case", ""),
                    })
                    if isinstance(info.get("size"), dict):
                        summary["total_samples"] += sum(info["size"].values())
            elif readme_file.exists():
                with open(readme_file) as f:
                    info = json.load(f)
                    summary["datasets"].append({
                        "name": info.get("name", dataset_dir.name),
                        "path": str(dataset_dir),
                        "size": info.get("size", {}),
                        "manual_download": info.get("manual_download_required", False),
                    })

    with open(PUBLIC_DATASETS_DIR / "summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nDataset Summary:")
    print(f"  Total datasets: {len(summary['datasets'])}")
    print(f"  Total samples: {summary['total_samples']}")

    return summary


def main():
    print("="*60)
    print("Document Extraction Training Data Downloader")
    print("="*60)
    print(f"\nOutput directory: {PUBLIC_DATASETS_DIR}")

    # Create directories
    PUBLIC_DATASETS_DIR.mkdir(parents=True, exist_ok=True)

    results = {}

    # Download each dataset
    results["funsd"] = download_funsd()
    results["cord"] = download_cord()
    results["coru"] = download_coru()
    results["invoice_ocr"] = download_invoice_ocr()
    results["sroie"] = download_sroie()

    # Create summary
    create_dataset_summary()

    # Print results
    print("\n" + "="*60)
    print("Download Summary")
    print("="*60)
    for name, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")

    print(f"\nDatasets saved to: {PUBLIC_DATASETS_DIR}")
    print("\nNext steps:")
    print("  1. Download SROIE manually from https://rrc.cvc.uab.es/?ch=13")
    print("  2. Run the synthetic document generator: python synthetic_generator.py")
    print("  3. Process all data into unified training format")


if __name__ == "__main__":
    main()
