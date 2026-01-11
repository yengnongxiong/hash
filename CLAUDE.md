# Hash - B2B Document & People Management Platform

## Overview

Hash is a multi-tenant B2B SaaS platform for document and people management with AI-powered OCR, smart automation, ML-powered extraction, and team collaboration features.

**Supabase Project**: `hbsmvvxdyvzbhetofnbu` (Region: us-east-2)

---

## User Preferences

- Proactively use MCP tools (Supabase, Playwright, Context7, Shadcn, Semgrep) without asking
- Use agents (Explore, Plan, feature-dev) for complex tasks
- Run `npm run build` after changes to verify
- Commit only when explicitly requested
- Admin email: `yengnongxiong@gmail.com`

**Terminology**:
- "People" (not "Customers") - renamed for professionalism
- Person and Document IDs are 6-char alphanumeric (e.g., "A3B7K2"), not sequential

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript 5 + React 19.2.3 |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime + pgvector) |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4 |
| Tables | TanStack Table v8 |
| OCR | Mistral AI (pixtral-12b-latest) |
| Extraction | Together AI (fine-tuned Llama 3.1 8B) |
| Embeddings | OpenAI (text-embedding-3-small) |
| Drag & Drop | @hello-pangea/dnd |
| Command Palette | cmdk |
| Drawing | react-sketch-canvas |
| Markdown | react-markdown |
| Forms | Zod 4 validation |
| Notifications | Sonner (toast) |
| Icons | lucide-react |
| Date Utils | date-fns 4 |
| OTP Input | input-otp |

---

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://hbsmvvxdyvzbhetofnbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI/ML Services
MISTRAL_API_KEY=<mistral-key>                    # Document OCR
TOGETHER_API_KEY=<together-key>                  # Structured extraction
TOGETHER_FINE_TUNED_MODEL=yengnongxiong/Meta-Llama-3.1-8B-Instruct-Reference-hash-document-extraction-a969205d
OPENAI_API_KEY=<openai-key>                      # Embeddings

# Admin
ADMIN_EMAIL=yengnongxiong@gmail.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Architecture

### Document Processing Pipeline

```
Upload → Validate → Generate ID → Storage → Queue (OCR)
    ↓
Mistral OCR → Extract Data → Confidence Score → Detect Flags
    ↓
Validation → Entity Matching → Embedding → Auto-Approval Check
    ↓
Auto-Approved? → YES → Complete
             → NO → Review Queue → Human Review → Corrections (training data)
```

### ML Training Loop

```
User Corrections → Field Corrections → Training Batches → Model Versions → A/B Experiments
```

### Processing Queue Statuses
- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Failed (will retry)
- `dead_letter` - Failed permanently (DLQ)

### Document Statuses
- `pending` - Awaiting OCR
- `processing` - OCR in progress
- `pending_review` - Needs human review
- `completed` - Approved
- `failed` - Processing failed
- `rejected` - Manually rejected

### Confidence Thresholds
| Level | Threshold | Action |
|-------|-----------|--------|
| High | >90% | Can auto-approve |
| Medium | 60-90% | Standard review |
| Low | <60% | Detailed review |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant orgs with 6-char `org_code` for joining |
| `users` | User profiles linked to Supabase Auth (roles: owner/admin/member) |
| `customers` | People records with 6-char alphanumeric IDs |
| `activity_log` | Organization-wide activity feed |

### Documents

| Table | Purpose |
|-------|---------|
| `documents` | Main records with OCR status, confidence, soft delete |
| `document_queue` | Processing queue (priority, retry, DLQ support) |
| `document_versions` | Version history of extracted data |
| `document_audit_log` | Document activity timeline |
| `document_flags` | LLM-detected anomalies (past_due, duplicate, suspicious) |
| `document_dates` | Extracted important dates |
| `document_embeddings` | pgvector embeddings for similarity search |

### Dates & Appointments

| Table | Purpose |
|-------|---------|
| `dates` | Appointments with multi-person support (`customer_ids[]`, `assignee_ids[]`) |
| `date_types` | Customizable appointment categories with colors |

