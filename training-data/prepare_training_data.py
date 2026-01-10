#!/usr/bin/env python3
"""
Training Data Preparation Pipeline

Converts all downloaded datasets and synthetic documents into the unified
training format for fine-tuning Mistral-7B on document extraction.

Training example format:
{
    "instruction": "Extract structured data from this [document_type].",
    "input": "[OCR TEXT FROM DOCUMENT]",
    "output": "{\"document_type\": \"invoice\", \"fields\": {...}}"
}
"""

import json
import random
from pathlib import Path
from typing import Any

# Dataset paths
BASE_DIR = Path(__file__).parent
PUBLIC_DATASETS_DIR = BASE_DIR / "public-datasets"
SYNTHETIC_DIR = BASE_DIR / "synthetic"
OUTPUT_DIR = BASE_DIR / "processed"


def create_training_example(
    document_type: str,
    text_content: str,
    extracted_fields: dict[str, Any],
) -> dict[str, str]:
    """Create a training example in the instruction-tuning format."""

    # Instruction templates for variety
    instructions = [
        f"Extract structured data from this {document_type}.",
        f"Parse the following {document_type} and extract all relevant fields.",
        f"Analyze this {document_type} and return the extracted information as JSON.",
        f"Read the {document_type} below and extract the key fields.",
        f"Process this {document_type} document and identify all important values.",
    ]

    # Build the output JSON
    output = {
        "document_type": document_type,
        "fields": extracted_fields
    }

    return {
        "instruction": random.choice(instructions),
        "input": text_content.strip(),
        "output": json.dumps(output, indent=2)
    }


def process_funsd():
    """Process FUNSD form understanding dataset."""
    print("\nProcessing FUNSD dataset...")
    examples = []

    funsd_dir = PUBLIC_DATASETS_DIR / "funsd"

    for split in ["train", "test"]:
        split_dir = funsd_dir / split
        if not split_dir.exists():
            continue

        json_files = list(split_dir.glob("*.json"))
        print(f"  Found {len(json_files)} files in {split}")

        for json_file in json_files:
            try:
                with open(json_file) as f:
                    data = json.load(f)

                # FUNSD has words and NER tags
                words = data.get("words", [])
                ner_tags = data.get("ner_tags", [])

                if not words:
                    continue

                # Reconstruct text
                text = " ".join(words)

                # Extract fields based on NER tags
                # FUNSD tags: 0=OTHER, 1=HEADER, 2=QUESTION, 3=ANSWER
                fields = {
                    "form_headers": [],
                    "form_questions": [],
                    "form_answers": [],
                }

                for word, tag in zip(words, ner_tags):
                    if tag == 1:
                        fields["form_headers"].append(word)
                    elif tag == 2:
                        fields["form_questions"].append(word)
                    elif tag == 3:
                        fields["form_answers"].append(word)

                # Create training example
                example = create_training_example("form", text, fields)
                examples.append(example)

            except Exception as e:
                print(f"  Error processing {json_file}: {e}")

    print(f"  Processed {len(examples)} FUNSD examples")
    return examples


def process_cord():
    """Process CORD receipt dataset."""
    print("\nProcessing CORD dataset...")
    examples = []

    cord_dir = PUBLIC_DATASETS_DIR / "cord"

    for split in ["train", "validation", "test"]:
        split_dir = cord_dir / split
        if not split_dir.exists():
            continue

        json_files = list(split_dir.glob("*.json"))
        print(f"  Found {len(json_files)} files in {split}")

        for json_file in json_files:
            try:
                with open(json_file) as f:
                    data = json.load(f)

                # CORD has ground_truth in nested format
                if isinstance(data, str):
                    data = json.loads(data)

                # Extract text and fields from CORD format
                gt = data.get("gt_parse", data) if isinstance(data, dict) else {}

                # Build text from menu items and totals
                text_parts = []
                fields = {}

                # Menu items
                menu = gt.get("menu", [])
                if menu:
                    fields["menu_items"] = []
                    for item in menu:
                        if isinstance(item, dict):
                            item_text = f"{item.get('nm', '')} {item.get('price', '')}"
                            text_parts.append(item_text)
                            fields["menu_items"].append({
                                "name": item.get("nm", ""),
                                "price": item.get("price", ""),
                                "quantity": item.get("cnt", "1"),
                            })

                # Totals
                total = gt.get("total", {})
                if total:
                    fields["subtotal"] = total.get("sub_total_price", "")
                    fields["tax"] = total.get("tax_price", "")
                    fields["total"] = total.get("total_price", "")
                    text_parts.append(f"Total: {fields.get('total', '')}")

                # Store info
                store = gt.get("store", {})
                if store:
                    fields["merchant_name"] = store.get("store_name", "")
                    fields["merchant_address"] = store.get("store_address", "")
                    text_parts.insert(0, fields.get("merchant_name", ""))

                if not text_parts:
                    continue

                text = "\n".join(text_parts)
                example = create_training_example("receipt", text, fields)
                examples.append(example)

            except Exception as e:
                print(f"  Error processing {json_file}: {e}")

    print(f"  Processed {len(examples)} CORD examples")
    return examples


