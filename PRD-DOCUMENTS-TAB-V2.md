# Product Requirements Document: Documents Tab V2
## AI-Powered Document Intelligence Platform

**Version:** 2.0
**Date:** January 2025
**Status:** Draft
**Author:** [Your Name]

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Technical Architecture](#4-technical-architecture)
5. [Document Types Expansion](#5-document-types-expansion)
6. [Feature Specifications](#6-feature-specifications)
7. [AI/ML Implementation](#7-aiml-implementation)
8. [Database Schema Changes](#8-database-schema-changes)
9. [Implementation Phases](#9-implementation-phases)
10. [Open Questions](#10-open-questions)

---

## 1. Executive Summary

### Vision
Transform the Documents tab from a basic OCR tool into an intelligent document processing platform that achieves near-perfect accuracy in extraction, classification, and anomaly detection through a combination of fine-tuned models and RAG-enhanced validation.

### Core Objectives
1. **Perfect Extraction**: 99%+ accuracy on supported document types
2. **Smart Classification**: Automatic document type detection with confidence scoring
3. **Intelligent Flagging**: AI-powered anomaly detection beyond rule-based checks
4. **Data Categorization**: Automatic field type recognition (dates, amounts, IDs, etc.)
5. **Professional Output**: Industry-standard document handling workflows

### Key Technologies
| Component | Technology | Purpose |
|-----------|------------|---------|
| OCR | Mistral OCR (mistral-ocr-latest) | Text extraction from documents |
| Extraction LLM | Fine-tuned open-source model | Structured data extraction |
| Validation LLM | OpenAI GPT-4o | Complex reasoning, edge cases |
| Vector Database | pgvector (Supabase) | RAG for validation & context |
| Embeddings | OpenAI text-embedding-3-small | Document & field embeddings |

---

## 2. Current State Analysis

### What Exists Today

| Feature | Status | Quality |
|---------|--------|---------|
| OCR Processing | Working | Good (Mistral) |
| Document Types | 4 types | Limited (Invoice, Receipt, Contract, Other) |
| Confidence Scoring | Implemented | Not utilized |
| Flag Detection | Working | Basic (5 hardcoded rules) |
| Date Extraction | Working | Good (5 date types) |
| Approval Workflow | Working | Good |
| Audit Logging | Working | Excellent |

### Critical Gaps

1. **Limited Document Types**: Only 4 types vs. 30+ needed for comprehensive business coverage
2. **Rule-Based Flags Only**: No ML-powered anomaly detection
3. **Confidence Not Used**: Low-confidence extractions still accepted
4. **No Validation Layer**: Extracted data not validated against known patterns
5. **No Learning Loop**: System doesn't improve from corrections
6. **Single Provider**: Only Mistral, no fallback or specialized providers
7. **Basic Search**: No full-text or semantic search of document content

### Current Document Flow

```
Upload → OCR (Mistral) → Extraction (Mistral) → Flags (Rule-based) → Manual Review → Approve/Reject
```

### Target Document Flow

```
Upload → OCR → Classification (Fine-tuned) → Extraction (Fine-tuned)
       → Validation (RAG + LLM) → Smart Flags (ML) → Confidence Gate
       → Manual Review (if needed) → Approve → Learning Loop
```

---

## 3. Goals & Success Metrics

### Primary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| Extraction Accuracy | Correctly extract all fields from documents | 99%+ field accuracy on supported types |
| Classification Accuracy | Correctly identify document types | 98%+ type classification accuracy |
| Anomaly Detection | Catch data inconsistencies and errors | 95%+ anomaly recall, <5% false positive rate |
| Data Categorization | Recognize field types (date, amount, ID, etc.) | 99%+ field type classification |
| Processing Speed | Fast document processing | <10s for single-page, <30s for multi-page |
| Zero-Correction Reviews | Human reviews require no edits | 95%+ documents need zero corrections |

**Note on Human-in-the-Loop:** This platform prioritizes 100% human review. The goal is NOT to skip human review, but to make every review a simple confirmation where the AI got everything right. High accuracy reduces review time from minutes to seconds.

### Secondary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| User Corrections | Learn from manual edits | Model improvement from feedback loop |
| Search Quality | Find documents by content | Semantic search relevance >90% |
| Duplicate Detection | Identify duplicate/similar documents | 95%+ duplicate detection rate |
| Compliance | Industry-standard handling | SOC 2 ready data handling |

---

## 4. Technical Architecture

### 4.1 Why Fine-Tuning + RAG Together?

**Fine-Tuning Handles:**
- Document classification (what type is this?)
- Field extraction (where are the important values?)
- Field categorization (is this a date, amount, or ID?)
- Output format consistency (always returns valid JSON)

**RAG Handles:**
- Validation ("Is vendor ABC a known vendor in our database?")
- Enrichment ("What's the standard payment terms for this vendor?")
- Anomaly context ("Is $50,000 unusual for this type of invoice?")
- Historical comparison ("Does this match previous documents from this party?")

**Together They Achieve:**
- Fine-tuned model provides fast, consistent extraction
- RAG validates and enriches with organizational knowledge
- Reduces hallucinations (RAG grounds responses in real data)
- Handles edge cases (RAG provides context for unusual documents)

### 4.2 Multi-Tenancy: One Model, Many Businesses

**Critical Question:** "If I sell to different business types with different documents, do I need separate models for each?"

**Answer: NO.** Here's why:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED ACROSS ALL TENANTS                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FINE-TUNED EXTRACTION MODEL                │   │
│  │                                                         │   │
│  │  • Learns document STRUCTURE, not business-specific     │   │
│  │  • An invoice is an invoice (law firm OR restaurant)    │   │
│  │  • More diverse training = BETTER generalization        │   │
│  │  • One model to maintain, deploy, and improve           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SCOPED PER ORGANIZATION                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Org A      │  │   Org B      │  │   Org C      │          │
│  │   (Law Firm) │  │ (Restaurant) │  │   (Clinic)   │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ Their vendors│  │ Their vendors│  │ Their vendors│          │
│  │ Their docs   │  │ Their docs   │  │ Their docs   │          │
│  │ Their history│  │ Their history│  │ Their history│          │
│  │ Their rules  │  │ Their rules  │  │ Their rules  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  RAG queries ONLY return data from the user's organization      │
│  (Enforced by Supabase RLS on organization_id)                  │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Works:**

| Component | Shared or Scoped | Rationale |
|-----------|------------------|-----------|
| OCR Model | Shared | Text extraction is universal |
| Classification Model | Shared | Document types are standard across industries |
| Extraction Model | Shared | Field structures are consistent (invoice = invoice) |
| Vector Embeddings | **Org-Scoped** | Each org's historical data is private |
| Validation Rules | **Org-Scoped** | Different businesses have different thresholds |
| Entity Registry | **Org-Scoped** | Vendors, customers are per-organization |
| Flag Thresholds | **Org-Scoped** | $100k is normal for one business, unusual for another |

**Benefits of Shared Model:**
1. **Better accuracy**: Training on diverse documents improves generalization
2. **Lower cost**: One model vs. hundreds to host and maintain
3. **Faster improvements**: Fixes benefit all customers
4. **Simpler architecture**: No per-tenant model management

**How RAG Stays Private:**
```sql
-- All RAG queries include organization filter (RLS enforced)
SELECT * FROM document_embeddings
WHERE organization_id = auth.user_organization_id()
  AND embedding <=> query_embedding < 0.5;
```

### 4.3 Model Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOCUMENT INPUT                           │
│                   (PDF, Image, or Scan)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LAYER 1: OCR                                │
│              Mistral OCR (mistral-ocr-latest)                   │
│         Converts document to markdown/text                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 2: CLASSIFICATION                         │
│            Fine-tuned Model (e.g., Mistral-7B)                  │
│         Determines document type + confidence                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 3: EXTRACTION                            │
│            Fine-tuned Model (type-specific)                     │
│      Extracts structured fields with confidence scores          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 4: VALIDATION (RAG)                       │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Vector Store │    │  Historical  │    │   Business   │      │
│  │  (pgvector)  │◄───│   Documents  │    │    Rules     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                       │               │
│         └───────────────┬───────────────────────┘               │
│                         ▼                                       │
│              ┌──────────────────┐                               │
│              │   Validation LLM │                               │
│              │    (GPT-4o)      │                               │
│              └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                LAYER 5: SMART FLAGGING                          │
│           ML-based anomaly detection + rule engine              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│               LAYER 6: REVIEW PRIORITIZATION                    │
│              (All documents require human review)               │
│                                                                 │
│   High Confidence (>90%)  ──────► Quick Confirm Queue           │
│   Medium Confidence (70-90%) ───► Standard Review Queue         │
│   Low Confidence (<70%) ────────► Detailed Review Queue         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 7: LEARNING LOOP                          │
│     User corrections feed back to fine-tuning dataset           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Fine-Tuning Strategy

**Recommended Approach: Open-Source Base Model**

| Option | Model | Pros | Cons |
|--------|-------|------|------|
| **Recommended** | Mistral-7B-Instruct | Fast, good extraction, easy fine-tune | Requires hosting or API |
| Alternative | Llama-3-8B | Very capable, open weights | Larger, slower |
| Alternative | Phi-3-mini | Smallest, fastest | May lack accuracy |

**Fine-Tuning Data Requirements:**
- Minimum 500 labeled examples per document type
- Include edge cases and variations
- Cover all field types and formats
- Include negative examples (what NOT to extract)

**Pre-Training Strategy: Launch Strong, Then Improve**

You're right - starting weak makes it hard to sell. Here's how to launch with a strong model using public datasets and synthetic data, then continuously improve with customer corrections.

```
┌─────────────────────────────────────────────────────────────────┐
│           DATA SOURCES FOR INITIAL FINE-TUNING                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PUBLIC DATASETS (~25,000+ examples)                         │
│     ├── SROIE: 1,000 receipts (company, date, address, total)   │
│     ├── CORD: 1,000 receipts (30 hierarchical labels)           │
│     ├── FUNSD: 199 forms (headers, questions, answers)          │
│     ├── ReceiptSense (CORU): 20,000 multilingual receipts       │
│     ├── invoice-ocr-json: Synthetic invoices on HuggingFace     │
│     └── RVL-CDIP: 400,000 docs (16 classes, classification)     │
│                                                                 │
│  2. SYNTHETIC GENERATION (~10,000+ examples)                    │
│     ├── Template-based: HTML → PDF with Faker data              │
│     ├── LLM-augmented: GPT-4 generates realistic variations     │
│     └── Layout variations: Different fonts, colors, formats     │
│                                                                 │
│  3. CUSTOMER CORRECTIONS (ongoing)                              │
│     └── Every human review adds to training data                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Public Datasets for Pre-Training

**Receipts & Invoices:**

| Dataset | Size | Labels | Source |
|---------|------|--------|--------|
| SROIE | 1,000 | company, date, address, total | ICDAR 2019 Competition |
| CORD | 1,000 | 30 hierarchical labels | CLOVA AI (GitHub) |
| ReceiptSense (CORU) | 20,000 | merchant, items, prices, dates | HuggingFace |
| invoice-ocr-json | 1,000+ | invoice fields, line items | HuggingFace (GokulRajaR) |
| ocr-receipts-text-detection | 5,000+ | text detection | HuggingFace (UniqueData) |

**Forms & Documents:**

| Dataset | Size | Labels | Source |
|---------|------|--------|--------|
| FUNSD | 199 | headers, questions, answers | Form understanding |
| XFUND | 1,393 | Multilingual forms (7 languages) | Microsoft |
| DocVQA | 50,000 | Question-answering on documents | Document VQA |
| RVL-CDIP | 400,000 | 16 document classes | Classification |

**Contracts & Legal (Fewer public options):**

| Dataset | Size | Labels | Source |
|---------|------|--------|--------|
| Kleister NDA | 540 | NDA parties, dates, terms | Kleister Benchmark |
| CUAD | 510 | 41 contract clause types | Contract Understanding |

**Download Commands:**
```bash
# HuggingFace datasets
pip install datasets
python -c "from datasets import load_dataset; load_dataset('GokulRajaR/invoice-ocr-json')"
python -c "from datasets import load_dataset; load_dataset('abdoelsayed/CORU')"
python -c "from datasets import load_dataset; load_dataset('nielsr/funsd')"

# CORD dataset
git clone https://github.com/clovaai/cord.git

# SROIE dataset
# Download from: https://rrc.cvc.uab.es/?ch=13
```

### 4.5 Synthetic Document Generation

**Why Synthetic Data:**
- Real invoices contain sensitive PII (names, addresses, amounts)
- Public datasets lack diversity (limited vendors, formats)
- Synthetic data fills gaps in document types (contracts, W-2s, etc.)
- Can generate unlimited variations for edge cases

**Generation Pipeline:**

```
┌─────────────────────────────────────────────────────────────────┐
│                 SYNTHETIC DOCUMENT GENERATOR                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Template Library                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Invoice    │  │  Receipt    │  │  Contract   │  ... more   │
│  │  Templates  │  │  Templates  │  │  Templates  │             │
│  │  (10-20     │  │  (10-20     │  │  (5-10      │             │
│  │  variations)│  │  variations)│  │  variations)│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  Step 2: Fill with Faker Data                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Company names (Faker.company)                        │   │
│  │  • Addresses (Faker.address)                            │   │
│  │  • Amounts (random within realistic ranges)             │   │
│  │  • Dates (Faker.date_between)                           │   │
│  │  • Line items (product name + quantity + price)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  Step 3: Visual Variations                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Font changes (Arial, Times, Helvetica, etc.)         │   │
│  │  • Color variations (headers, backgrounds)              │   │
│  │  • Logo placement (top-left, top-right, centered)       │   │
│  │  • Layout shifts (spacing, margins)                     │   │
│  │  • Quality degradation (simulate scans)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
│         ▼                                                       │
│  Step 4: Export with Ground Truth                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Output: {                                              │   │
│  │    "image": "invoice_0001.pdf",                         │   │
│  │    "ocr_text": "Invoice #12345...",                     │   │
│  │    "ground_truth": {                                    │   │
│  │      "invoice_number": "12345",                         │   │
│  │      "vendor_name": "Acme Corp",                        │   │
│  │      "total": 1234.56,                                  │   │
│  │      ...                                                │   │
│  │    }                                                    │   │
│  │  }                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation with Python:**
```python
from faker import Faker
from jinja2 import Template
import pdfkit  # HTML to PDF
import json

fake = Faker()

def generate_invoice():
    """Generate a synthetic invoice with ground truth labels."""
    data = {
        "invoice_number": f"INV-{fake.random_number(digits=6)}",
        "invoice_date": fake.date_between(start_date='-1y', end_date='today').isoformat(),
        "due_date": fake.date_between(start_date='today', end_date='+60d').isoformat(),
        "vendor_name": fake.company(),
        "vendor_address": fake.address(),
        "customer_name": fake.company(),
        "customer_address": fake.address(),
        "line_items": [
            {
                "description": fake.bs(),
                "quantity": fake.random_int(1, 100),
                "unit_price": round(fake.random_number(digits=3) + fake.random.random(), 2),
            }
            for _ in range(fake.random_int(1, 10))
        ],
    }
    # Calculate totals
    data["subtotal"] = sum(item["quantity"] * item["unit_price"] for item in data["line_items"])
    data["tax"] = round(data["subtotal"] * 0.08, 2)
    data["total"] = round(data["subtotal"] + data["tax"], 2)

    # Render HTML template and convert to PDF
    html = render_invoice_template(data)
    pdf_path = f"synthetic/invoices/{data['invoice_number']}.pdf"
    pdfkit.from_string(html, pdf_path)

    return {"pdf": pdf_path, "ground_truth": data}
```

**LLM-Augmented Generation:**
```python
# Use GPT-4 to create realistic variations
prompt = """
Generate a realistic invoice for a {industry} company.
Include: company name, address, invoice number, date, line items, totals.
Make it look like a real business document.
Output as JSON with these fields: {field_list}
"""

# GPT-4 generates diverse, realistic content
# Then render into template for visual consistency
```

### 4.6 Training Data Strategy Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING DATA TIMELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BEFORE LAUNCH (Weeks 1-2)                                      │
│  ├── Download public datasets: SROIE, CORD, FUNSD, HuggingFace  │
│  ├── Generate 5,000+ synthetic documents                        │
│  ├── Convert all to unified training format                     │
│  └── Fine-tune initial model (expect 85-90% accuracy)           │
│                                                                 │
│  AT LAUNCH (Week 3)                                             │
│  ├── Deploy fine-tuned model                                    │
│  ├── Model is already GOOD (not weak!)                          │
│  └── Start collecting customer corrections                      │
│                                                                 │
│  MONTH 1-2                                                      │
│  ├── Collect 1,000+ real customer documents                     │
│  ├── Corrections become high-quality training data              │
│  └── Retrain model (expect 92-95% accuracy)                     │
│                                                                 │
│  MONTH 3+                                                       │
│  ├── Continuous improvement from corrections                    │
│  ├── Add new document types as data accumulates                 │
│  └── Target 98%+ accuracy on core document types                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Expected Accuracy Progression:**

| Phase | Data Sources | Expected Accuracy |
|-------|--------------|-------------------|
| Launch | Public + Synthetic (35,000+) | 85-90% |
| Month 1 | + 1,000 real corrections | 90-93% |
| Month 3 | + 5,000 real corrections | 93-96% |
| Month 6+ | + 20,000 real corrections | 97-99% |

**Key Insight:** You launch with a STRONG model (not weak), then it only gets better. Customers see good results from day one.

### 4.7 The Learning Flywheel (Self-Improving AI)

The system is designed to continuously improve itself through customer usage:

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE LEARNING FLYWHEEL                        │
│                                                                 │
│                      ┌──────────────┐                           │
│                      │  More Users  │                           │
│                      │  Upload Docs │                           │
│                      └──────┬───────┘                           │
│                             │                                   │
│                             ▼                                   │
│     ┌──────────────────────────────────────────────┐           │
│     │  AI Extracts Data (with current accuracy)    │           │
│     └──────────────────────┬───────────────────────┘           │
│                             │                                   │
│                             ▼                                   │
│     ┌──────────────────────────────────────────────┐           │
│     │  Human Reviews & Corrects Errors             │           │
│     │  (Every correction = training example)       │           │
│     └──────────────────────┬───────────────────────┘           │
│                             │                                   │
│                             ▼                                   │
│     ┌──────────────────────────────────────────────┐           │
│     │  Corrections Added to Training Dataset       │           │
│     └──────────────────────┬───────────────────────┘           │
│                             │                                   │
│                             ▼                                   │
│     ┌──────────────────────────────────────────────┐           │
│     │  Model Retrained (monthly or triggered)      │           │
│     └──────────────────────┬───────────────────────┘           │
│                             │                                   │
│                             ▼                                   │
│     ┌──────────────────────────────────────────────┐           │
│     │  AI Gets Smarter → Fewer Corrections Needed  │◄──────┐   │
│     └──────────────────────┬───────────────────────┘       │   │
│                             │                               │   │
│                             └───────────────────────────────┘   │
│                                   (Cycle Repeats)               │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Creates a Competitive Moat:**

| Benefit | Explanation |
|---------|-------------|
| **Network Effect** | More customers → more corrections → better model → attracts more customers |
| **Competitive Moat** | Competitors can't catch up without the same volume of real-world data |
| **Decreasing Cost** | As accuracy improves, humans spend less time correcting → lower support cost |
| **Compound Value** | Every customer's corrections benefit ALL customers (shared model) |

**Real-World Example:**
```
Month 1: Restaurant uploads invoice from "Sysco"
  → AI extracts vendor name
  → Human confirms (correct)
  → Model learns: "Sysco" = food distributor vendor

Month 2: Different restaurant uploads Sysco invoice
  → AI already knows Sysco → faster, more confident
  → No correction needed

Month 3: New restaurant signs up
  → AI already knows Sysco, US Foods, Gordon Food Service, etc.
  → New customer gets excellent experience immediately
```

**This is exactly how Google, Tesla, and Grammarly built dominant positions:**

| Company | Data Flywheel |
|---------|---------------|
| Google | More searches → better results → more searches |
| Tesla | More miles driven → better autopilot → more sales |
| Grammarly | More corrections → better suggestions → more users |
| **Hash** | More documents → better extraction → more customers |

### 4.8 RAG Implementation

**Vector Database: pgvector (Supabase)**

Reasons for pgvector over Pinecone:
- Already using Supabase (no additional service)
- Lower latency (same database)
- Lower cost (included in Supabase plan)
- Simpler architecture
- Good enough for document-scale data (<1M vectors)

**What Gets Embedded:**

| Content Type | Embedding Model | Purpose |
|--------------|-----------------|---------|
| Document text | text-embedding-3-small | Semantic search |
| Extracted fields | text-embedding-3-small | Field validation |
| Vendor/Party names | text-embedding-3-small | Entity matching |
| Historical patterns | Custom aggregates | Anomaly baseline |

**RAG Use Cases:**

1. **Entity Resolution**
   - "Is 'ABC Corp' the same as 'ABC Corporation'?"
   - Query similar vendor names from history
   - Return confidence on match

2. **Amount Validation**
   - "Is $150,000 unusual for invoices from Vendor X?"
   - Query historical invoice amounts
   - Flag statistical outliers

3. **Duplicate Detection**
   - "Have we seen this invoice number before?"
   - Semantic similarity to existing documents
   - Exact match on key fields

4. **Field Enrichment**
   - "What are typical payment terms for this vendor?"
   - Pull from historical data
   - Suggest auto-fill values

---

## 5. Document Types Expansion

### Tier 1: Core Business Documents (Implement First)

| Category | Document Type | Key Fields |
|----------|---------------|------------|
| **Financial** | Invoice | vendor, invoice_number, date, due_date, amount, line_items, tax, payment_terms |
| | Receipt | merchant, date, amount, payment_method, items, tax |
| | Purchase Order | po_number, vendor, date, items, total, shipping_address, billing_address |
| | Bank Statement | account_number, period, opening_balance, closing_balance, transactions |
| | Credit Card Statement | account_number, period, balance, minimum_payment, transactions |
| | Check | check_number, date, payee, amount, memo, account_number |
| **Legal** | Contract | parties, effective_date, expiration_date, value, terms, signatures |
| | Amendment | original_contract_ref, amendment_date, changes, parties |
| | NDA | parties, effective_date, term, scope, jurisdiction |
| | Terms of Service | effective_date, version, key_terms |
| **HR** | W-2 | employee_name, ssn_last4, employer, wages, taxes_withheld, year |
| | 1099 | recipient_name, payer, amount, type, year |
| | Pay Stub | employee, period, gross_pay, deductions, net_pay |
| | I-9 | employee_name, citizenship_status, document_numbers, dates |
| | Offer Letter | candidate_name, position, salary, start_date, benefits |
| **Insurance** | Policy Declaration | policy_number, insured, coverage_type, limits, premium, period |
| | Claim Form | claim_number, date_of_loss, description, amount_claimed |
| | Certificate of Insurance | holder, insurer, policy_number, coverage_types, limits, expiration |

### Tier 2: Industry-Specific Documents (Phase 2)

| Category | Document Type | Key Fields |
|----------|---------------|------------|
| **Healthcare** | EOB | patient, provider, service_date, billed_amount, allowed_amount, patient_responsibility |
| | Medical Bill | provider, patient, service_date, charges, diagnosis_codes, procedure_codes |
| | Prescription | patient, prescriber, medication, dosage, quantity, refills |
| **Real Estate** | Lease Agreement | landlord, tenant, property_address, term, rent, deposit |
| | Mortgage Statement | loan_number, property, principal, interest, escrow, balance |
| | Property Tax Bill | property_address, assessed_value, tax_amount, due_date |
| **Shipping** | Bill of Lading | shipper, consignee, carrier, origin, destination, items, weight |
| | Packing List | order_number, items, quantities, weights |
| | Customs Declaration | shipper, value, country_of_origin, hs_codes |

### Tier 3: Specialized Documents (Phase 3)

| Category | Document Type |
|----------|---------------|
| **Automotive** | Vehicle Title, Registration, Insurance Card |
| **Education** | Transcript, Diploma, Enrollment Verification |
| **Government** | Passport, Driver's License, Social Security Card |
| **Utilities** | Electric Bill, Water Bill, Gas Bill, Internet Bill |

### Document Type Detection Hierarchy

```
Document
├── Financial
│   ├── Transactional (Invoice, Receipt, PO, Check)
│   └── Statement (Bank, Credit Card)
├── Legal
│   ├── Binding (Contract, Amendment, NDA)
│   └── Informational (Terms of Service)
├── HR
│   ├── Tax (W-2, 1099)
│   ├── Payroll (Pay Stub)
│   └── Employment (Offer Letter, I-9)
├── Insurance
│   └── Policy, Claim, Certificate
└── Other (fallback with suggested type)
```

---

## 6. Feature Specifications

### 6.1 Intelligent Upload Experience

**Upload Modal Enhancements:**
- [ ] Drag-and-drop with document type preview
- [ ] Batch upload with progress per file
- [ ] Pre-upload document type prediction (quick classification)
- [ ] Duplicate detection before upload completes
- [ ] File format validation with clear error messages

**Processing Indicators:**
- [ ] Real-time status updates via Supabase Realtime
- [ ] Estimated time remaining based on document complexity
- [ ] Clear error messages with retry options
- [ ] Background notification when processing completes

### 6.2 Enhanced Extraction View

**Side-by-Side Comparison:**
- [ ] Document preview on left, extracted data on right
- [ ] Click field to highlight source in document
- [ ] Inline editing with validation
- [ ] Field-level confidence indicators (color-coded)
- [ ] Show/hide low-confidence fields

**Field Categorization Display:**
```
┌─────────────────────────────────────────────┐
│ INVOICE #: INV-2024-0042                    │
├─────────────────────────────────────────────┤
│ 📅 DATES                                    │
│   Invoice Date: Jan 15, 2024       [HIGH]   │
│   Due Date: Feb 14, 2024           [HIGH]   │
├─────────────────────────────────────────────┤
│ 💰 AMOUNTS                                  │
│   Subtotal: $1,234.56              [HIGH]   │
│   Tax: $98.76                      [MEDIUM] │
│   Total: $1,333.32                 [HIGH]   │
├─────────────────────────────────────────────┤
│ 🏢 PARTIES                                  │
│   Vendor: ABC Corporation          [HIGH]   │
│   Bill To: XYZ Company             [HIGH]   │
├─────────────────────────────────────────────┤
│ 📝 LINE ITEMS                               │
│   1. Widget A (qty: 10) - $500.00  [HIGH]   │
│   2. Widget B (qty: 5) - $734.56   [HIGH]   │
└─────────────────────────────────────────────┘
```

**Truncation Rules:**
- Field labels: max 30 characters, ellipsis
- Field values: max 100 characters for display, full on hover
- Amounts: formatted with commas, 2 decimal places
- Dates: consistent format (MMM DD, YYYY)
- Long text (notes, descriptions): 3 lines, "Show more" link

### 6.3 Smart Flagging System

**AI-Powered Flag Types:**

| Flag Type | Detection Method | Severity |
|-----------|------------------|----------|
| **duplicate_document** | Vector similarity >0.95 | Warning |
| **suspicious_amount** | Statistical outlier (>3σ from org mean) | Warning |
| **missing_required_field** | Type-specific required fields | Critical |
| **low_confidence_extraction** | Overall confidence <70% | Warning |
| **date_inconsistency** | Due date before invoice date, etc. | Error |
| **entity_mismatch** | Vendor not in known vendors list | Info |
| **format_violation** | Invalid phone, email, date format | Warning |
| **amount_mismatch** | Line items don't sum to total | Error |
| **past_due** | Due date has passed | Warning/Critical |
| **expiring_soon** | Contract expires within 30 days | Info |
| **unusual_vendor** | First-time vendor | Info |
| **large_transaction** | Amount exceeds org threshold | Warning |

**Flag Resolution Workflow:**
1. Flags displayed in priority order (Critical → Error → Warning → Info)
2. One-click resolution with reason selection
3. "Resolve All" for batch clearing
4. Require resolution before approval (configurable per flag type)
5. Flag history tracked in audit log

### 6.4 Confidence-Based Review Prioritization

**Philosophy:** All documents require human review. Confidence determines review ORDER and UI, not whether review happens.

**Confidence Thresholds (Configurable per Organization):**

| Confidence Level | Range | Queue | Review Experience |
|------------------|-------|-------|-------------------|
| High | 90-100% | Quick Confirm | One-click approve, all fields pre-filled correctly |
| Medium | 70-89% | Standard Review | Highlighted fields that need attention |
| Low | 50-69% | Detailed Review | Full form with side-by-side document comparison |
| Very Low | <50% | Manual Entry | Pre-filled suggestions, but expect manual edits |

**Why 100% Human Review:**
- Builds user trust in the system
- Catches the 1% of errors AI makes
- Training data from every review improves model
- Compliance-friendly (human accountable for every approval)
- Review becomes faster as AI improves (seconds vs minutes)

**Dashboard Widgets:**
- Confidence distribution chart
- Documents by queue
- Average processing accuracy (how often AI is right)
- Corrections rate (how often humans edit)
- Time-to-approval by confidence level

### 6.5 Learning Loop (Feedback System)

**Capture User Corrections:**
- Track every field edit with before/after values
- Log document type corrections
- Record flag resolution patterns
- Store confidence adjustments

**Training Data Generation:**
- Nightly job exports corrections as training examples
- Validate with quality thresholds
- Version training datasets
- A/B test model updates

**Feedback UI:**
- "Was this extraction correct?" thumbs up/down
- "Report an issue" for systematic problems
- Monthly accuracy report to admins

### 6.6 Semantic Search

**Search Capabilities:**
- Full-text search of extracted data
- Semantic search ("invoices about consulting services")
- Advanced filters (amount ranges, date ranges, vendors)
- Saved searches

**Search Implementation:**
```sql
-- Hybrid search: keyword + semantic
SELECT d.*,
       ts_rank(to_tsvector(d.raw_text), query) as keyword_score,
       1 - (d.embedding <=> query_embedding) as semantic_score,
       (0.5 * ts_rank(...) + 0.5 * (1 - ...)) as combined_score
FROM documents d, plainto_tsquery('english', 'consulting invoice') query
WHERE to_tsvector(d.raw_text) @@ query
   OR d.embedding <=> query_embedding < 0.5
ORDER BY combined_score DESC;
```

### 6.7 Document Templates

**Template System:**
- Define expected fields per document type
- Set required vs optional fields
- Configure validation rules
- Set up custom extraction prompts

**Template Editor (Admin):**
- Drag-and-drop field ordering
- Field type selection (text, date, amount, etc.)
- Validation rule builder
- Test with sample documents

### 6.8 Document Versioning & Comparison

**Problem:** Customers sometimes upload corrected versions of documents, or need to track changes over time.

**Solution:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT VERSION HISTORY                     │
├─────────────────────────────────────────────────────────────────┤
│  Invoice INV-2024-001                                           │
│                                                                 │
│  v3 (Current) ─── Jan 15, 2024 ─── Approved by John            │
│       │           Total: $1,234.56                              │
│       │           Vendor: ABC Corp                              │
│       │                                                         │
│  v2 ──┴────────── Jan 14, 2024 ─── Re-uploaded                 │
│       │           Total: $1,234.56 (was $1,234.65)  ← Changed   │
│       │           Vendor: ABC Corp                              │
│       │                                                         │
│  v1 ──┴────────── Jan 13, 2024 ─── Initial upload              │
│                   Total: $1,234.65                              │
│                   Vendor: ABC Corp                              │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] Track document re-uploads (same invoice number = new version)
- [ ] Visual diff between versions (highlight changed fields)
- [ ] Preserve full audit trail across versions
- [ ] Analytics: which documents get re-uploaded most (indicates extraction problems)
- [ ] Option to revert to previous version

### 6.9 Uncertain Field Highlighting

**Problem:** All fields shown equally, humans waste time reviewing confident extractions.

**Solution:** Visually guide human eyes to fields that need attention.

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTRACTED DATA VIEW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Invoice #: INV-2024-0042              ✓ High Confidence        │
│  ─────────────────────────────────────────────────────────────  │
│  Vendor: Acme Corporation              ✓ High Confidence        │
│  ─────────────────────────────────────────────────────────────  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Total: $1,234.56                     ⚠️ Medium - Check This │ │ ← Yellow
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Due Date: [empty]                    ❌ Missing - Required  │ │ ← Red
│ └─────────────────────────────────────────────────────────────┘ │
│  Payment Terms: Net 30                 ✓ High Confidence        │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Approve All ✓]  [Review Flagged Only]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Hierarchy:**
| Confidence | Color | Icon | Behavior |
|------------|-------|------|----------|
| High (90%+) | Gray/Default | ✓ | Collapsed by default |
| Medium (70-89%) | Yellow highlight | ⚠️ | Expanded, soft highlight |
| Low (50-69%) | Orange highlight | ⚠️ | Expanded, strong highlight |
| Missing/Required | Red highlight | ❌ | Expanded, must fill |

**UX Benefit:** Human eye goes directly to problems → 5-second reviews for clean documents.

### 6.10 Smart Suggestions for Empty Fields

**Problem:** Empty fields require manual research (e.g., "What are the payment terms?").

**Solution:** AI suggests values based on context and history.

```
┌─────────────────────────────────────────────────────────────────┐
│  Payment Terms: [empty]                                         │
│                                                                 │
│  💡 Suggested: "Net 30"                                         │
│     Based on: 85% of invoices from this vendor use Net 30       │
│                                                                 │
│     [Accept Suggestion]  [Enter Different Value]                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Due Date: [empty]                                              │
│                                                                 │
│  💡 Suggested: "Feb 14, 2024"                                   │
│     Based on: Invoice date (Jan 15) + Payment terms (Net 30)    │
│                                                                 │
│     [Accept Suggestion]  [Enter Different Value]                │
└─────────────────────────────────────────────────────────────────┘
```

**Suggestion Sources:**
| Field | Suggestion Logic |
|-------|------------------|
| Payment Terms | Most common for this vendor (from RAG) |
| Due Date | Invoice date + payment terms |
| Tax Rate | Based on vendor's state |
| Vendor Address | From known vendor registry |
| Currency | Based on vendor country |

### 6.11 Batch Processing Mode

**Problem:** Uploading documents one at a time is slow for high-volume users.

**Solution:** Drag-drop 50+ PDFs, process all in background, review in queue.

```
┌─────────────────────────────────────────────────────────────────┐
│                    BATCH UPLOAD                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│     ┌─────────────────────────────────────────────┐             │
│     │                                             │             │
│     │   📁 Drop files here or click to browse     │             │
│     │                                             │             │
│     │   Supports: PDF, PNG, JPG (up to 100 files) │             │
│     │                                             │             │
│     └─────────────────────────────────────────────┘             │
│                                                                 │
│  Uploading: 47 of 50 files                                      │
│  ████████████████████████████████░░░░░░░░ 94%                   │
│                                                                 │
│  Processing Status:                                             │
│  ├── ✓ Completed: 35                                            │
│  ├── ⏳ Processing: 12                                           │
│  ├── ⚠️ Needs Review: 2                                          │
│  └── ❌ Failed: 1                                                │
│                                                                 │
│  [View Review Queue]  [Cancel Remaining]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] Multi-file drag-and-drop (up to 100 files)
- [ ] Background processing with progress indicators
- [ ] Notification when batch completes
- [ ] Review queue sorted by confidence (low first)
- [ ] Bulk actions: approve all high-confidence, reject batch

### 6.12 Keyboard Shortcuts for Power Users

**Problem:** Mouse-clicking through reviews is slow for high-volume users.

**Goal:** Power users can review documents in 3-5 seconds using only keyboard.

**Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Tab` | Next field |
| `Shift+Tab` | Previous field |
| `Enter` | Approve current field |
| `Shift+Enter` | Approve all fields & go to next document |
| `Escape` | Flag current document for later |
| `Ctrl+S` | Save changes |
| `?` | Show keyboard shortcuts help |
| `1-9` | Quick select document type |
| `Ctrl+F` | Search within document |
| `←` / `→` | Previous / Next document in queue |

**Review Flow with Keyboard:**
```
Document loads → Tab through fields → Enter to confirm each
→ Shift+Enter to approve all and move to next document
→ Repeat (3-5 seconds per document for high-confidence)
```

### 6.13 Similar Documents Feature

**Problem:** Hard to spot anomalies without historical context.

**Solution:** Show related documents from the same vendor/type using vector similarity.

```
┌─────────────────────────────────────────────────────────────────┐
│  Currently Reviewing: Invoice from Acme Corp - $50,000          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 SIMILAR DOCUMENTS (3 found)                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Invoice from Acme Corp - Dec 2023                       │   │
│  │ Total: $5,200      ← Current is 10x higher! ⚠️           │   │
│  │ [View Document]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Invoice from Acme Corp - Nov 2023                       │   │
│  │ Total: $4,800                                           │   │
│  │ [View Document]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ Alert: Current invoice ($50,000) is significantly higher   │
│     than historical average ($5,000). Please verify.            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```sql
-- Find similar documents using vector similarity
SELECT d.*,
       1 - (d.embedding <=> current_doc_embedding) as similarity
FROM documents d
WHERE d.organization_id = current_org_id
  AND d.id != current_doc_id
  AND d.document_type = current_doc_type
ORDER BY d.embedding <=> current_doc_embedding
LIMIT 5;
```

### 6.14 "Explain This Extraction" Button

**Problem:** Users don't trust AI when they can't understand why it made a decision.

**Solution:** On-demand explanation for any extracted field.

```
┌─────────────────────────────────────────────────────────────────┐
│  Vendor: ABC Corporation                    [? Explain]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🤖 Why I extracted "ABC Corporation":                          │
│                                                                 │
│  1. Location: Found in document header (top-left area)          │
│     "ABC Corporation" appears at position (50, 120)             │
│                                                                 │
│  2. Pattern: Matches typical vendor name placement              │
│     Headers usually contain sender/vendor information           │
│                                                                 │
│  3. Historical match: You've processed 12 documents from        │
│     "ABC Corporation" before with 100% accuracy                 │
│                                                                 │
│  4. Confidence: 96%                                             │
│     - Text clarity: High                                        │
│     - Position certainty: High                                  │
│     - Historical validation: Matched                            │
│                                                                 │
│  [Got it]  [This is wrong - correct it]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Builds user trust in the AI
- Helps debug systematic extraction issues
- Educates users on how the system works
- Provides context for corrections

### 6.15 Retry Queue with Dead Letter

**Problem:** Failed documents just fail silently, requiring manual intervention.

**Solution:** Automatic retry with escalation and visibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING QUEUE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Queue Status:                                               │
│  ├── Pending: 12                                                │
│  ├── Processing: 3                                              │
│  ├── Completed (last hour): 156                                 │
│  ├── Retrying: 2                                                │
│  └── Failed (Dead Letter): 1                                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ❌ DEAD LETTER QUEUE (1 document)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ invoice_scan_003.pdf                                    │   │
│  │ Failed after 3 attempts                                 │   │
│  │ Last error: "OCR timeout after 30s"                     │   │
│  │ Attempts: Jan 15 10:01, 10:05, 10:15                    │   │
│  │                                                         │   │
│  │ [Retry Now] [Use Fallback OCR] [Mark for Manual Entry]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Retry Logic:**
```
Attempt 1: Process with primary OCR (Mistral)
    ↓ (if fails, wait 30s)
Attempt 2: Retry primary OCR
    ↓ (if fails, wait 60s)
Attempt 3: Retry primary OCR
    ↓ (if fails)
Move to Dead Letter Queue → Alert admin → Offer fallback options
```

**Fallback Options:**
| Option | When to Use |
|--------|-------------|
| Retry with same provider | Temporary network issue |
| Use fallback OCR (Google/Amazon) | Primary provider struggling with format |
| Manual entry mode | Document is too damaged/unusual |
| Skip document | User decides it's not important |

### 6.16 Confidence Calibration Monitoring

**Problem:** Model says "95% confident" but is wrong 20% of the time.

**Solution:** Track predicted vs actual accuracy, alert when miscalibrated.

```
┌─────────────────────────────────────────────────────────────────┐
│                CONFIDENCE CALIBRATION DASHBOARD                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Calibration Chart (Last 30 Days)                            │
│                                                                 │
│  Predicted    │ Actual Accuracy │ Status                        │
│  Confidence   │                 │                               │
│  ─────────────┼─────────────────┼─────────────────────────────  │
│  90-100%      │ 94.2%           │ ✓ Well calibrated             │
│  80-89%       │ 81.5%           │ ✓ Well calibrated             │
│  70-79%       │ 68.3%           │ ⚠️ Slightly overconfident      │
│  60-69%       │ 52.1%           │ ❌ Overconfident - needs fix   │
│  50-59%       │ 48.7%           │ ✓ Well calibrated             │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚠️ ALERT: 60-69% confidence band is overconfident              │
│     Recommendation: Lower threshold for "Medium" queue          │
│     from 70% to 75% to catch more errors.                       │
│                                                                 │
│  [Apply Recommendation] [Dismiss] [View Details]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Automatic Actions:**
- Weekly calibration check
- Alert admin when any band is >10% miscalibrated
- Suggest threshold adjustments
- Track calibration over time (is it improving?)

### 6.17 Data Quality Dashboard

**Problem:** Admins can't see how well the AI is performing or where to focus improvements.

**Solution:** Comprehensive dashboard with actionable insights.

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATA QUALITY DASHBOARD                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 ACCURACY BY DOCUMENT TYPE (Last 30 Days)                    │
│  ─────────────────────────────────────────────────────────────  │
│  Invoices:    ████████████████████████████░░ 94%  (1,234 docs)  │
│  Receipts:    ██████████████████████████░░░░ 89%  (567 docs)    │
│  Contracts:   ████████████████████░░░░░░░░░░ 78%  (89 docs)     │
│  W-2s:        ████████████████████████████░░ 92%  (45 docs)     │
│                                                                 │
│  📊 MOST COMMON CORRECTIONS                                     │
│  ─────────────────────────────────────────────────────────────  │
│  1. vendor_name:     12% correction rate  ← Focus here          │
│  2. line_items:      8% correction rate                         │
│  3. total_amount:    5% correction rate                         │
│  4. due_date:        3% correction rate                         │
│                                                                 │
│  📊 PROCESSING METRICS                                          │
│  ─────────────────────────────────────────────────────────────  │
│  Avg processing time:     4.2 seconds                           │
│  Avg review time:         12 seconds (down from 45s last month) │
│  Documents today:         156                                   │
│  Auto-detected duplicates: 3                                    │
│  Flags raised:            12 (8 resolved)                       │
│                                                                 │
│  📊 TREND: Accuracy improving 2.3% per month 📈                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Metrics Tracked:**
| Metric | Purpose |
|--------|---------|
| Accuracy by doc type | Identify weak areas |
| Correction rate by field | Focus training data collection |
| Processing time | Performance monitoring |
| Review time | UX effectiveness |
| Duplicate detection rate | Data quality |
| Flag resolution rate | Workflow effectiveness |

### 6.18 PII Redaction & Data Security

**Problem:** Sensitive data (SSN, bank accounts) needs special handling.

**Solution:** Configurable PII detection and redaction.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PII SETTINGS (Organization)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔒 PII FIELD HANDLING                                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Social Security Number:                                        │
│    ☑ Detect automatically                                      │
│    ☑ Mask in UI (show as: ***-**-1234)                         │
│    ☑ Encrypt at rest                                           │
│    ☐ Allow export (requires admin approval)                    │
│                                                                 │
│  Bank Account Numbers:                                          │
│    ☑ Detect automatically                                      │
│    ☑ Mask in UI (show as: ****4567)                            │
│    ☑ Encrypt at rest                                           │
│    ☐ Allow export                                              │
│                                                                 │
│  Credit Card Numbers:                                           │
│    ☑ Detect automatically                                      │
│    ☑ Mask in UI                                                │
│    ☑ Encrypt at rest                                           │
│    ☐ Store (reject documents with CC numbers)                  │
│                                                                 │
│  📋 PII ACCESS LOG                                              │
│  ─────────────────────────────────────────────────────────────  │
│  Jan 15, 10:30 - John viewed SSN field on DOC-1234              │
│  Jan 15, 09:15 - Admin exported bank account for DOC-0987       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**PII Detection Rules:**
| Pattern | Field Type | Default Action |
|---------|------------|----------------|
| `\d{3}-\d{2}-\d{4}` | SSN | Mask + Encrypt |
| `\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}` | Credit Card | Reject |
| `\d{9,17}` (in bank context) | Bank Account | Mask + Encrypt |
| Email addresses | PII | No special handling |
| Phone numbers | PII | No special handling |

### 6.19 Document Retention Policies

**Problem:** Documents accumulate forever, creating storage costs and compliance risks.

**Solution:** Configurable retention policies per organization.

```
┌─────────────────────────────────────────────────────────────────┐
│                  RETENTION POLICY SETTINGS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 DEFAULT RETENTION RULES                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Approved Documents:                                            │
│    Keep for: [7 years ▼]  then: [Archive to cold storage ▼]     │
│                                                                 │
│  Rejected Documents:                                            │
│    Keep for: [30 days ▼]  then: [Permanently delete ▼]          │
│                                                                 │
│  Failed Documents:                                              │
│    Keep for: [7 days ▼]   then: [Permanently delete ▼]          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📁 RETENTION BY DOCUMENT TYPE                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Tax Documents (W-2, 1099):                                     │
│    Keep for: [7 years ▼]  (IRS requirement)                     │
│                                                                 │
│  Contracts:                                                     │
│    Keep for: [10 years ▼] (or until expiration + 3 years)       │
│                                                                 │
│  Invoices/Receipts:                                             │
│    Keep for: [7 years ▼]                                        │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚠️ 23 documents scheduled for deletion in next 30 days         │
│  [Review Before Deletion]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Retention Actions:**
| Action | Description |
|--------|-------------|
| Keep | Normal storage, full access |
| Archive | Move to cold storage, slower retrieval, lower cost |
| Delete | Permanent removal (with 30-day grace period) |
| Legal Hold | Prevent deletion regardless of policy (for litigation) |

---

## 7. AI/ML Implementation

### 7.1 Model Training Pipeline

**Step 1: Data Collection**
```
Current documents (labeled) ─────┐
                                 ├──► Training Dataset
User corrections (high quality) ─┘
```

**Step 2: Data Preparation**
```python
# Training example format
{
    "instruction": "Extract structured data from this invoice.",
    "input": "[OCR TEXT FROM DOCUMENT]",
    "output": {
        "document_type": "invoice",
        "confidence": 0.95,
        "fields": {
            "invoice_number": {"value": "INV-001", "confidence": 0.98},
            "vendor_name": {"value": "ABC Corp", "confidence": 0.92},
            ...
        }
    }
}
```

**Step 3: Fine-Tuning**
- Base model: Mistral-7B-Instruct-v0.2
- Method: QLoRA (4-bit quantization + LoRA)
- Training: 3 epochs, learning rate 2e-4
- Validation: 10% holdout set

**Step 4: Evaluation**
| Metric | Target |
|--------|--------|
| Field extraction accuracy | >95% |
| Document classification accuracy | >98% |
| Confidence calibration error | <5% |

**Step 5: Deployment**
- Host on Together.ai or Replicate
- Canary deployment (10% traffic)
- A/B test against current model
- Rollout if metrics improve

### 7.2 RAG Knowledge Base

**Vector Collections:**

```sql
-- Document embeddings (for semantic search)
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES documents(id),
    chunk_index INTEGER,
    content TEXT,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity embeddings (for validation)
CREATE TABLE entity_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT, -- 'vendor', 'customer', 'product'
    entity_name TEXT,
    normalized_name TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON entity_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Embedding Generation:**
```typescript
// Embed on document approval
async function embedDocument(documentId: string) {
    const doc = await getDocument(documentId);

    // Chunk the raw text
    const chunks = chunkText(doc.raw_text, 500);

    // Generate embeddings
    const embeddings = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks
    });

    // Store in pgvector
    await storeEmbeddings(documentId, chunks, embeddings);
}
```

### 7.3 Validation Pipeline

**Validation Checks:**

1. **Format Validation** (Rule-based)
   - Email format: regex match
   - Phone format: regex match
   - Date format: parse check
   - Amount format: numeric check

2. **Entity Validation** (RAG)
   - Vendor name → query similar vendors → match or flag
   - Customer name → query customer database → link or flag
   - Product name → query product catalog → match or flag

3. **Amount Validation** (Statistical + RAG)
   - Query historical amounts for same vendor/type
   - Calculate z-score
   - Flag if >3 standard deviations

4. **Cross-Field Validation** (LLM)
   - Line items sum equals total
   - Due date after invoice date
   - Effective date before expiration date

**Validation Response:**
```json
{
    "is_valid": true,
    "validations": [
        {"field": "vendor_name", "status": "matched", "matched_entity": "ABC Corporation"},
        {"field": "total_amount", "status": "normal", "z_score": 0.5},
        {"field": "due_date", "status": "valid", "days_until_due": 30}
    ],
    "flags": [],
    "suggestions": [
        {"field": "payment_terms", "suggested_value": "Net 30", "source": "historical"}
    ]
}
```

### 7.4 Confidence Scoring

**Field-Level Confidence:**
- OCR confidence (from Mistral)
- Extraction confidence (from fine-tuned model)
- Validation confidence (from RAG matching)
- Combined: weighted average or minimum

**Document-Level Confidence:**
```
Document Confidence = min(
    Classification Confidence,
    Average Field Confidence,
    Validation Pass Rate
)
```

**Confidence Calibration:**
- Track predicted confidence vs actual accuracy
- Adjust thresholds based on historical data
- Alert when confidence is miscalibrated

---

## 8. Database Schema Changes

### New Tables

```sql
-- Document type templates
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL, -- 'financial', 'legal', 'hr', 'insurance', 'other'
    fields JSONB NOT NULL, -- field definitions with types, validation
    required_fields TEXT[], -- list of required field slugs
    is_system BOOLEAN DEFAULT FALSE, -- true for built-in templates
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Document embeddings for semantic search
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity registry for validation
CREATE TABLE known_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    entity_type TEXT NOT NULL, -- 'vendor', 'customer', 'product', 'account'
    entity_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    aliases TEXT[],
    metadata JSONB,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document processing queue
CREATE TABLE document_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 0,
    processor TEXT, -- 'ocr', 'extraction', 'validation', 'embedding'
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field corrections for training data
CREATE TABLE field_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    original_value JSONB,
    corrected_value JSONB,
    correction_type TEXT, -- 'fix', 'add', 'remove'
    corrected_by UUID REFERENCES users(id),
    used_for_training BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation rules per organization
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    name TEXT NOT NULL,
    description TEXT,
    rule_type TEXT NOT NULL, -- 'format', 'range', 'comparison', 'custom'
    document_types TEXT[], -- which types this applies to
    field_name TEXT, -- null means document-level
    rule_config JSONB NOT NULL, -- rule-specific configuration
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing metrics for monitoring
CREATE TABLE processing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    ocr_duration_ms INTEGER,
    extraction_duration_ms INTEGER,
    validation_duration_ms INTEGER,
    embedding_duration_ms INTEGER,
    total_duration_ms INTEGER,
    model_version TEXT,
    classification_confidence NUMERIC(4,3),
    extraction_confidence NUMERIC(4,3),
    validation_pass_rate NUMERIC(4,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Schema Modifications

```sql
-- Add to documents table
ALTER TABLE documents
ADD COLUMN template_id UUID REFERENCES document_templates(id),
ADD COLUMN classification_confidence NUMERIC(4,3),
ADD COLUMN extraction_confidence NUMERIC(4,3),
ADD COLUMN validation_status TEXT DEFAULT 'pending', -- 'pending', 'passed', 'failed'
ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN model_version TEXT;

-- Add to document_flags table
ALTER TABLE document_flags
ADD COLUMN detection_method TEXT DEFAULT 'rule', -- 'rule', 'ml', 'validation'
ADD COLUMN model_confidence NUMERIC(4,3),
ADD COLUMN requires_resolution BOOLEAN DEFAULT FALSE;
```

### Indexes

```sql
-- Vector similarity search
CREATE INDEX document_embeddings_embedding_idx
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX known_entities_embedding_idx
ON known_entities USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Queue processing
CREATE INDEX document_queue_status_priority_idx
ON document_queue(status, priority DESC, created_at);

-- Correction tracking
CREATE INDEX field_corrections_document_idx
ON field_corrections(document_id);

CREATE INDEX field_corrections_training_idx
ON field_corrections(used_for_training) WHERE NOT used_for_training;
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Goals:** Improve current system, add document types, fix gaps

| Task | Priority | Complexity |
|------|----------|------------|
| Add 10 new document types (Tier 1 financial + legal) | High | Medium |
| Implement field truncation across all views | High | Low |
| Add confidence threshold routing (auto/quick/full review queues) | High | Medium |
| Implement document processing queue (replace fire-and-forget) | High | High |
| Add field categorization display (dates, amounts, parties, etc.) | Medium | Low |
| Improve flag system with configurable thresholds | Medium | Medium |

**Deliverables:**
- [ ] 14 document types (up from 4)
- [ ] Confidence-based review routing
- [ ] Reliable processing with queue
- [ ] Clean, truncated field display

### Phase 2: Vector Search & RAG (Weeks 4-6)

**Goals:** Enable semantic search and validation

| Task | Priority | Complexity |
|------|----------|------------|
| Set up pgvector in Supabase | High | Low |
| Implement document embedding on approval | High | Medium |
| Build entity registry (known vendors, customers) | High | Medium |
| Implement semantic search | Medium | Medium |
| Add entity validation (vendor matching) | Medium | Medium |
| Add duplicate detection via similarity | Medium | Medium |

**Deliverables:**
- [ ] Semantic document search
- [ ] Vendor/entity validation
- [ ] Duplicate detection
- [ ] Entity management UI

### Phase 3: Fine-Tuned Models (Weeks 7-10)

**Goals:** Deploy custom extraction models

| Task | Priority | Complexity |
|------|----------|------------|
| Build training data pipeline from corrections | High | High |
| Fine-tune classification model | High | High |
| Fine-tune extraction model | High | High |
| Deploy via inference API (Together/Replicate) | High | Medium |
| Implement A/B testing framework | Medium | Medium |
| Add model versioning and rollback | Medium | Medium |

**Deliverables:**
- [ ] Fine-tuned classification model (98%+ accuracy)
- [ ] Fine-tuned extraction model (95%+ accuracy)
- [ ] Production deployment with monitoring
- [ ] Automated retraining pipeline

### Phase 4: Smart Automation (Weeks 11-14)

**Goals:** ML-powered features

| Task | Priority | Complexity |
|------|----------|------------|
| ML-based anomaly detection | High | High |
| Statistical amount flagging | Medium | Medium |
| Cross-field validation | Medium | Medium |
| Auto-approval for high-confidence docs | Medium | Medium |
| Learning loop (corrections → training) | High | High |
| Accuracy dashboard and monitoring | Medium | Medium |

**Deliverables:**
- [ ] AI-powered flagging
- [ ] Auto-approval workflow
- [ ] Continuous learning pipeline
- [ ] Accuracy monitoring dashboard

### Phase 5: Polish & Scale (Weeks 15-16)

**Goals:** Production hardening

| Task | Priority | Complexity |
|------|----------|------------|
| Add Tier 2 document types | Medium | Medium |
| Performance optimization | High | Medium |
| Error handling improvements | High | Low |
| Admin controls for AI features | Medium | Medium |
| Documentation and training | Medium | Low |

**Deliverables:**
- [ ] 25+ document types
- [ ] Sub-10s processing for single pages
- [ ] Admin configuration panel
- [ ] User documentation

---

## 10. Decisions Made & Open Questions

### Decisions Made (Based on Your Input)

| Question | Your Answer | Decision |
|----------|-------------|----------|
| Document Volume | Unknown (selling to many businesses) | Start with pgvector, scale to Pinecone if needed |
| Target Industries | All industries (no specific focus) | Prioritize universally common document types first |
| Training Data | Starting from scratch | Use bootstrapping strategy (customers = labelers) |
| Budget | ~$110/month is acceptable | Use Together.ai for hosting, pgvector for embeddings |
| Human Review | 100% human review required | Focus on accuracy to make reviews take seconds |
| Multi-Tenancy | Many different businesses | ONE shared model, org-scoped RAG data |

### Remaining Technical Decisions

1. **Model Hosting Provider**: Together.ai vs Replicate vs RunPod?
   - **Recommendation**: Start with Together.ai (simplest, pay-per-token)
   - Migrate to RunPod later if volume justifies self-hosting

2. **Fine-Tuning Frequency**: How often to retrain?
   - **Recommendation**: Monthly initially, then triggered when accuracy drops below 95%

3. **OpenAI Usage**: When to use GPT-4o vs fine-tuned?
   - **Recommendation**: GPT-4o for validation only (RAG queries), fine-tuned for extraction

4. **Confidence Thresholds**: What are the right defaults?
   - **Recommendation**: Start conservative (90% = high), adjust based on data
   - Make org-configurable in settings

### Future Considerations

5. **Compliance Requirements**: Will you need SOC 2, HIPAA, etc.?
   - If yes: Need to evaluate model provider data handling policies
   - Together.ai and OpenAI both offer enterprise compliance

6. **Industry-Specific Models**: Should you ever specialize?
   - **Recommendation**: NO for now. One model with diverse training is better.
   - Revisit only if specific industry has very unusual documents

---

## Appendix A: Cost Estimates

### Monthly Costs (Estimated for 5,000 docs/month)

| Service | Usage | Cost |
|---------|-------|------|
| Mistral OCR | 5,000 docs | ~$50 |
| Fine-tuned Model (Together.ai) | 5,000 extractions | ~$25 |
| OpenAI GPT-4o (validation) | 1,000 calls | ~$30 |
| OpenAI Embeddings | 50,000 chunks | ~$5 |
| pgvector (Supabase) | Included | $0 |
| **Total** | | **~$110/month** |

### One-Time Costs

| Item | Cost |
|------|------|
| Fine-tuning (initial) | ~$50-100 |
| Training data labeling (if outsourced) | ~$500-2,000 |
| Development time | [Internal] |

---

## Appendix B: Competitive Analysis

### Document Processing Platforms

| Platform | Strengths | Weaknesses | Pricing |
|----------|-----------|------------|---------|
| **Docsumo** | Good UI, 50+ doc types | Limited customization | $0.10/page |
| **Rossum** | Excellent accuracy | Expensive, enterprise focus | Custom |
| **Nanonets** | Easy fine-tuning | Fewer doc types | $0.05/page |
| **Amazon Textract** | AWS integration | No fine-tuning | $0.015/page |
| **Google Document AI** | Many specialized processors | Complex setup | $0.01-0.10/page |

### Key Differentiators for Hash

1. **Integrated Platform**: Documents tied to People, Appointments, Tasks
2. **Learning Loop**: Improves from your corrections
3. **Flexible Classification**: Add custom document types
4. **Supabase-Native**: Real-time, multi-tenant, no extra infra

---

## Appendix C: Document Type Field Specifications

### Invoice Fields

```typescript
interface InvoiceFields {
  // Required
  invoice_number: string;
  invoice_date: Date;
  vendor_name: string;
  total_amount: number;

  // Common
  due_date?: Date;
  payment_terms?: string; // "Net 30", "Due on Receipt"
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  discount_amount?: number;
  shipping_amount?: number;
  currency?: string;

  // Addresses
  vendor_address?: Address;
  billing_address?: Address;
  shipping_address?: Address;

  // Line Items
  line_items?: LineItem[];

  // Payment
  payment_method?: string;
  bank_details?: BankDetails;

  // Reference
  po_number?: string;
  account_number?: string;
  notes?: string;
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  sku?: string;
  tax_rate?: number;
}

interface Address {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}
```

### W-2 Fields

```typescript
interface W2Fields {
  // Employee Info
  employee_name: string;
  employee_ssn_last4: string; // Only store last 4
  employee_address: Address;

  // Employer Info
  employer_name: string;
  employer_ein: string;
  employer_address: Address;

  // Wages
  wages_tips_compensation: number; // Box 1
  federal_income_tax_withheld: number; // Box 2
  social_security_wages: number; // Box 3
  social_security_tax_withheld: number; // Box 4
  medicare_wages: number; // Box 5
  medicare_tax_withheld: number; // Box 6

  // Other
  tax_year: number;
  state?: string;
  state_wages?: number;
  state_income_tax?: number;
}
```

*[Additional field specifications for other document types would follow the same pattern]*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2025 | [Author] | Initial draft |

---

**End of PRD**