### Tasks (Whiteboard)

| Table | Purpose |
|-------|---------|
| `tasks` | Kanban tasks with priority, labels, `assigned_to_ids[]` (Realtime enabled) |
| `task_subtasks` | Subtasks with completion tracking |
| `task_attachments` | File attachments |
| `task_recommendations` | LLM-generated suggestions |

### People & Tags

| Table | Purpose |
|-------|---------|
| `person_tags` | Custom tags with colors |
| `customer_tag_assignments` | Many-to-many tag assignments |

### ML & Training

| Table | Purpose |
|-------|---------|
| `field_corrections` | User corrections (training data) |
| `model_versions` | Extraction model versions with accuracy |
| `model_experiments` | A/B experiment definitions |
| `experiment_results` | Per-document experiment results |
| `training_batches` | Aggregated training batches |
| `processing_metrics` | Performance metrics (duration, confidence) |

### Smart Automation

| Table | Purpose |
|-------|---------|
| `organization_ai_settings` | Confidence thresholds, auto-approval config |
| `validation_rules` | Custom validation per org/document type |
| `accuracy_metrics` | Daily accuracy aggregation |
| `anomaly_detections` | Statistical outliers and mismatches |
| `known_entities` | Reference vendors/customers for matching |
| `entity_matches` | Document-to-entity matches |

### Retention & Compliance

| Table | Purpose |
|-------|---------|
| `retention_policies` | Document archival/deletion rules |
| `retention_jobs` | Execution logs |

### System & Admin

| Table | Purpose |
|-------|---------|
| `system_alerts` | Global + org-targeted notifications |
| `admin_verification_codes` | Email OTP codes |
| `admin_sessions` | 24-hour verified sessions |
| `admin_activity_log` | Admin action audit trail |
| `trusted_devices` | Trusted device tracking |
| `user_verification_codes` | User device verification codes |

### Key Database Functions
- `user_organization_id()` - Returns current user's org ID for RLS
- `match_documents()` - Semantic similarity search via pgvector

