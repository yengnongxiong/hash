# Document Extraction Model Training

This directory contains everything needed to fine-tune a Mistral-7B model for document extraction and deploy it via Together.ai.

## Quick Start

```bash
# 1. Set your Together.ai API key
export TOGETHER_API_KEY='your_api_key_here'

# 2. Upload training data and start fine-tuning
python3 fine_tune_together.py --all

# 3. Monitor progress
python3 fine_tune_together.py --status

# 4. Test the model when ready
python3 fine_tune_together.py --test
```

## Training Data Summary

| Dataset | Examples | Document Types |
|---------|----------|----------------|
| FUNSD | 199 | Forms |
| CORD | 998 | Receipts |
| invoice-ocr-json | 2,472 | Invoices |
| Synthetic | 2,000 | Invoices, Receipts, Contracts, W-2s |
| **Total** | **5,669** | - |

**After conversion for Together.ai:**
- Training: 10,204 examples
- Validation: 1,134 examples

## Directory Structure

```
training-data/
├── public-datasets/           # Downloaded public datasets
│   ├── funsd/                # Form understanding dataset
│   ├── cord/                 # Receipt parsing dataset
│   ├── coru/                 # Multilingual receipts (images only)
│   ├── invoice-ocr-json/     # Invoice extraction dataset
│   └── sroie/                # SROIE instructions (manual download)
├── synthetic/                 # Generated synthetic documents
│   ├── invoices/             # 500 synthetic invoices
│   ├── receipts/             # 500 synthetic receipts
│   ├── contracts/            # 500 synthetic contracts
│   └── w2s/                  # 500 synthetic W-2s
├── processed/                 # Unified training format
│   ├── combined_train.jsonl  # Training data (5,754 examples)
│   ├── combined_val.jsonl    # Validation data (640 examples)
│   └── dataset_summary.json  # Dataset statistics
├── together-ai/              # Together.ai formatted data
│   ├── train.jsonl           # Chat format training data
│   └── validation.jsonl      # Chat format validation data
├── download_datasets.py      # Download public datasets
├── synthetic_generator.py    # Generate synthetic documents
├── prepare_training_data.py  # Convert to training format
├── fine_tune_together.py     # Together.ai fine-tuning script
└── README.md                 # This file
```

## Step-by-Step Instructions

### Step 1: Get Together.ai API Key

1. Sign up at [https://together.ai](https://together.ai)
2. Go to Settings → API Keys
3. Create a new API key
4. Set the environment variable:
   ```bash
   export TOGETHER_API_KEY='your_api_key_here'
   ```

### Step 2: Prepare Training Data (Already Done)

The training data has been prepared and is ready in `together-ai/train.jsonl`:

```bash
# If you need to regenerate:
python3 prepare_training_data.py
python3 fine_tune_together.py --prepare
```

### Step 3: Upload Data to Together.ai

```bash
python3 fine_tune_together.py --upload
```

This will:
- Upload `train.jsonl` (10,204 examples)
- Upload `validation.jsonl` (1,134 examples)
- Save file IDs to `together-ai/file_ids.json`

### Step 4: Start Fine-Tuning

```bash
python3 fine_tune_together.py --train
```

**Training Configuration:**
- Base model: `mistralai/Mistral-7B-Instruct-v0.2`
- Epochs: 3
- Learning rate: 2e-4
- Batch size: 4
- Warmup ratio: 0.1

**Estimated Time:** 2-4 hours depending on queue

**Estimated Cost:** ~$50-100 for initial training

### Step 5: Monitor Progress

```bash
# Check status
python3 fine_tune_together.py --status

# List all fine-tuned models
python3 fine_tune_together.py --list
```

### Step 6: Test the Model

```bash
python3 fine_tune_together.py --test
```

### Step 7: Integrate with Application

Once training completes, add the model ID to your environment:

```bash
# In .env.local
TOGETHER_API_KEY=your_api_key
TOGETHER_FINE_TUNED_MODEL=yourorg/hash-document-extraction
```

The integration is already implemented in:
- `src/lib/ocr/together-extraction.ts`

## Training Data Format

Each training example follows this format:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an expert document extraction assistant..."
    },
    {
      "role": "user",
      "content": "Extract structured data from this invoice.\n\n[OCR TEXT]"
    },
    {
      "role": "assistant",
      "content": "{\"document_type\": \"invoice\", \"fields\": {...}}"
    }
  ]
}
```

## Expected Results

After fine-tuning, the model should achieve:

| Metric | Target | Notes |
|--------|--------|-------|
| Field extraction accuracy | >95% | On supported document types |
| Document classification | >98% | invoice, receipt, contract, w2, form |
| Confidence calibration | <5% error | Predicted vs actual accuracy |
| Inference latency | <2s | Single document |

## Cost Estimates

| Stage | Cost |
|-------|------|
| Initial fine-tuning | ~$50-100 |
| Inference (per 1K docs) | ~$5 |
| Monthly retraining | ~$25-50 |

## Troubleshooting

### "TOGETHER_API_KEY not set"
```bash
export TOGETHER_API_KEY='your_key_here'
```

### "No file IDs found"
Run upload first:
```bash
python3 fine_tune_together.py --upload
```

### "Job failed"
Check the error in:
```bash
python3 fine_tune_together.py --status
```

Common issues:
- Data format issues (check JSONL format)
- Invalid examples (ensure all fields are present)
- Rate limits (wait and retry)

### "Model not found"
The fine-tuned model may take a few minutes to become available after training completes. Wait and try again.

## Continuous Improvement

As users correct extractions in the app, those corrections should be:
1. Stored in `field_corrections` table
2. Exported periodically as new training data
3. Used to retrain the model monthly

This creates a learning flywheel where the model improves over time.

## References

- [Together.ai Fine-Tuning Docs](https://docs.together.ai/docs/fine-tuning)
- [PRD Section 7.1](../PRD-DOCUMENTS-TAB-V2.md#71-model-training-pipeline)
- [Mistral-7B Model](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2)
