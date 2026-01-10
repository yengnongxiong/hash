#!/usr/bin/env python3
"""
Synthetic Document Generator for Training Data

Generates synthetic documents (invoices, receipts, contracts, W-2s) with
ground truth labels for fine-tuning document extraction models.

Based on PRD Section 4.5: Synthetic Document Generation

Usage:
    pip install faker jinja2 weasyprint pillow
    python synthetic_generator.py --type invoice --count 100
    python synthetic_generator.py --all --count 500

Features:
- Template-based HTML → PDF generation
- Faker data for realistic content
- Visual variations (fonts, colors, layouts)
- Ground truth JSON export for training
"""

import argparse
import json
import random
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

# Check and install dependencies
try:
    from faker import Faker
    from jinja2 import Environment, FileSystemLoader
except ImportError:
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faker", "jinja2"])
    from faker import Faker
    from jinja2 import Environment, FileSystemLoader

# Try to import weasyprint for PDF generation (optional)
WEASYPRINT_AVAILABLE = False
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    print("Note: weasyprint not installed. HTML files will be generated instead of PDFs.")
    print("To generate PDFs, install weasyprint: pip install weasyprint")

BASE_DIR = Path(__file__).parent
SYNTHETIC_DIR = BASE_DIR / "synthetic"
TEMPLATES_DIR = BASE_DIR / "templates"

# Initialize Faker with multiple locales for diversity
fake = Faker(["en_US", "en_GB", "en_CA", "en_AU"])

# Visual variation options
FONTS = [
    "Arial, sans-serif",
    "Helvetica, sans-serif",
    "Times New Roman, serif",
    "Georgia, serif",
    "Verdana, sans-serif",
    "Courier New, monospace",
]

HEADER_COLORS = [
    "#1a365d",  # Navy
    "#2d3748",  # Dark gray
    "#1a202c",  # Charcoal
    "#742a2a",  # Dark red
    "#22543d",  # Forest green
    "#2c5282",  # Blue
    "#553c9a",  # Purple
]

ACCENT_COLORS = [
    "#3182ce",  # Blue
    "#38a169",  # Green
    "#d69e2e",  # Gold
    "#e53e3e",  # Red
    "#805ad5",  # Purple
    "#dd6b20",  # Orange
]


def generate_invoice_data() -> dict[str, Any]:
    """Generate synthetic invoice data with ground truth."""
    # Generate vendor
    vendor_name = fake.company()
    vendor_address = {
        "street": fake.street_address(),
        "city": fake.city(),
        "state": fake.state_abbr(),
        "zip": fake.zipcode(),
        "country": "USA",
    }

    # Generate customer
    customer_name = fake.company()
    customer_address = {
        "street": fake.street_address(),
        "city": fake.city(),
        "state": fake.state_abbr(),
        "zip": fake.zipcode(),
        "country": "USA",
    }

    # Generate dates
    invoice_date = fake.date_between(start_date="-1y", end_date="today")
    payment_terms_days = random.choice([15, 30, 45, 60, 90])
    due_date = invoice_date + timedelta(days=payment_terms_days)

    # Generate line items
    num_items = random.randint(1, 8)
    line_items = []
    for _ in range(num_items):
        quantity = random.randint(1, 100)
        unit_price = round(random.uniform(10, 1000), 2)
        amount = round(quantity * unit_price, 2)
        line_items.append({
            "description": fake.bs().title(),
            "quantity": quantity,
            "unit_price": unit_price,
            "amount": amount,
        })

    # Calculate totals
    subtotal = sum(item["amount"] for item in line_items)
    tax_rate = random.choice([0, 0.05, 0.0625, 0.07, 0.0825, 0.10])
    tax_amount = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax_amount, 2)

    # Payment terms
    payment_terms_options = [
        f"Net {payment_terms_days}",
        "Due on Receipt",
        f"Payment due within {payment_terms_days} days",
    ]

    return {
        "document_type": "invoice",
        "invoice_number": f"INV-{fake.random_number(digits=6)}",
        "invoice_date": invoice_date.isoformat(),
        "due_date": due_date.isoformat(),
        "payment_terms": random.choice(payment_terms_options),
        "vendor_name": vendor_name,
        "vendor_address": vendor_address,
        "vendor_email": fake.company_email(),
        "vendor_phone": fake.phone_number(),
        "customer_name": customer_name,
        "customer_address": customer_address,
        "line_items": line_items,
        "subtotal": subtotal,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "total": total,
        "currency": "USD",
        "notes": fake.sentence() if random.random() > 0.5 else None,
    }


