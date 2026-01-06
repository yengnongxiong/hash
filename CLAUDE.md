# Hash - B2B Document & Customer Management Platform

## Project Overview

Hash is a B2B SaaS platform for document and customer management with AI-powered OCR extraction. Built for small-to-medium businesses to manage customer relationships, process documents (invoices, contracts, receipts), and collaborate in real-time.

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| MVP (Phases 1-5) | Complete | Core functionality |
| Phase 2 Enhancements | Complete | Advanced features |
| Phase 3 Polish | Complete | UX improvements |

### Recently Completed (This Session)
- **People Tab Rename** - Renamed "Customers" to "People" throughout the app
  - Updated sidebar, command palette, keyboard shortcuts
  - Updated all dialogs, toasts, and labels
- **Customer ID Format** - Changed from CUST-0001 to 6-character random alphanumeric (e.g., "A3B7K2")
  - Auto-generated on create and CSV import
  - Excluded confusing characters (I, O, 0, 1)
- **Gallery Detail Dialog** - Click any person card in gallery view to open editable detail dialog
  - Shows all fields with edit capability
  - Save multiple field changes at once
- **Admin Panel** - Separate `/admin` route with email 2FA authentication
  - Email verification via Resend (6-digit code, 10 min expiry, 24-hour session)
  - System alerts management (create, edit, delete with global/org targeting)
  - Users overview with role badges and registration dates
  - Organizations overview with usage statistics
  - Platform analytics (users, docs, processing stats, document types)
- **Settings alerts read-only** - Business users can view alerts but not create/edit
- **Alert banners** - Display active alerts to all users with dismiss functionality

### Previously Completed
- Advanced document filters (search, status, type, date range)
- Bulk CSV import for customers with template download
- Document dates calendar view (/documents/calendar)
- CSV export for documents
- Keyboard shortcuts (Cmd+Shift+D/C/A/O/U/W/S for navigation, ? for help)
- Document flags detection after OCR (past due, duplicates, suspicious amounts)
- Document flags UI with resolve functionality
- Mobile responsive sidebar with Sheet/drawer pattern
- Fixed OCR double-logging issue
- Fixed keyboard shortcuts dialog (?) cross-browser compatibility
- Fixed accessibility issues in mobile sidebar

### Database Migrations Required
Run the following migrations in Supabase SQL Editor:
```sql
-- See migrations/create_document_flags.sql
-- See migrations/create_system_alerts.sql
```

### Next Up (Suggestions)
1. **Email notifications** - Appointment reminders, document alerts
2. **Team member management** - Invite/remove users from organization
3. **Role-based permissions** - Admin vs member access
4. **API integrations** - QuickBooks, Xero

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions, Turbopack)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI**: shadcn/ui + Tailwind CSS
- **Tables**: TanStack Table v8
- **OCR**: Mistral AI (pixtral-12b-latest)
- **Drag & Drop**: @hello-pangea/dnd
- **Command Palette**: cmdk

## Supabase Configuration