def process_coru():
    """Process CORU/ReceiptSense multilingual receipt dataset."""
    print("\nProcessing CORU dataset...")
    examples = []

    coru_dir = PUBLIC_DATASETS_DIR / "coru"

    for split in ["train", "validation", "test"]:
        split_dir = coru_dir / split
        if not split_dir.exists():
            continue

        json_files = list(split_dir.glob("*.json"))
        print(f"  Found {len(json_files)} files in {split}")

        # Limit to first 2000 per split for manageable training size
        for json_file in json_files[:2000]:
            try:
                with open(json_file) as f:
                    data = json.load(f)

                # CORU has various fields
                fields = {}
                text_parts = []

                # Extract common receipt fields
                if "merchant_name" in data:
                    fields["merchant_name"] = str(data["merchant_name"])
                    text_parts.append(fields["merchant_name"])

                if "date" in data:
                    fields["date"] = str(data["date"])
                    text_parts.append(f"Date: {fields['date']}")

                if "total" in data:
                    fields["total"] = str(data["total"])
                    text_parts.append(f"Total: {fields['total']}")

                if "currency" in data:
                    fields["currency"] = str(data["currency"])

                if "items" in data:
                    fields["line_items"] = data["items"]

                # Use OCR text if available
                if "text" in data:
                    text = str(data["text"])
                elif "ocr_text" in data:
                    text = str(data["ocr_text"])
                else:
                    text = "\n".join(text_parts) if text_parts else ""

                if not text or not fields:
                    continue

                example = create_training_example("receipt", text, fields)
                examples.append(example)

            except Exception as e:
                print(f"  Error processing {json_file}: {e}")

    print(f"  Processed {len(examples)} CORU examples")
    return examples


def parse_python_dict_string(s: str) -> dict:
    """
    Parse a Python dict string representation to JSON.
    Converts single quotes to double quotes for JSON compatibility.
    """
    # Replace single quotes with double quotes (careful with nested quotes)
    import re
    # This is a simple conversion for basic dict strings
    s = s.replace("'", '"')
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return {}


def process_invoice_ocr():
    """Process invoice-ocr-json dataset."""
    print("\nProcessing invoice-ocr-json dataset...")
    examples = []

    invoice_dir = PUBLIC_DATASETS_DIR / "invoice-ocr-json"

    for split_dir in invoice_dir.iterdir():
        if not split_dir.is_dir():
            continue

        json_files = list(split_dir.glob("*.json"))
        print(f"  Found {len(json_files)} files in {split_dir.name}")

        for json_file in json_files:
            try:
                with open(json_file) as f:
                    raw_data = json.load(f)

                # The data field is a string representation of a dict
                if "data" in raw_data and isinstance(raw_data["data"], str):
                    data = parse_python_dict_string(raw_data["data"])
                    if not data:
                        continue
                else:
                    data = raw_data

                fields = {}
                text_parts = []

                # Extract invoice number
                if "invoice_number" in data:
                    fields["invoice_number"] = str(data["invoice_number"])
                    text_parts.append(f"Invoice #{fields['invoice_number']}")

                # Extract date
                if "date_of_issue" in data:
                    fields["invoice_date"] = str(data["date_of_issue"])
                    text_parts.append(f"Date: {fields['invoice_date']}")

                # Extract seller info
                seller = data.get("seller", {})
                if seller:
                    fields["vendor_name"] = seller.get("name", "")
                    fields["vendor_address"] = seller.get("address", "")
                    fields["vendor_tax_id"] = seller.get("tax_id", "")
                    text_parts.insert(0, fields["vendor_name"])
                    text_parts.append(f"Address: {fields['vendor_address']}")

                # Extract client info
                client = data.get("client", {})
                if client:
                    fields["customer_name"] = client.get("name", "")
                    fields["customer_address"] = client.get("address", "")
                    text_parts.append(f"\nBill To: {fields['customer_name']}")

                # Extract items
                items = data.get("items", [])
                if items:
                    fields["line_items"] = []
                    for item in items:
                        fields["line_items"].append({
                            "description": item.get("description", ""),
                            "quantity": item.get("quantity", 1),
                            "unit_price": item.get("net_price", 0),
                            "amount": item.get("gross_worth", 0),
                        })
                        text_parts.append(f"{item.get('description', '')} x{item.get('quantity', 1)} ${item.get('gross_worth', 0)}")

                # Extract summary/totals
                summary = data.get("summary", {})
                if summary:
                    fields["subtotal"] = summary.get("net_worth", 0)
                    fields["tax"] = summary.get("vat", 0)
                    fields["total"] = summary.get("gross_worth", 0)
                    text_parts.append(f"\nSubtotal: ${fields['subtotal']}")
                    text_parts.append(f"Tax: ${fields['tax']}")
                    text_parts.append(f"Total: ${fields['total']}")

                text = "\n".join(str(p) for p in text_parts if p)

                if not text or not fields:
                    continue

                example = create_training_example("invoice", text, fields)
                examples.append(example)

            except Exception as e:
                print(f"  Error processing {json_file}: {e}")

    print(f"  Processed {len(examples)} invoice examples")
    return examples