def generate_receipt_data() -> dict[str, Any]:
    """Generate synthetic receipt data with ground truth."""
    # Generate merchant
    merchant_types = ["Restaurant", "Grocery Store", "Gas Station", "Retail Store", "Coffee Shop"]
    merchant_name = f"{fake.last_name()}'s {random.choice(merchant_types)}"

    # Generate address
    merchant_address = {
        "street": fake.street_address(),
        "city": fake.city(),
        "state": fake.state_abbr(),
        "zip": fake.zipcode(),
    }

    # Generate date and time
    receipt_date = fake.date_between(start_date="-6m", end_date="today")
    receipt_time = fake.time()

    # Generate items
    num_items = random.randint(1, 12)
    items = []
    for _ in range(num_items):
        price = round(random.uniform(0.99, 99.99), 2)
        qty = random.randint(1, 5)
        items.append({
            "name": fake.word().title(),
            "quantity": qty,
            "price": price,
            "total": round(price * qty, 2),
        })

    # Calculate totals
    subtotal = sum(item["total"] for item in items)
    tax_rate = random.choice([0, 0.05, 0.0625, 0.07, 0.0825])
    tax = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax, 2)

    # Payment method
    payment_methods = ["CASH", "VISA ****1234", "MASTERCARD ****5678", "AMEX ****9012", "DEBIT ****3456"]

    return {
        "document_type": "receipt",
        "merchant_name": merchant_name,
        "merchant_address": merchant_address,
        "merchant_phone": fake.phone_number(),
        "receipt_number": f"#{fake.random_number(digits=8)}",
        "date": receipt_date.isoformat(),
        "time": receipt_time,
        "line_items": items,
        "subtotal": subtotal,
        "tax_rate": tax_rate,
        "tax": tax,
        "total": total,
        "payment_method": random.choice(payment_methods),
        "cashier": fake.first_name() if random.random() > 0.5 else None,
    }


def generate_contract_data() -> dict[str, Any]:
    """Generate synthetic contract data with ground truth."""
    # Generate parties
    party_a = fake.company()
    party_b = fake.company()

    # Generate dates
    effective_date = fake.date_between(start_date="-1y", end_date="today")
    term_years = random.choice([1, 2, 3, 5])
    expiration_date = effective_date + timedelta(days=365 * term_years)

    # Contract types
    contract_types = [
        "Service Agreement",
        "Master Services Agreement",
        "Consulting Agreement",
        "Software License Agreement",
        "Non-Disclosure Agreement",
        "Employment Agreement",
    ]

    # Generate value
    contract_value = round(random.uniform(10000, 500000), 2)

    return {
        "document_type": "contract",
        "contract_type": random.choice(contract_types),
        "contract_number": f"CTR-{fake.random_number(digits=6)}",
        "party_a_name": party_a,
        "party_a_address": {
            "street": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode(),
        },
        "party_b_name": party_b,
        "party_b_address": {
            "street": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode(),
        },
        "effective_date": effective_date.isoformat(),
        "expiration_date": expiration_date.isoformat(),
        "term_years": term_years,
        "contract_value": contract_value,
        "currency": "USD",
        "governing_law": fake.state(),
        "signatures": [
            {"name": fake.name(), "title": "CEO", "party": "A"},
            {"name": fake.name(), "title": "VP Operations", "party": "B"},
        ],
    }


