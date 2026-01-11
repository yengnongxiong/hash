# Hash - B2B Document & People Management Platform

## Quick Context

**What this is**: B2B SaaS for document/people management with AI OCR, smart automation, and ML-powered extraction. Multi-tenant, Supabase backend.

**User Preferences**:
- Proactively use MCP tools (Supabase, Playwright, Context7, Shadcn, Semgrep) without asking
- Use agents (Explore, Plan, feature-dev) for complex tasks
- Run `npm run build` after changes to verify
- Commit only when explicitly requested
- Admin email: yengnongxiong@gmail.com

**Key Terminology**:
- "People" (not "Customers") - renamed for professionalism
- Person and Document IDs are 6-char alphanumeric (e.g., "A3B7K2"), not sequential

**Current State**: All MVP + Phase 2 + Phase 3 + Phase 4 + Phase 5 complete. Features include:
- Document OCR with confidence scoring and review workflow
- A/B testing framework for model experiments
- Dead letter queue (DLQ) for failed document processing
- PII detection and redaction
- Retention policies with automated cleanup
- Document version history
- Duplicate detection via embeddings
- Organization join codes
- Admin 2FA email verification (24-hour sessions)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector) |
| UI | shadcn/ui + Tailwind CSS 4 |
| Tables | TanStack Table v8 |
| OCR/AI | Mistral AI (pixtral-12b-latest), Together AI, OpenAI embeddings |
| Drag & Drop | @hello-pangea/dnd |
| Command Palette | cmdk |
| Email | Resend |
| Drawing | react-sketch-canvas |
| Markdown | react-markdown |

---

## Architecture Overview

### Document Processing Pipeline

```
Upload → Queue → OCR (Mistral) → Extraction → Validation → Embedding → Review/Auto-approve
                       ↓                          ↓
                  DLQ (failed)              Anomaly Detection
```

1. **Queue System** (`document_queue`): Prioritized processing with retry logic
2. **OCR & Extraction**: Mistral pixtral-12b for OCR, optional Together AI for structured extraction
3. **Confidence Scoring**: High/medium/low thresholds per organization (`organization_ai_settings`)
4. **Validation**: Rule-based and cross-field validation (`validation_rules`)
5. **Embeddings**: OpenAI text-embedding-3-small for duplicate detection and similarity search
6. **Auto-approval**: Configurable thresholds, requires no flags and high confidence

### ML Training Loop

```
User Corrections → Field Corrections → Training Batches → Model Versions → A/B Experiments
```

1. **Field Corrections** (`field_corrections`): Tracks user edits to extracted data
2. **Training Batches** (`training_batches`): Aggregates corrections for fine-tuning
3. **Model Versions** (`model_versions`): Version control for extraction models
4. **Experiments** (`model_experiments`): A/B testing between model versions

### Smart Automation

- **Anomaly Detection**: Statistical outliers, amount deviations, duplicate suspects
- **Entity Matching**: Known vendors/customers with fuzzy and semantic matching
- **Accuracy Metrics**: Daily aggregation of extraction quality per document type
- **Retention Policies**: Automated archival/deletion with notification support

---

## Supabase Configuration

```
Project ID: hbsmvvxdyvzbhetofnbu
Region: us-east-2
```

### Database Tables (Grouped by Feature)

#### Core Tables
| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant org data with `org_code` for joining |
| `users` | User profiles linked to Supabase Auth |
| `customers` | People records with 6-char alphanumeric IDs |
| `activity_log` | Organization-wide activity feed |

#### Documents
| Table | Purpose |
|-------|---------|
| `documents` | Uploaded docs with OCR status, confidence scores, soft delete |
| `document_audit_log` | Document activity history |
| `document_flags` | LLM-detected anomalies (past due, duplicates, suspicious amounts) |
| `document_dates` | Extracted important dates (due dates, expirations, etc.) |
| `document_versions` | Version history of extracted data changes |
| `document_queue` | Processing queue with priority, retry logic, DLQ status |
| `document_embeddings` | Vector embeddings for similarity search (pgvector) |