```
Project ID: bqvemwrgblkvvmshwvie
Region: us-east-1
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant org data |
| `users` | User profiles linked to Supabase Auth |
| `customers` | Customer records with auto-incrementing CUST-#### |
| `documents` | Uploaded docs with auto-incrementing DOC-#### |
| `document_audit_log` | Document activity history |
| `appointments` | Customer appointments |
| `whiteboard_tasks` | Realtime kanban tasks |
| `document_flags` | LLM-detected anomalies |
| `document_dates` | Extracted important dates |
| `task_recommendations` | LLM-generated suggestions |
| `activity_log` | Organization-wide activity |
| `system_alerts` | Maintenance notices (supports global + per-org targeting) |
| `admin_verification_codes` | Email 2FA codes for admin access |
| `admin_sessions` | Verified admin sessions (24-hour validity) |

### Realtime Enabled Tables
- `whiteboard_tasks` - Live collaboration on kanban board

### Key Database Functions
- `user_organization_id()` - Returns current user's org ID for RLS

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # Protected routes (business users)
│   │   ├── customers/         # Customer management
│   │   │   └── appointments/  # Customer appointments (legacy)
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
│   ├── customers/             # Customer components
│   │   ├── appointments/      # Appointment components
│   │   ├── customer-gallery.tsx
│   │   ├── customer-card.tsx
│   │   ├── customers-view.tsx
│   │   └── csv-import-dialog.tsx      # Bulk CSV import
│   ├── documents/             # Document components
│   │   ├── documents-view.tsx         # Main view with filters
│   │   ├── document-calendar.tsx      # Calendar view component
│   │   ├── document-list.tsx
│   │   ├── document-upload.tsx
│   │   ├── document-flags.tsx         # Flag display component
│   │   ├── document-flags-wrapper.tsx # Client wrapper for flags
│   │   ├── document-audit-log.tsx     # Activity timeline
│   │   └── extracted-data-view.tsx
│   ├── dashboard/             # Dashboard components
│   │   ├── activity-feed.tsx  # Realtime activity stream
│   │   ├── whiteboard.tsx
│   │   ├── whiteboard-column.tsx
│   │   └── whiteboard-task.tsx
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx        # Collapsible + mobile drawer
│   │   ├── header.tsx         # Theme toggle, search, mobile menu
│   │   ├── command-palette.tsx
│   │   ├── keyboard-shortcuts-dialog.tsx  # Shortcuts help
│   │   └── dashboard-shell.tsx
│   ├── admin/                 # Admin panel components
│   │   ├── admin-dashboard.tsx
│   │   ├── admin-alerts-manager.tsx
│   │   └── admin-page-wrapper.tsx
│   ├── settings/              # Settings components
│   │   └── system-alerts-manager.tsx  # Read-only alerts view
│   ├── data-table/            # Reusable table components
│   └── ui/                    # shadcn/ui components
├── contexts/
│   ├── theme-context.tsx      # Dark/light mode
│   └── sidebar-context.tsx    # Collapsed state
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser client
│   │   ├── server.ts          # Server client
│   │   └── middleware.ts      # Auth middleware
│   ├── admin/
│   │   └── auth.ts            # Admin 2FA auth utilities
│   ├── email/
│   │   └── resend.ts          # Resend email service
│   ├── ocr/
│   │   ├── mistral.ts         # OCR extraction
│   │   └── detect-flags.ts    # Document flag detection
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   └── use-keyboard-shortcuts.ts  # Global keyboard shortcuts
│   ├── export.ts              # CSV export utility
│   └── utils/
│       └── format.ts          # Formatting helpers
└── types/
    └── database.ts            # Supabase types
```

## Key Features

### People Management (formerly Customers)
- **Auto-ID**: 6-character random alphanumeric (e.g., "A3B7K2", "9X4M2P")
- **Global search**: Searches across name, company, email, phone, address, notes
- **Inline editing**: Click any cell to edit in table view
- **Gallery view**: Card-based grid layout with detail dialog on click
- **Tags**: Array-based tagging system
- **Appointments**: Linked calendar and table view
- **Bulk CSV import**: Import people from CSV with validation
- **CSV export**: Export filtered people data

### Document Management
- **Auto-numbering**: DOC-0001, DOC-0002, etc.
- **OCR extraction**: Mistral AI extracts structured data
- **File types**: PDF, images
- **Status tracking**: pending → processing → completed/failed
- **Person linking**: Associate documents with people
- **Advanced filters**: Search, status, type, date range filters
- **Calendar view**: View due dates, expirations, important dates
- **Document flags**: LLM-detected anomalies (past due, duplicates)
- **Audit log**: Track document activity history
- **CSV export**: Export filtered document data

### Whiteboard
- **Kanban columns**: To Do, In Progress, Done
- **Realtime sync**: Supabase Realtime subscriptions
- **Drag & drop**: @hello-pangea/dnd
- **Optimistic updates**: Instant UI feedback

### UI/UX
- **Theme**: Dark/light mode with localStorage persistence
- **Sidebar**: Collapsible (icons only when collapsed)
- **Command palette**: Cmd+K for navigation and actions
- **CSV export**: Export filtered table data

## Code Patterns

### Server Actions Pattern
```typescript
// src/app/(dashboard)/customers/actions.ts
"use server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  // ... validation and insert
  revalidatePath("/customers");
  return { success: true };
}
```