def generate_w2_data() -> dict[str, Any]:
    """Generate synthetic W-2 data with ground truth."""
    # Tax year
    tax_year = random.choice([2022, 2023, 2024])

    # Employee info
    employee_name = fake.name()
    employee_ssn_last4 = fake.random_number(digits=4, fix_len=True)

    # Employer info
    employer_name = fake.company()
    employer_ein = f"{fake.random_number(digits=2, fix_len=True)}-{fake.random_number(digits=7, fix_len=True)}"

    # Wages - realistic ranges
    wages = round(random.uniform(30000, 200000), 2)
    federal_tax = round(wages * random.uniform(0.12, 0.24), 2)
    ss_wages = min(wages, 160200)  # SS wage base
    ss_tax = round(ss_wages * 0.062, 2)
    medicare_wages = wages
    medicare_tax = round(medicare_wages * 0.0145, 2)

    # State info
    state = fake.state_abbr()
    state_wages = wages
    state_tax = round(wages * random.uniform(0.02, 0.08), 2)

    return {
        "document_type": "w2",
        "tax_year": tax_year,
        "employee_name": employee_name,
        "employee_ssn_last4": str(employee_ssn_last4),
        "employee_address": {
            "street": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode(),
        },
        "employer_name": employer_name,
        "employer_ein": employer_ein,
        "employer_address": {
            "street": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip": fake.zipcode(),
        },
        "box_1_wages": wages,
        "box_2_federal_tax": federal_tax,
        "box_3_ss_wages": ss_wages,
        "box_4_ss_tax": ss_tax,
        "box_5_medicare_wages": medicare_wages,
        "box_6_medicare_tax": medicare_tax,
        "state": state,
        "state_wages": state_wages,
        "state_income_tax": state_tax,
    }


def get_visual_variations() -> dict[str, str]:
    """Get random visual variations for document styling."""
    return {
        "font_family": random.choice(FONTS),
        "header_color": random.choice(HEADER_COLORS),
        "accent_color": random.choice(ACCENT_COLORS),
        "font_size": random.choice(["12px", "13px", "14px"]),
    }


def render_document(doc_type: str, data: dict, output_path: Path, styles: dict) -> None:
    """Render document from template and save."""
    # Load template
    env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

    try:
        template = env.get_template(f"{doc_type}.html")
    except Exception:
        # If template doesn't exist, create a basic one
        create_default_template(doc_type)
        template = env.get_template(f"{doc_type}.html")

    # Render HTML
    html_content = template.render(data=data, styles=styles)

    # Save HTML
    html_path = output_path.with_suffix(".html")
    with open(html_path, "w") as f:
        f.write(html_content)

    # Convert to PDF if weasyprint is available
    if WEASYPRINT_AVAILABLE:
        try:
            pdf_path = output_path.with_suffix(".pdf")
            HTML(string=html_content).write_pdf(pdf_path)
        except Exception as e:
            print(f"Warning: Could not generate PDF: {e}")