#### Appointments & Dates
| Table | Purpose |
|-------|---------|
| `appointments` | Customer appointments with multi-person support (`customer_ids`) |
| `appointment_types` | Customizable appointment categories with colors |

#### Tasks (Whiteboard)
| Table | Purpose |
|-------|---------|
| `whiteboard_tasks` | Realtime kanban tasks with priority, labels, multi-assignee |
| `task_subtasks` | Subtasks with completion tracking |
| `task_attachments` | File attachments for tasks |
| `task_recommendations` | LLM-generated task suggestions |

#### People & Tags
| Table | Purpose |
|-------|---------|
| `person_tags` | Customizable tags for people with colors |
| `customer_tag_assignments` | Many-to-many tag assignments |

#### ML & Training
| Table | Purpose |
|-------|---------|
| `field_corrections` | User corrections to extracted fields (training data) |
| `model_versions` | Extraction model versions with accuracy tracking |
| `model_experiments` | A/B experiments between model versions |
| `experiment_results` | Per-document results for experiments |
| `training_batches` | Aggregated training data batches |
| `processing_metrics` | Per-document processing duration and confidence |

#### Smart Automation
| Table | Purpose |
|-------|---------|
| `organization_ai_settings` | Confidence thresholds, auto-approval config |
| `validation_rules` | Custom validation rules per org/document type |
| `accuracy_metrics` | Daily accuracy aggregation per document type |
| `anomaly_detections` | Detected anomalies (outliers, mismatches) |
| `known_entities` | Known vendors/customers with aliases for matching |
| `entity_matches` | Document-to-entity matches with confidence |

#### Retention & Compliance
| Table | Purpose |
|-------|---------|
| `retention_policies` | Document retention rules (archive/delete/notify) |
| `retention_jobs` | Execution logs for retention policy runs |

#### System & Admin
| Table | Purpose |
|-------|---------|
| `system_alerts` | Maintenance notices (global + per-org targeting) |
| `admin_verification_codes` | Email 2FA codes for admin access |
| `admin_sessions` | Verified admin sessions (24-hour validity) |
| `admin_activity_log` | Admin action audit trail |

### Realtime Enabled
- `whiteboard_tasks` - Live collaboration on kanban board