def process_synthetic():
    """Process synthetic documents generated by our generator."""
    print("\nProcessing synthetic documents...")
    examples = []

    doc_type_dirs = {
        "invoices": "invoice",
        "receipts": "receipt",
        "contracts": "contract",
        "w2s": "w2",
    }

    for dir_name, doc_type in doc_type_dirs.items():
        type_dir = SYNTHETIC_DIR / dir_name
        if not type_dir.exists():
            continue

        json_files = list(type_dir.glob("*.json"))
        print(f"  Found {len(json_files)} synthetic {doc_type}s")

        for json_file in json_files:
            try:
                with open(json_file) as f:
                    data = json.load(f)

                # Synthetic documents have ground_truth
                ground_truth = data.get("ground_truth", {})

                if not ground_truth:
                    continue

                # For synthetic docs, we create simulated OCR text
                # In production, we'd OCR the generated HTML/PDF
                text = simulate_ocr_text(doc_type, ground_truth)

                # Remove document_type from fields (it's in the output separately)
                fields = {k: v for k, v in ground_truth.items() if k != "document_type"}

                example = create_training_example(doc_type, text, fields)
                examples.append(example)

            except Exception as e:
                print(f"  Error processing {json_file}: {e}")

    print(f"  Processed {len(examples)} synthetic examples")
    return examples


def simulate_ocr_text(doc_type: str, data: dict) -> str:
    """
    Simulate OCR text from ground truth data.
    This represents what OCR would extract from the document.
    """
    text_parts = []

    if doc_type == "invoice":
        text_parts.append(data.get("vendor_name", ""))
        text_parts.append(f"Invoice #{data.get('invoice_number', '')}")
        text_parts.append(f"Date: {data.get('invoice_date', '')}")
        text_parts.append(f"Due: {data.get('due_date', '')}")
        text_parts.append(f"\nBill To: {data.get('customer_name', '')}")

        # Line items
        for item in data.get("line_items", []):
            text_parts.append(f"{item.get('description', '')} x{item.get('quantity', 1)} ${item.get('amount', 0)}")

        text_parts.append(f"\nSubtotal: ${data.get('subtotal', 0)}")
        text_parts.append(f"Tax: ${data.get('tax_amount', 0)}")
        text_parts.append(f"Total: ${data.get('total', 0)} {data.get('currency', 'USD')}")

    elif doc_type == "receipt":
        text_parts.append(data.get("merchant_name", ""))
        addr = data.get("merchant_address", {})
        if addr:
            text_parts.append(f"{addr.get('street', '')}, {addr.get('city', '')} {addr.get('state', '')}")
        text_parts.append(f"Date: {data.get('date', '')} {data.get('time', '')}")

        for item in data.get("line_items", []):
            text_parts.append(f"{item.get('name', '')} ${item.get('total', 0)}")

        text_parts.append(f"Subtotal: ${data.get('subtotal', 0)}")
        text_parts.append(f"Tax: ${data.get('tax', 0)}")
        text_parts.append(f"Total: ${data.get('total', 0)}")

    elif doc_type == "contract":
        text_parts.append(data.get("contract_type", "CONTRACT"))
        text_parts.append(f"\nEffective Date: {data.get('effective_date', '')}")
        text_parts.append(f"Expiration Date: {data.get('expiration_date', '')}")

        party_a = data.get("party_a", {})
        party_b = data.get("party_b", {})
        text_parts.append(f"\nParty A: {party_a.get('name', '')}")
        text_parts.append(f"Party B: {party_b.get('name', '')}")

        text_parts.append(f"\nValue: ${data.get('contract_value', 0)}")
        text_parts.append(f"Terms: {data.get('payment_terms', '')}")

    elif doc_type == "w2":
        text_parts.append("Form W-2 Wage and Tax Statement")
        text_parts.append(f"Tax Year: {data.get('tax_year', '')}")
        text_parts.append(f"\nEmployer: {data.get('employer_name', '')}")
        text_parts.append(f"EIN: {data.get('employer_ein', '')}")
        text_parts.append(f"\nEmployee: {data.get('employee_name', '')}")
        text_parts.append(f"SSN: ***-**-{data.get('employee_ssn_last4', '****')}")
        text_parts.append(f"\nWages: ${data.get('wages', 0)}")
        text_parts.append(f"Federal Tax Withheld: ${data.get('federal_tax_withheld', 0)}")
        text_parts.append(f"Social Security Wages: ${data.get('social_security_wages', 0)}")
        text_parts.append(f"Medicare Wages: ${data.get('medicare_wages', 0)}")

    return "\n".join(str(p) for p in text_parts if p)