def create_default_template(doc_type: str) -> None:
    """Create default HTML templates for each document type."""
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

    templates = {
        "invoice": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: {{ styles.font_family }};
            font-size: {{ styles.font_size }};
            margin: 40px;
            color: #333;
        }
        .header {
            background-color: {{ styles.header_color }};
            color: white;
            padding: 20px;
            margin-bottom: 30px;
        }
        .header h1 { margin: 0; font-size: 28px; }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .section { margin-bottom: 20px; }
        .section-title {
            color: {{ styles.accent_color }};
            font-weight: bold;
            border-bottom: 2px solid {{ styles.accent_color }};
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th {
            background-color: {{ styles.header_color }};
            color: white;
            padding: 10px;
            text-align: left;
        }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .totals { text-align: right; margin-top: 20px; }
        .totals div { margin: 5px 0; }
        .total-amount {
            font-size: 18px;
            font-weight: bold;
            color: {{ styles.header_color }};
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>INVOICE</h1>
        <div>{{ data.vendor_name }}</div>
    </div>

    <div class="invoice-info">
        <div>
            <div class="section-title">Bill To:</div>
            <div>{{ data.customer_name }}</div>
            <div>{{ data.customer_address.street }}</div>
            <div>{{ data.customer_address.city }}, {{ data.customer_address.state }} {{ data.customer_address.zip }}</div>
        </div>
        <div style="text-align: right;">
            <div><strong>Invoice #:</strong> {{ data.invoice_number }}</div>
            <div><strong>Date:</strong> {{ data.invoice_date }}</div>
            <div><strong>Due Date:</strong> {{ data.due_date }}</div>
            <div><strong>Terms:</strong> {{ data.payment_terms }}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            {% for item in data.line_items %}
            <tr>
                <td>{{ item.description }}</td>
                <td>{{ item.quantity }}</td>
                <td>${{ "%.2f"|format(item.unit_price) }}</td>
                <td>${{ "%.2f"|format(item.amount) }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="totals">
        <div><strong>Subtotal:</strong> ${{ "%.2f"|format(data.subtotal) }}</div>
        {% if data.tax_amount > 0 %}
        <div><strong>Tax ({{ "%.1f"|format(data.tax_rate * 100) }}%):</strong> ${{ "%.2f"|format(data.tax_amount) }}</div>
        {% endif %}
        <div class="total-amount"><strong>Total:</strong> ${{ "%.2f"|format(data.total) }} {{ data.currency }}</div>
    </div>

    {% if data.notes %}
    <div class="section" style="margin-top: 30px;">
        <div class="section-title">Notes</div>
        <p>{{ data.notes }}</p>
    </div>
    {% endif %}
</body>
</html>""",
        "receipt": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: {{ styles.font_family }};
            font-size: {{ styles.font_size }};
            max-width: 300px;
            margin: 20px auto;
            padding: 20px;
            border: 1px solid #ccc;
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #333;
            padding-bottom: 15px;
            margin-bottom: 15px;
        }
        .header h1 {
            font-size: 18px;
            margin: 0;
            color: {{ styles.header_color }};
        }
        .header .address { font-size: 11px; color: #666; }
        .meta { font-size: 11px; margin-bottom: 15px; }
        .items { margin-bottom: 15px; }
        .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
        }
        .totals {
            border-top: 2px dashed #333;
            padding-top: 10px;
        }
        .totals div {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        .total-row {
            font-weight: bold;
            font-size: 16px;
            color: {{ styles.header_color }};
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ data.merchant_name }}</h1>
        <div class="address">
            {{ data.merchant_address.street }}<br>
            {{ data.merchant_address.city }}, {{ data.merchant_address.state }} {{ data.merchant_address.zip }}<br>
            {{ data.merchant_phone }}
        </div>
    </div>

    <div class="meta">
        <div>Receipt: {{ data.receipt_number }}</div>
        <div>Date: {{ data.date }} {{ data.time }}</div>
        {% if data.cashier %}
        <div>Cashier: {{ data.cashier }}</div>
        {% endif %}
    </div>

    <div class="items">
        {% for item in data.line_items %}
        <div class="item">
            <span>{{ item.name }} {% if item.quantity > 1 %}x{{ item.quantity }}{% endif %}</span>
            <span>${{ "%.2f"|format(item.total) }}</span>
        </div>
        {% endfor %}
    </div>

    <div class="totals">
        <div>
            <span>Subtotal</span>
            <span>${{ "%.2f"|format(data.subtotal) }}</span>
        </div>
        {% if data.tax > 0 %}
        <div>
            <span>Tax</span>
            <span>${{ "%.2f"|format(data.tax) }}</span>
        </div>
        {% endif %}
        <div class="total-row">
            <span>TOTAL</span>
            <span>${{ "%.2f"|format(data.total) }}</span>
        </div>
        <div>
            <span>{{ data.payment_method }}</span>
            <span>${{ "%.2f"|format(data.total) }}</span>
        </div>
    </div>

    <div class="footer">
        Thank you for your business!<br>
        Please come again
    </div>
</body>
</html>""",
        "contract": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: {{ styles.font_family }};
            font-size: {{ styles.font_size }};
            margin: 50px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            color: {{ styles.header_color }};
            margin-bottom: 10px;
        }
        .header h2 {
            font-weight: normal;
            font-size: 16px;
            color: #666;
        }
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #f5f5f5;
        }
        .party h3 {
            color: {{ styles.accent_color }};
            margin-bottom: 10px;
        }
        .terms { margin-bottom: 30px; }
        .term-item {
            margin-bottom: 15px;
            padding-left: 20px;
            border-left: 3px solid {{ styles.accent_color }};
        }
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
        }
        .signature-block {
            width: 40%;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 50px;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ data.contract_type|upper }}</h1>
        <h2>Contract Number: {{ data.contract_number }}</h2>
    </div>

    <div class="parties">
        <div class="party">
            <h3>Party A</h3>
            <div><strong>{{ data.party_a_name }}</strong></div>
            <div>{{ data.party_a_address.street }}</div>
            <div>{{ data.party_a_address.city }}, {{ data.party_a_address.state }} {{ data.party_a_address.zip }}</div>
        </div>
        <div class="party">
            <h3>Party B</h3>
            <div><strong>{{ data.party_b_name }}</strong></div>
            <div>{{ data.party_b_address.street }}</div>
            <div>{{ data.party_b_address.city }}, {{ data.party_b_address.state }} {{ data.party_b_address.zip }}</div>
        </div>
    </div>

    <div class="terms">
        <div class="term-item">
            <strong>Effective Date:</strong> {{ data.effective_date }}
        </div>
        <div class="term-item">
            <strong>Expiration Date:</strong> {{ data.expiration_date }}
        </div>
        <div class="term-item">
            <strong>Term:</strong> {{ data.term_years }} year(s)
        </div>
        <div class="term-item">
            <strong>Contract Value:</strong> ${{ "{:,.2f}".format(data.contract_value) }} {{ data.currency }}
        </div>
        <div class="term-item">
            <strong>Governing Law:</strong> State of {{ data.governing_law }}
        </div>
    </div>

    <div class="signatures">
        {% for sig in data.signatures %}
        <div class="signature-block">
            <div class="signature-line">
                <div><strong>{{ sig.name }}</strong></div>
                <div>{{ sig.title }}</div>
                <div>Party {{ sig.party }}</div>
                <div>Date: ________________</div>
            </div>
        </div>
        {% endfor %}
    </div>
