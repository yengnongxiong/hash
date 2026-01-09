# Hash - B2B Document & People Management Platform

## Quick Context

**What this is**: B2B SaaS for document/people management with AI OCR. Multi-tenant, Supabase backend.

**User Preferences**:
- Proactively use MCP tools (Supabase, Playwright, Context7, Shadcn, Semgrep) without asking
- Use agents (Explore, Plan, feature-dev) for complex tasks
- Run `npm run build` after changes to verify
- Commit only when explicitly requested
- Admin email: yengnongxiong@gmail.com

**Key Terminology**:
- "People" (not "Customers") - renamed for professionalism
- Person and Document IDs are 6-char alphanumeric (e.g., "A3B7K2"), not sequential


**Current State**: All MVP + Phase 2 + Phase 3 complete. App is functional.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router, Server Actions, Turbopack) |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| UI | shadcn/ui + Tailwind CSS |
| Tables | TanStack Table v8 |
| OCR | Mistral AI (pixtral-12b-latest) |
| Drag & Drop | @hello-pangea/dnd |
| Command Palette | cmdk |
| Email | Resend |

---

## Supabase Configuration

```
Project ID: hbsmvvxdyvzbhetofnbu
Region: us-east-2
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant org data |
| `users` | User profiles linked to Supabase Auth |
| `customers` | People records with 6-char alphanumeric IDs |
| `documents` | Uploaded docs with auto-incrementing DOC-#### |
| `document_audit_log` | Document activity history |
| `appointments` | Customer appointments (supports multi-person via `customer_ids`) |
| `whiteboard_tasks` | Realtime kanban tasks |
| `document_flags` | LLM-detected anomalies |
| `document_dates` | Extracted important dates |
| `task_recommendations` | LLM-generated suggestions |
| `activity_log` | Organization-wide activity |
| `system_alerts` | Maintenance notices (global + per-org targeting) |
| `admin_verification_codes` | Email 2FA codes for admin access |
| `admin_sessions` | Verified admin sessions (24-hour validity) |

### Realtime Enabled
- `whiteboard_tasks` - Live collaboration on kanban board

### Key Database Functions
- `user_organization_id()` - Returns current user's org ID for RLS

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
│   │   │   ├── [id]/          # Document detail
│   │   │   ├── calendar/      # Dates calendar view
│   │   │   └── upload/        # Upload page
│   │   ├── whiteboard/        # Team kanban board (kanban + gallery views)
│   │   ├── settings/          # User settings + read-only system alerts
│   │   └── page.tsx           # Dashboard home
│   ├── admin/                 # Developer admin panel (email 2FA protected)
│   │   ├── page.tsx           # Admin dashboard
│   │   ├── verify/            # 2FA verification page
│   │   ├── alerts/            # System alerts management
│   │   ├── users/             # Users overview
│   │   ├── organizations/     # Organizations overview
│   │   ├── analytics/         # Platform analytics
│   │   └── actions.ts         # Admin server actions
│   ├── auth/                  # Auth callbacks
│   ├── login/                 # Login page
│   └── signup/                # Signup page
├── components/
│   ├── customers/             # People components
│   │   ├── appointments/      # Appointment components
│   │   ├── customer-gallery.tsx
│   │   ├── customer-card.tsx
│   │   ├── customers-view.tsx
│   │   └── csv-import-dialog.tsx
│   ├── documents/             # Document components
│   │   ├── documents-view.tsx
│   │   ├── document-calendar.tsx
│   │   ├── document-list.tsx
│   │   ├── document-upload.tsx
│   │   ├── document-flags.tsx
│   │   ├── document-audit-log.tsx
│   │   └── extracted-data-view.tsx
│   ├── dates/                 # Dates tab components
│   ├── dashboard/             # Dashboard components
│   │   ├── activity-feed.tsx
│   │   ├── whiteboard.tsx
│   │   ├── whiteboard-column.tsx
│   │   └── whiteboard-task.tsx
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── command-palette.tsx
│   │   ├── keyboard-shortcuts-dialog.tsx
│   │   └── dashboard-shell.tsx
│   ├── admin/                 # Admin panel components
│   ├── settings/              # Settings components
│   ├── data-table/            # Reusable table components
│   └── ui/                    # shadcn/ui components
├── contexts/
│   ├── theme-context.tsx      # Dark/light mode
│   └── sidebar-context.tsx    # Collapsed state
├── lib/
│   ├── supabase/              # Supabase clients (client.ts, server.ts, middleware.ts)
│   ├── admin/                 # Admin 2FA auth utilities
│   ├── email/                 # Resend email service
│   ├── ocr/                   # Mistral OCR extraction + flag detection
│   ├── hooks/                 # Custom hooks (use-debounce, use-keyboard-shortcuts)
│   ├── export.ts              # CSV export utility
│   └── utils/                 # Formatting helpers
└── types/
    └── database.ts            # Supabase types
```

---

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://hbsmvvxdyvzbhetofnbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
MISTRAL_API_KEY=<mistral-key>
ADMIN_EMAIL=yengnongxiong@gmail.com
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
| `/people` | People table with gallery view, CSV import/export |
| `/people/appointments` | People appointments with calendar |
| `/dates` | Unified dates/appointments view |
| `/documents` | Document list with filters and OCR status |
| `/documents/calendar` | Document dates calendar view |
| `/whiteboard` | Realtime kanban board |
| `/settings` | User profile + system alerts |
| `/admin` | Admin dashboard (email 2FA, ADMIN_EMAIL only) |

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

---

## Future Ideas

- Email notifications (appointment reminders, document alerts)
- Team member management (invite/remove users)
- Role-based permissions (admin vs member)
- API integrations (QuickBooks, Xero)
- Recommendations bar with LLM suggestions
- Dashboard widgets