def create_classification_examples(examples: list[dict]) -> list[dict]:
    """Create document classification training examples."""
    print("\nCreating classification examples...")

    classification_examples = []

    for ex in examples:
        try:
            output = json.loads(ex["output"])
            doc_type = output.get("document_type", "other")

            classification_example = {
                "instruction": "Classify this document into one of: invoice, receipt, contract, w2, form, other.",
                "input": ex["input"][:2000],  # Truncate for classification
                "output": json.dumps({"document_type": doc_type})
            }
            classification_examples.append(classification_example)
        except Exception:
            continue

    print(f"  Created {len(classification_examples)} classification examples")
    return classification_examples


def split_dataset(examples: list[dict], train_ratio: float = 0.9) -> tuple[list, list]:
    """Split examples into train and validation sets."""
    random.shuffle(examples)
    split_idx = int(len(examples) * train_ratio)
    return examples[:split_idx], examples[split_idx:]


def save_jsonl(examples: list[dict], filepath: Path):
    """Save examples in JSONL format (one JSON per line)."""
    with open(filepath, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")


def main():
    """Main pipeline to prepare all training data."""
    print("=" * 60)
    print("Training Data Preparation Pipeline")
    print("=" * 60)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Process all datasets
    all_extraction_examples = []

    # Public datasets
    all_extraction_examples.extend(process_funsd())
    all_extraction_examples.extend(process_cord())
    all_extraction_examples.extend(process_coru())
    all_extraction_examples.extend(process_invoice_ocr())

    # Synthetic documents
    all_extraction_examples.extend(process_synthetic())

    print(f"\n{'='*60}")
    print(f"Total extraction examples: {len(all_extraction_examples)}")

    # Create classification examples
    classification_examples = create_classification_examples(all_extraction_examples)

    # Split datasets
    print("\nSplitting into train/validation...")
    extract_train, extract_val = split_dataset(all_extraction_examples)
    classify_train, classify_val = split_dataset(classification_examples)

    # Save extraction dataset
    save_jsonl(extract_train, OUTPUT_DIR / "extraction_train.jsonl")
    save_jsonl(extract_val, OUTPUT_DIR / "extraction_val.jsonl")

    # Save classification dataset
    save_jsonl(classify_train, OUTPUT_DIR / "classification_train.jsonl")
    save_jsonl(classify_val, OUTPUT_DIR / "classification_val.jsonl")

    # Save combined dataset (for single-model approach)
    combined = all_extraction_examples + classification_examples
    combined_train, combined_val = split_dataset(combined)
    save_jsonl(combined_train, OUTPUT_DIR / "combined_train.jsonl")
    save_jsonl(combined_val, OUTPUT_DIR / "combined_val.jsonl")

    # Create dataset summary
    summary = {
        "extraction": {
            "total": len(all_extraction_examples),
            "train": len(extract_train),
            "validation": len(extract_val),
        },
        "classification": {
            "total": len(classification_examples),
            "train": len(classify_train),
            "validation": len(classify_val),
        },
        "combined": {
            "total": len(combined),
            "train": len(combined_train),
            "validation": len(combined_val),
        },
        "files": {
            "extraction_train": "extraction_train.jsonl",
            "extraction_val": "extraction_val.jsonl",
            "classification_train": "classification_train.jsonl",
            "classification_val": "classification_val.jsonl",
            "combined_train": "combined_train.jsonl",
            "combined_val": "combined_val.jsonl",
        }
    }

    with open(OUTPUT_DIR / "dataset_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n{'='*60}")
    print("Training Data Preparation Complete!")
    print(f"{'='*60}")
    print(f"\nDataset Summary:")
    print(f"  Extraction: {summary['extraction']['train']} train, {summary['extraction']['validation']} val")
    print(f"  Classification: {summary['classification']['train']} train, {summary['classification']['validation']} val")
    print(f"  Combined: {summary['combined']['train']} train, {summary['combined']['validation']} val")
    print(f"\nOutput directory: {OUTPUT_DIR}")
    print("\nNext step: Run fine_tune.py to train the model")


if __name__ == "__main__":
    main()