</body>
</html>""",
        "w2": """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: {{ styles.font_family }};
            font-size: 11px;
            margin: 30px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 18px;
            color: {{ styles.header_color }};
            margin: 0;
        }
        .header .subtitle { font-size: 12px; color: #666; }
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            border: 2px solid #333;
            padding: 10px;
        }
        .box {
            border: 1px solid #999;
            padding: 8px;
            min-height: 50px;
        }
        .box-number {
            font-size: 9px;
            color: #666;
            margin-bottom: 3px;
        }
        .box-value {
            font-size: 14px;
            font-weight: bold;
        }
        .box-label { font-size: 9px; color: #666; }
        .full-width { grid-column: span 2; }
        .amount { color: {{ styles.accent_color }}; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Form W-2</h1>
        <div class="subtitle">Wage and Tax Statement {{ data.tax_year }}</div>
    </div>

    <div class="form-grid">
        <div class="box">
            <div class="box-number">a Employee's social security number</div>
            <div class="box-value">XXX-XX-{{ data.employee_ssn_last4 }}</div>
        </div>
        <div class="box">
            <div class="box-number">b Employer identification number (EIN)</div>
            <div class="box-value">{{ data.employer_ein }}</div>
        </div>

        <div class="box full-width">
            <div class="box-number">c Employer's name, address, and ZIP code</div>
            <div class="box-value">{{ data.employer_name }}</div>
            <div>{{ data.employer_address.street }}</div>
            <div>{{ data.employer_address.city }}, {{ data.employer_address.state }} {{ data.employer_address.zip }}</div>
        </div>

        <div class="box full-width">
            <div class="box-number">e Employee's name and address</div>
            <div class="box-value">{{ data.employee_name }}</div>
            <div>{{ data.employee_address.street }}</div>
            <div>{{ data.employee_address.city }}, {{ data.employee_address.state }} {{ data.employee_address.zip }}</div>
        </div>

        <div class="box">
            <div class="box-number">1 Wages, tips, other compensation</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_1_wages) }}</div>
        </div>
        <div class="box">
            <div class="box-number">2 Federal income tax withheld</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_2_federal_tax) }}</div>
        </div>

        <div class="box">
            <div class="box-number">3 Social security wages</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_3_ss_wages) }}</div>
        </div>
        <div class="box">
            <div class="box-number">4 Social security tax withheld</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_4_ss_tax) }}</div>
        </div>

        <div class="box">
            <div class="box-number">5 Medicare wages and tips</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_5_medicare_wages) }}</div>
        </div>
        <div class="box">
            <div class="box-number">6 Medicare tax withheld</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.box_6_medicare_tax) }}</div>
        </div>

        <div class="box">
            <div class="box-number">15 State</div>
            <div class="box-value">{{ data.state }}</div>
        </div>
        <div class="box">
            <div class="box-number">16 State wages, tips, etc.</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.state_wages) }}</div>
        </div>

        <div class="box full-width">
            <div class="box-number">17 State income tax</div>
            <div class="box-value amount">${{ "{:,.2f}".format(data.state_income_tax) }}</div>
        </div>
    </div>