### Key Database Functions
- `user_organization_id()` - Returns current user's org ID for RLS
- `match_documents()` - Semantic similarity search using pgvector

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # Protected routes (business users)
│   │   ├── people/            # People management
│   │   │   └── appointments/  # People appointments
│   │   ├── dates/             # Unified dates view (appointments + document dates)
│   │   ├── documents/         # Document management
│   │   │   ├── [id]/          # Document detail with version history
│   │   │   ├── calendar/      # Dates calendar view
│   │   │   ├── review/        # Document review queue
│   │   │   ├── quality/       # Quality metrics dashboard
│   │   │   └── upload/        # Upload page
│   │   ├── tasks/             # Team tasks (kanban + table + gallery views)
│   │   ├── settings/          # User settings + read-only system alerts
│   │   └── page.tsx           # Dashboard home
│   ├── admin/                 # Developer admin panel (email 2FA protected)
│   │   ├── page.tsx           # Admin dashboard
│   │   ├── verify/            # 2FA verification page
│   │   ├── alerts/            # System alerts management
│   │   ├── users/             # Users overview
│   │   ├── organizations/     # Organizations overview with join codes
│   │   ├── processing/        # Document queue & failed processing
│   │   ├── activity/          # Admin activity log
│   │   └── actions.ts         # Admin server actions
│   └── (auth)/                # Auth routes
│       ├── login/             # Login page
│       └── signup/            # Signup with email confirmation
├── components/
│   ├── customers/             # People components
│   │   ├── appointments/      # Appointment components
│   │   ├── customer-gallery.tsx
│   │   ├── customer-card.tsx
│   │   ├── customers-view.tsx
│   │   ├── csv-import-dialog.tsx
│   │   ├── person-tags-dialog.tsx
│   │   └── tag-selector.tsx
│   ├── documents/             # Document components
│   │   ├── documents-view.tsx
│   │   ├── document-calendar.tsx
│   │   ├── document-list.tsx
│   │   ├── document-upload.tsx
│   │   ├── document-flags.tsx
│   │   ├── document-audit-log.tsx
│   │   ├── document-approval.tsx
│   │   ├── document-preview.tsx
│   │   ├── document-version-history.tsx
│   │   ├── duplicate-warning.tsx
│   │   ├── similar-documents.tsx
│   │   ├── retry-button.tsx
│   │   ├── processing-status.tsx
│   │   └── extracted-data-view.tsx
│   ├── dates/                 # Dates tab components
│   │   ├── dates-view.tsx
│   │   ├── dates-calendar.tsx
│   │   ├── dates-week-view.tsx
│   │   ├── appointment-detail-dialog.tsx
│   │   └── appointment-types-dialog.tsx
│   ├── dashboard/             # Dashboard components
│   │   ├── activity-feed.tsx
│   │   ├── whiteboard.tsx
│   │   ├── whiteboard-column.tsx
│   │   ├── whiteboard-task.tsx
│   │   ├── whiteboard-gallery.tsx
│   │   ├── whiteboard-table.tsx
│   │   ├── task-detail-dialog.tsx
│   │   ├── task-subtasks.tsx
│   │   ├── task-attachments.tsx
│   │   ├── create-task-dialog.tsx
│   │   └── sketch-canvas-dialog.tsx
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── command-palette.tsx
│   │   ├── keyboard-shortcuts-dialog.tsx
│   │   ├── dashboard-shell.tsx
│   │   └── system-alert-banner.tsx
│   ├── admin/                 # Admin panel components
│   │   ├── admin-dashboard.tsx
│   │   ├── admin-page-wrapper.tsx
│   │   ├── admin-alerts-manager.tsx
│   │   ├── ai-settings-manager.tsx
│   │   ├── experiments-manager.tsx
│   │   ├── failed-documents-manager.tsx
│   │   ├── organizations-list.tsx
│   │   ├── users-list.tsx
│   │   ├── create-organization-dialog.tsx
│   │   └── organization-code-actions.tsx
│   ├── settings/              # Settings components
│   ├── data-table/            # Reusable table components
│   ├── shared/                # Shared components (empty-state, error-boundary)
│   └── ui/                    # shadcn/ui components
├── contexts/
│   ├── theme-context.tsx      # Dark/light mode
│   └── sidebar-context.tsx    # Collapsed state
├── lib/
│   ├── supabase/              # Supabase clients (client.ts, server.ts, admin.ts)
│   ├── admin/                 # Admin 2FA auth utilities
│   ├── email/                 # Resend email service
│   ├── ocr/                   # OCR extraction
│   │   ├── provider.ts        # OCR provider abstraction
│   │   ├── mistral.ts         # Mistral pixtral integration
│   │   ├── together-extraction.ts  # Together AI extraction
│   │   ├── detect-flags.ts    # Anomaly detection in extracted data
│   │   ├── flag-config.ts     # Flag detection configuration
│   │   ├── confidence.ts      # Confidence scoring
│   │   ├── queue.ts           # Document processing queue
│   │   └── types.ts           # OCR type definitions
│   ├── embeddings/            # Vector embeddings
│   │   ├── openai.ts          # OpenAI embedding generation
│   │   ├── document-embeddings.ts  # Document embedding management
│   │   ├── duplicate-detection.ts  # Similarity-based duplicate detection
│   │   ├── entity-service.ts  # Known entity matching
│   │   └── index.ts
│   ├── ml/                    # Machine learning
│   │   ├── correction-service.ts   # Field correction tracking
│   │   ├── model-versioning.ts     # Model version management
│   │   ├── experiment-service.ts   # A/B experiment management
│   │   ├── training-export.ts      # Export training data
│   │   └── index.ts
│   ├── smart-automation/      # Smart automation features
│   │   ├── validation.ts      # Rule-based validation
│   │   ├── anomaly-detection.ts    # Statistical anomaly detection
│   │   ├── accuracy-monitoring.ts  # Accuracy metrics tracking
│   │   ├── auto-approval.ts   # Auto-approval logic
│   │   ├── learning-loop.ts   # Continuous learning system
│   │   └── index.ts
│   ├── pii/                   # PII handling
│   │   └── detector.ts        # PII detection and redaction
│   ├── retention/             # Data retention
│   │   └── policy.ts          # Retention policy execution
│   ├── errors/                # Error handling
│   │   ├── index.ts
│   │   └── document-processing.ts
│   ├── hooks/                 # Custom hooks
│   │   ├── use-debounce.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   └── use-document-shortcuts.ts
│   ├── utils/                 # Utilities
│   │   └── format.ts          # Formatting helpers
│   ├── export.ts              # CSV export utility
│   └── realtime.ts            # Realtime subscription helpers
└── types/
    └── database.ts            # Supabase generated types