### Realtime Enabled
- `tasks` - Live collaboration on kanban board

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Authentication routes
│   │   ├── login/                 # Password login + actions.ts
│   │   ├── signup/                # Registration with org code + actions.ts
│   │   │   └── confirm-email/     # Email confirmation
│   │   ├── verify-device/         # 6-digit OTP verification + actions.ts
│   │   └── auth/callback/         # Supabase auth callback
│   ├── (dashboard)/               # Protected business routes
│   │   ├── page.tsx               # Dashboard home
│   │   ├── people/                # People management + actions.ts
│   │   │   └── appointments/      # People appointments
│   │   ├── dates/                 # Unified dates view + actions.ts
│   │   ├── documents/             # Document management + actions.ts
│   │   │   ├── [id]/              # Document detail + actions.ts
│   │   │   ├── calendar/          # Document dates calendar
│   │   │   ├── review/            # Review queue
│   │   │   ├── quality/           # Quality metrics
│   │   │   └── upload/            # Upload page
│   │   ├── tasks/                 # Team kanban board + actions.ts
│   │   └── settings/              # User settings + actions.ts
│   ├── admin/                     # Admin panel (email 2FA protected)
│   │   ├── login/                 # Admin OTP login + actions.ts
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── actions.ts             # Admin server actions
│   │   ├── organizations/         # Org management + join codes
│   │   ├── users/                 # Users overview
│   │   ├── alerts/                # System alerts
│   │   ├── processing/            # Document queue
│   │   │   └── failed/            # Dead letter queue
│   │   └── activity/              # Admin audit log
│   └── api/
│       ├── cron/                  # Scheduled jobs
│       │   ├── check-training/    # Training batch checker
│       │   └── retrain-trigger/   # Model retraining trigger
│       ├── documents/[id]/audit-log/
│       └── webhooks/together/     # Together AI webhook
├── components/
│   ├── admin/                     # Admin panel components
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
│   ├── customers/                 # People management
│   │   ├── appointments/          # Appointment components
│   │   ├── customers-view.tsx
│   │   ├── customer-table.tsx
│   │   ├── customer-gallery.tsx
│   │   ├── customer-card.tsx
│   │   ├── customer-columns.tsx
│   │   ├── customer-detail-dialog.tsx
│   │   ├── create-customer-dialog.tsx
│   │   ├── csv-import-dialog.tsx
│   │   ├── person-tags-dialog.tsx
│   │   └── tag-selector.tsx
│   ├── dashboard/                 # Whiteboard/task components
│   │   ├── whiteboard.tsx
│   │   ├── whiteboard-column.tsx
│   │   ├── whiteboard-task.tsx
│   │   ├── whiteboard-table.tsx
│   │   ├── task-detail-dialog.tsx
│   │   ├── create-task-dialog.tsx
│   │   ├── task-subtasks.tsx
│   │   ├── task-attachments.tsx
│   │   ├── task-csv-import-dialog.tsx
│   │   ├── activity-feed.tsx
│   │   ├── sketch-canvas-dialog.tsx
│   │   └── dashboard-skeleton.tsx
│   ├── data-table/                # Reusable table components
│   │   ├── data-table.tsx
│   │   ├── column-header.tsx
│   │   ├── data-table-toolbar.tsx
│   │   ├── data-table-pagination.tsx
│   │   └── editable-cell.tsx
│   ├── dates/                     # Dates tab components
│   │   ├── dates-view.tsx
│   │   ├── dates-calendar.tsx
│   │   ├── dates-week-view.tsx
│   │   ├── appointment-detail-dialog.tsx
│   │   ├── appointment-types-dialog.tsx
│   │   └── csv-import-dialog.tsx
│   ├── documents/                 # Document components
│   │   ├── documents-view.tsx
│   │   ├── document-preview.tsx
│   │   ├── extracted-data-view.tsx
│   │   ├── document-version-history.tsx
│   │   ├── document-audit-log.tsx
│   │   ├── document-flags.tsx
│   │   ├── document-flags-wrapper.tsx
│   │   ├── document-approval.tsx
│   │   ├── document-calendar.tsx
│   │   ├── document-upload.tsx
│   │   ├── upload-dialog.tsx
│   │   ├── retry-button.tsx
│   │   ├── processing-status.tsx
│   │   ├── duplicate-warning.tsx
│   │   └── similar-documents.tsx
│   ├── layout/                    # Shell, sidebar, header
│   │   ├── dashboard-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── command-palette.tsx
│   │   ├── keyboard-shortcuts-dialog.tsx
│   │   ├── system-alert-banner.tsx
│   │   └── auth-guard.tsx
│   ├── settings/                  # Settings components
│   │   └── system-alerts-manager.tsx
│   ├── shared/                    # Error boundary, etc.
│   │   └── error-boundary.tsx
│   └── ui/                        # shadcn/ui (29 components)
├── contexts/
│   ├── theme-context.tsx          # Dark/light mode
│   └── sidebar-context.tsx        # Collapsed state
├── lib/
│   ├── supabase/                  # Supabase clients
│   │   ├── client.ts              # Browser client (SSR)
│   │   ├── server.ts              # Server-side client
│   │   └── admin.ts               # Admin client (service role)
│   ├── auth/
│   │   └── device.ts              # Device verification (Supabase OTP)
│   ├── admin/
│   │   └── auth.ts                # Admin 2FA (24-hour sessions)
│   ├── ocr/                       # OCR & extraction
│   │   ├── types.ts               # 40+ document types, ExtractedDocumentData
│   │   ├── provider.ts            # OCR provider abstraction
│   │   ├── mistral.ts             # Mistral pixtral integration
│   │   ├── together-extraction.ts # Together AI structured extraction
│   │   ├── confidence.ts          # Confidence scoring
│   │   ├── detect-flags.ts        # Anomaly detection
│   │   ├── flag-config.ts         # Flag configuration
│   │   └── queue.ts               # Processing queue with DLQ
│   ├── embeddings/                # Vector embeddings
│   │   ├── openai.ts              # OpenAI embedding generation
│   │   ├── document-embeddings.ts # Document embedding management
│   │   ├── duplicate-detection.ts # Semantic duplicate detection
│   │   ├── entity-service.ts      # Known entity matching
│   │   └── index.ts
│   ├── ml/                        # Machine learning
│   │   ├── correction-service.ts  # Field correction tracking
│   │   ├── model-versioning.ts    # Model version control
│   │   ├── experiment-service.ts  # A/B testing framework
│   │   ├── training-export.ts     # Training data export
│   │   ├── together-finetune.ts   # Together AI fine-tuning
│   │   └── index.ts
│   ├── smart-automation/          # Automation features
│   │   ├── auto-approval.ts       # Auto-approval logic
│   │   ├── validation.ts          # Rule-based validation
│   │   ├── anomaly-detection.ts   # Statistical anomaly detection
│   │   ├── accuracy-monitoring.ts # Performance metrics
│   │   ├── learning-loop.ts       # Continuous improvement
│   │   └── index.ts
│   ├── pii/
│   │   └── detector.ts            # PII detection & redaction
│   ├── retention/
│   │   └── policy.ts              # Document retention policies
│   ├── errors/                    # Error handling
│   │   ├── index.ts
│   │   └── document-processing.ts
│   ├── hooks/                     # Custom hooks
│   │   ├── use-debounce.ts
│   │   └── use-keyboard-shortcuts.ts
│   ├── utils/
│   │   └── format.ts              # Formatting helpers
│   ├── export.ts                  # CSV export
│   ├── realtime.ts                # Realtime subscriptions
│   └── utils.ts                   # cn(), clsx utilities
└── types/
    └── database.ts                # Supabase generated types