### Realtime Subscription Pattern
```typescript
// Subscribe to changes
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel("changes")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "whiteboard_tasks",
    }, (payload) => {
      // Handle INSERT, UPDATE, DELETE
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

### Optimistic Update Pattern
```typescript
// Update UI immediately, then sync
const handleMove = async (taskId: string, newStatus: string) => {
  // Optimistic update
  setTasks(prev => prev.map(t =>
    t.id === taskId ? { ...t, status: newStatus } : t
  ));

  // Server sync
  const result = await updateTaskStatus(taskId, newStatus);
  if (result.error) {
    toast.error("Failed to move task");
    // Realtime will restore correct state
  }
};
```

### Context Provider Pattern
```typescript
// src/contexts/theme-context.tsx
"use client";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme;
    if (stored) setTheme(stored);
  }, []);

  // ... toggle logic
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://bqvemwrgblkvvmshwvie.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
MISTRAL_API_KEY=<mistral-key>
ADMIN_EMAIL=yengnongxiong@gmail.com    # Email allowed to access admin panel
RESEND_API_KEY=<resend-key>             # Resend.com API key for admin 2FA emails
```

## MCP Tools Usage

### Supabase MCP
Use for database operations:
```
mcp__plugin_supabase_supabase__execute_sql - Run queries
mcp__plugin_supabase_supabase__apply_migration - Schema changes
mcp__plugin_supabase_supabase__list_tables - View schema
mcp__plugin_supabase_supabase__get_logs - Debug issues
```

### Playwright MCP
Use for testing:
```
mcp__plugin_playwright_playwright__browser_navigate - Go to URL
mcp__plugin_playwright_playwright__browser_snapshot - Get page state
mcp__plugin_playwright_playwright__browser_click - Click elements
mcp__plugin_playwright_playwright__browser_type - Fill inputs
mcp__plugin_playwright_playwright__browser_take_screenshot - Visual verification
```

### Context7 MCP
Use for documentation lookups:
```
mcp__plugin_context7_context7__resolve-library-id - Find library ID
mcp__plugin_context7_context7__query-docs - Get up-to-date docs
```

## Available Skills

- `/feature-dev` - Guided feature development with architecture focus
- `/frontend-design` - Create production-grade UI components
- `/vercel:deploy` - Deploy to Vercel
- `/vercel:logs` - View deployment logs

## Available Agents

- `feature-dev:code-architect` - Design feature architectures
- `feature-dev:code-reviewer` - Review code for issues
- `feature-dev:code-explorer` - Analyze codebase patterns
- `Explore` - Quick codebase exploration
- `Plan` - Design implementation strategies

## Common Commands

```bash
# Development
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint check

# Supabase (if using CLI)
npx supabase gen types typescript --project-id bqvemwrgblkvvmshwvie > src/types/database.ts
```

## Testing Notes

The app runs on `http://localhost:3000`. Test accounts:
- Email: test@example.com (or use magic link)

Key pages to test:
- `/customers` - Customer table with gallery view, CSV import/export
- `/customers/appointments` - Appointments with calendar
- `/documents` - Document list with filters and OCR status
- `/documents/calendar` - Document dates calendar view
- `/whiteboard` - Realtime kanban board
- `/settings` - User profile + read-only system alerts
- `/admin` - Admin dashboard (requires email 2FA, ADMIN_EMAIL only)
- `/admin/alerts` - System alerts management
- `/admin/analytics` - Platform statistics

## Future Development Ideas

### Priority 1 (Complete)
- [x] Document flags UI - Display LLM-detected anomalies (past due, duplicates) ✓
- [x] Audit log timeline - Visual document history in detail page ✓
- [x] Activity feed - Dashboard realtime activity stream ✓
- [x] Keyboard shortcuts - Global shortcuts for power users ✓
- [x] Mobile responsive improvements ✓

### Priority 2 (Complete)
- [x] Document dates calendar - Calendar view of due dates, expirations ✓
- [x] Advanced search filters - Date ranges, status filters ✓
- [x] Bulk CSV import - Import customers from CSV ✓
- [x] CSV export - Export documents and customers ✓

### Priority 3 (Next Up)
- [ ] Recommendations bar - Bottom bar with LLM-generated suggestions
- [ ] Dashboard widgets - Customizable widget layout
- [ ] Email notifications - Appointment reminders, document alerts
- [ ] Team member management - Invite/remove users
- [ ] Role-based permissions - Admin vs member access
- [ ] API integrations (QuickBooks, Xero)
- [ ] Custom document templates

## Troubleshooting

### Build Errors
- Missing shadcn components: `npx shadcn@latest add <component> -y`
- Type errors: Check `src/types/database.ts` matches schema

### Database Issues
- Check RLS policies: `mcp__plugin_supabase_supabase__get_advisors`
- View logs: `mcp__plugin_supabase_supabase__get_logs`

### Realtime Not Working
- Ensure table added to publication: `ALTER PUBLICATION supabase_realtime ADD TABLE <table>`
- Check Supabase dashboard for realtime status

## Code Style Guidelines

1. **Use Server Actions** for mutations (not API routes)
2. **Optimistic updates** for better UX
3. **Toast notifications** for user feedback (sonner)
4. **Relative timestamps** for dates (formatDistanceToNow)
5. **Badge components** for status indicators
6. **Icons from lucide-react** only
7. **No emojis** unless user requests
8. **Minimal comments** - code should be self-documenting