```

---

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hbsmvvxdyvzbhetofnbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# AI/ML
MISTRAL_API_KEY=<mistral-key>
OPENAI_API_KEY=<openai-key>           # For embeddings
TOGETHER_API_KEY=<together-key>        # For structured extraction

# Admin
ADMIN_EMAIL=yengnongxiong@gmail.com

# Email
RESEND_API_KEY=<resend-key>
```

---

## MCP Servers

### Supabase MCP
Database operations for this project.

| Tool | When to Use |
|------|-------------|
| `execute_sql` | Run SELECT/INSERT/UPDATE/DELETE queries |
| `apply_migration` | DDL changes (CREATE TABLE, ALTER, etc.) |
| `list_tables` | View current schema |
| `list_migrations` | See applied migrations |
| `get_logs` | Debug database/auth/storage issues |
| `get_advisors` | Check security (RLS) and performance issues |
| `generate_typescript_types` | Regenerate `database.ts` after schema changes |
| `list_edge_functions` | View deployed edge functions |
| `deploy_edge_function` | Deploy new/updated edge functions |
| `search_docs` | Search Supabase documentation (GraphQL) |

### Playwright MCP
Browser automation and testing.

| Tool | When to Use |
|------|-------------|
| `browser_navigate` | Go to a URL |
| `browser_snapshot` | Get page accessibility tree (preferred over screenshot for actions) |
| `browser_take_screenshot` | Visual verification |
| `browser_click` | Click elements by ref |
| `browser_type` | Type into inputs |
| `browser_fill_form` | Fill multiple form fields at once |
| `browser_select_option` | Select dropdown options |
| `browser_press_key` | Keyboard input (Enter, Escape, etc.) |
| `browser_wait_for` | Wait for text/element/time |
| `browser_console_messages` | Check for JS errors |
| `browser_network_requests` | Debug API calls |
| `browser_tabs` | Manage browser tabs |
| `browser_close` | Close the browser |

### Context7 MCP
Up-to-date library documentation.

| Tool | When to Use |
|------|-------------|
| `resolve-library-id` | Find Context7 library ID (call first) |
| `query-docs` | Get documentation for a library |

### Shadcn MCP
Component registry operations.

| Tool | When to Use |
|------|-------------|
| `search_items_in_registries` | Find components by name/description |
| `view_items_in_registries` | Get component details and code |
| `get_item_examples_from_registries` | Find usage examples/demos |
| `get_add_command_for_items` | Get CLI command to install components |
| `get_audit_checklist` | Verify new components work correctly |

### Semgrep MCP
Security scanning and code analysis.

| Tool | When to Use |
|------|-------------|
| `semgrep_scan` | Scan files for security vulnerabilities |
| `semgrep_scan_with_custom_rule` | Scan with custom YAML rules |
| `semgrep_findings` | Get findings from Semgrep AppSec Platform |
| `semgrep_scan_supply_chain` | Check dependencies for vulnerabilities |
| `get_abstract_syntax_tree` | Get AST for code analysis |
| `semgrep_rule_schema` | Get schema for writing custom rules |