```

---

## MCP Servers

### Supabase MCP
Database operations for this project.

| Tool | When to Use |
|------|-------------|
| `execute_sql` | SELECT/INSERT/UPDATE/DELETE queries |
| `apply_migration` | DDL changes (CREATE TABLE, ALTER, etc.) |
| `list_tables` | View current schema |
| `list_migrations` | See applied migrations |
| `get_logs` | Debug database/auth/storage issues |
| `get_advisors` | Check security (RLS) and performance |
| `generate_typescript_types` | Regenerate `database.ts` after schema changes |
| `list_edge_functions` | View deployed edge functions |
| `deploy_edge_function` | Deploy edge functions |
| `search_docs` | Search Supabase documentation (GraphQL) |

### Playwright MCP
Browser automation and testing.

| Tool | When to Use |
|------|-------------|
| `browser_navigate` | Go to URL |
| `browser_snapshot` | Get accessibility tree (preferred for actions) |
| `browser_take_screenshot` | Visual verification |
| `browser_click` | Click elements |
| `browser_type` | Type into inputs |
| `browser_fill_form` | Fill multiple fields |
| `browser_select_option` | Select dropdowns |
| `browser_press_key` | Keyboard input |
| `browser_wait_for` | Wait for text/element/time |
| `browser_console_messages` | Check JS errors |
| `browser_network_requests` | Debug API calls |
| `browser_close` | Close browser |

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
| `search_items_in_registries` | Find components |
| `view_items_in_registries` | Get component details |
| `get_item_examples_from_registries` | Find usage examples |
| `get_add_command_for_items` | Get CLI install command |
| `get_audit_checklist` | Verify new components |

### Semgrep MCP
Security scanning.

| Tool | When to Use |
|------|-------------|
| `semgrep_scan` | Scan files for vulnerabilities |
| `semgrep_scan_with_custom_rule` | Scan with custom rules |
| `semgrep_findings` | Get findings from platform |
| `semgrep_scan_supply_chain` | Check dependencies |
| `get_abstract_syntax_tree` | Get AST for analysis |

### Sequential Thinking MCP
Complex problem solving.

| Tool | When to Use |
|------|-------------|
| `sequentialthinking` | Multi-step reasoning, planning |

---

## Agents

Use the Task tool with `subagent_type` parameter:

| Agent | When to Use |
|-------|-------------|
| `Explore` | Quick codebase exploration, find files/patterns |
| `Plan` | Design implementation strategies |
| `Bash` | Git operations, command execution |
| `general-purpose` | Multi-step tasks, complex research |
| `feature-dev:code-architect` | Design feature architectures |
| `feature-dev:code-reviewer` | Review code for bugs, security |
| `feature-dev:code-explorer` | Deep analysis of existing features |
| `code-simplifier:code-simplifier` | Simplify and refine code |

---

## Skills (Slash Commands)

Use the Skill tool to invoke:

| Skill | When to Use |
|-------|-------------|
| `/feature-dev` | Guided feature development |
| `/frontend-design` | Create distinctive UI components |
| `/vercel:deploy` | Deploy to Vercel |
| `/vercel:setup` | Configure Vercel |
| `/vercel:logs` | View deployment logs |

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

## Key Routes

| Path | Description |
|------|-------------|
| `/` | Dashboard home with stats, activity |
| `/people` | People table/gallery, CSV import/export, tags |
| `/people/appointments` | People appointments calendar |
| `/dates` | Unified dates/appointments view |
| `/documents` | Document list with filters, status |
| `/documents/[id]` | Document detail, versions, similar docs |
| `/documents/review` | Review queue |
| `/documents/quality` | Quality metrics dashboard |
| `/documents/calendar` | Document dates calendar |
| `/tasks` | Team kanban board (Realtime) |
| `/settings` | User profile, system alerts |
| `/admin` | Admin dashboard (2FA protected) |
| `/admin/login` | Admin OTP login |
| `/admin/organizations` | Org management, join codes |
| `/admin/users` | Users overview |
| `/admin/alerts` | System alerts management |
| `/admin/processing` | Document queue monitoring |
| `/admin/processing/failed` | Dead letter queue |
| `/admin/activity` | Admin audit log |

---

## Authentication Flows

### User Authentication
1. Sign up with email + password + organization code
2. Email confirmation via Supabase
3. Login triggers device verification (Supabase OTP)
4. Device trusted after successful verification
5. Subsequent logins skip OTP if device trusted

### Admin Authentication
1. Navigate to `/admin/login`
2. Enter ADMIN_EMAIL to receive OTP via Supabase
3. Enter 6-digit code
4. 24-hour admin session created
5. Session validated on protected routes

---

## Code Patterns

### Server Actions
- All mutations use Server Actions (not API routes)
- Validation with Zod schemas
- `revalidatePath()` for cache invalidation

### Components
- Client components for interactivity (`"use client"`)
- Server Components for data fetching
- Suspense boundaries for loading states
- Toast notifications via Sonner

### Naming Conventions
- 6-char alphanumeric IDs (not sequential)
- "People" terminology (not "Customers")
- Soft deletes with `deleted_at` timestamp

### Code Style
- No emojis unless requested
- Minimal comments - self-documenting code
- Icons from lucide-react only
- Badge components for status indicators
- Relative timestamps (formatDistanceToNow)
- Optimistic updates for better UX

---

## Document Types Supported

Invoice, Receipt, Purchase Order, Bank Statement, Credit Card Statement, Check, Contract, NDA, W-2, 1099, Pay Stub, Insurance Document, Healthcare Document, Real Estate Document, Shipping Document, and 25+ more defined in `src/lib/ocr/types.ts`.

---

## Troubleshooting

### Build Errors
- Missing shadcn: `npx shadcn@latest add <component> -y`
- Type errors: Regenerate `database.ts`

### Database Issues
- Check RLS: `mcp__plugin_supabase_supabase__get_advisors`
- View logs: `mcp__plugin_supabase_supabase__get_logs`

### Realtime Not Working
- Add to publication: `ALTER PUBLICATION supabase_realtime ADD TABLE <table>`

### Document Processing Failures
- Check `document_queue` for DLQ items (status = 'dead_letter')
- View processing metrics in admin panel
- Verify API keys are valid