</body>
</html>""",
    }

    for name, content in templates.items():
        template_path = TEMPLATES_DIR / f"{name}.html"
        if not template_path.exists():
            with open(template_path, "w") as f:
                f.write(content)


def generate_documents(doc_type: str, count: int, output_dir: Path) -> list[dict]:
    """Generate multiple synthetic documents of a given type."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Data generators
    generators = {
        "invoice": generate_invoice_data,
        "receipt": generate_receipt_data,
        "contract": generate_contract_data,
        "w2": generate_w2_data,
    }

    if doc_type not in generators:
        print(f"Unknown document type: {doc_type}")
        return []

    generator = generators[doc_type]
    results = []

    print(f"\nGenerating {count} {doc_type}(s)...")

    for i in range(count):
        # Generate data
        data = generator()
        styles = get_visual_variations()

        # Create filename
        doc_id = f"{doc_type}_{i+1:05d}"
        output_path = output_dir / doc_id

        # Render document
        render_document(doc_type, data, output_path, styles)

        # Save ground truth
        ground_truth = {
            "document_id": doc_id,
            "ground_truth": data,
            "visual_styles": styles,
            "generated_at": datetime.now().isoformat(),
        }
        with open(output_path.with_suffix(".json"), "w") as f:
            json.dump(ground_truth, f, indent=2)

        results.append(ground_truth)

        if (i + 1) % 50 == 0:
            print(f"  Generated {i+1}/{count}")

    print(f"  Saved to {output_dir}")
    return results


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic documents for training")
    parser.add_argument(
        "--type",
        choices=["invoice", "receipt", "contract", "w2"],
        help="Type of document to generate",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=100,
        help="Number of documents to generate per type (default: 100)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate all document types",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(SYNTHETIC_DIR),
        help="Output directory",
    )

    args = parser.parse_args()

    # Create default templates
    create_default_template("invoice")
    create_default_template("receipt")
    create_default_template("contract")
    create_default_template("w2")

    output_base = Path(args.output)
    total_generated = 0

    if args.all:
        # Generate all types
        for doc_type in ["invoice", "receipt", "contract", "w2"]:
            output_dir = output_base / f"{doc_type}s"
            results = generate_documents(doc_type, args.count, output_dir)
            total_generated += len(results)
    elif args.type:
        # Generate specific type
        output_dir = output_base / f"{args.type}s"
        results = generate_documents(args.type, args.count, output_dir)
        total_generated = len(results)
    else:
        parser.print_help()
        return

    # Create summary
    summary = {
        "total_generated": total_generated,
        "generated_at": datetime.now().isoformat(),
        "output_directory": str(output_base),
        "weasyprint_available": WEASYPRINT_AVAILABLE,
    }
    with open(output_base / "generation_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\n{'='*60}")
    print(f"Generation Complete!")
    print(f"{'='*60}")
    print(f"Total documents generated: {total_generated}")
    print(f"Output directory: {output_base}")
    print(f"PDF generation: {'Enabled' if WEASYPRINT_AVAILABLE else 'Disabled (HTML only)'}")

    if not WEASYPRINT_AVAILABLE:
        print("\nTo enable PDF generation, install weasyprint:")
        print("  pip install weasyprint")


if __name__ == "__main__":
    main()