### Sequential Thinking MCP
Complex problem solving.

| Tool | When to Use |
|------|-------------|
| `sequentialthinking` | Multi-step reasoning, planning, hypothesis verification |

---

## Agents

Use the Task tool with `subagent_type` parameter:

| Agent | When to Use |
|-------|-------------|
| `Explore` | Quick codebase exploration, find files/patterns, answer questions about code |
| `Plan` | Design implementation strategies, architectural decisions |
| `feature-dev:code-architect` | Design feature architectures with specific files/components |
| `feature-dev:code-reviewer` | Review code for bugs, security, quality issues |
| `feature-dev:code-explorer` | Deep analysis of existing features, trace execution paths |
| `code-simplifier:code-simplifier` | Simplify and refine code for clarity |
| `Bash` | Git operations, command execution |
| `general-purpose` | Multi-step tasks, complex research |

---

## Skills (Slash Commands)

Use the Skill tool to invoke:

| Skill | When to Use |
|-------|-------------|
| `/feature-dev` | Guided feature development with codebase understanding |
| `/frontend-design` | Create distinctive, production-grade UI components |
| `/vercel:deploy` | Deploy to Vercel |
| `/vercel:setup` | Configure Vercel CLI and project |
| `/vercel:logs` | View Vercel deployment logs |

---

## Common Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build (run after changes)
npm run lint         # ESLint check

# Regenerate types after schema changes
npx supabase gen types typescript --project-id hbsmvvxdyvzbhetofnbu > src/types/database.ts
```

---

## Key Pages

| Path | Description |
|------|-------------|
| `/people` | People table with gallery view, CSV import/export, tags |
| `/people/appointments` | People appointments with calendar |
| `/dates` | Unified dates/appointments view with week view |
| `/documents` | Document list with filters, OCR status, confidence |
| `/documents/[id]` | Document detail with version history, similar docs |
| `/documents/calendar` | Document dates calendar view |
| `/documents/review` | Document review queue (pending review) |
| `/documents/quality` | Quality metrics dashboard |
| `/tasks` | Team tasks with kanban, table, and gallery views |
| `/settings` | User profile + system alerts |
| `/admin` | Admin dashboard (email 2FA, ADMIN_EMAIL only) |
| `/admin/verify` | 2FA verification page (6-digit code entry) |
| `/admin/processing` | Document queue and failed processing |
| `/admin/activity` | Admin activity log |
| `/admin/organizations` | Manage organizations with join codes |

---

## Code Style Guidelines

1. Use **Server Actions** for mutations (not API routes)
2. **Optimistic updates** for better UX
3. **Toast notifications** for feedback (sonner)
4. **Relative timestamps** for dates (formatDistanceToNow)
5. **Badge components** for status indicators
6. **Icons from lucide-react** only
7. **No emojis** unless user requests
8. **Minimal comments** - code should be self-documenting

---

## Troubleshooting

### Build Errors
- Missing shadcn components: `npx shadcn@latest add <component> -y`
- Type errors: Regenerate `database.ts` or check schema

### Database Issues
- Check RLS policies: `mcp__plugin_supabase_supabase__get_advisors`
- View logs: `mcp__plugin_supabase_supabase__get_logs`

### Realtime Not Working
- Add table to publication: `ALTER PUBLICATION supabase_realtime ADD TABLE <table>`

### Document Processing Failures
- Check `document_queue` for DLQ items (status = 'dead_letter')
- View processing metrics in admin panel
- Check Mistral/Together API key validity

---

## Future Ideas

- Email notifications (appointment reminders, document alerts)
- Team member management (invite/remove users)
- Role-based permissions (admin vs member)
- API integrations (QuickBooks, Xero)
- Recommendations bar with LLM suggestions
- Dashboard widgets
- Mobile app
- Webhook integrations for external systems
