# Hash - B2B Document & Customer Management Platform

## Project Overview

Hash is a B2B SaaS platform for document and customer management with AI-powered OCR extraction. Built for small-to-medium businesses to manage customer relationships, process documents (invoices, contracts, receipts), and collaborate in real-time.

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| MVP (Phases 1-5) | Complete | Core functionality |
| Phase 2 Enhancements | Complete | Advanced features |

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
| `system_alerts` | Maintenance notices |

### Realtime Enabled Tables
- `whiteboard_tasks` - Live collaboration on kanban board

### Key Database Functions
- `user_organization_id()` - Returns current user's org ID for RLS

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/           # Protected routes
│   │   ├── customers/         # Customer management
│   │   │   └── appointments/  # Customer appointments
│   │   ├── documents/         # Document management
│   │   │   ├── [id]/          # Document detail
│   │   │   └── upload/        # Upload page
│   │   ├── whiteboard/        # Team kanban board
│   │   ├── settings/          # User settings
│   │   └── page.tsx           # Dashboard home
│   ├── auth/                  # Auth callbacks
│   ├── login/                 # Login page
│   └── signup/                # Signup page
├── components/
│   ├── customers/             # Customer components
│   │   ├── appointments/      # Appointment components
│   │   ├── customer-gallery.tsx
│   │   ├── customer-card.tsx
│   │   └── customers-view.tsx
│   ├── documents/             # Document components
│   │   ├── document-list.tsx
│   │   ├── document-upload.tsx
│   │   └── extracted-data-view.tsx
│   ├── dashboard/             # Dashboard components
│   │   ├── whiteboard.tsx
│   │   ├── whiteboard-column.tsx
│   │   └── whiteboard-task.tsx
│   ├── layout/                # Layout components
│   │   ├── sidebar.tsx        # Collapsible sidebar
│   │   ├── header.tsx         # Theme toggle, search
│   │   ├── command-palette.tsx
│   │   └── dashboard-shell.tsx
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
│   ├── ocr/
│   │   └── mistral.ts         # OCR extraction
│   ├── hooks/
│   │   └── use-debounce.ts
│   ├── export.ts              # CSV export utility
│   └── utils/
│       └── format.ts          # Formatting helpers
└── types/
    └── database.ts            # Supabase types
```

## Key Features

### Customer Management
- **Auto-numbering**: CUST-0001, CUST-0002, etc.
- **Global search**: Searches across name, company, email, phone, address, notes
- **Inline editing**: Click any cell to edit
- **Gallery view**: Card-based grid layout
- **Tags**: Array-based tagging system
- **Appointments**: Linked calendar and table view

### Document Management
- **Auto-numbering**: DOC-0001, DOC-0002, etc.
- **OCR extraction**: Mistral AI extracts structured data
- **File types**: PDF, images
- **Status tracking**: pending → processing → completed/failed
- **Customer linking**: Associate documents with customers

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
- `/customers` - Customer table with gallery view
- `/customers/appointments` - Appointments with calendar
- `/documents` - Document list with OCR status
- `/whiteboard` - Realtime kanban board

## Future Development Ideas

### Priority 1 (Pending from Phase 2)
- [ ] Document flags UI - Display LLM-detected anomalies (past due, duplicates)
- [ ] Audit log timeline - Visual document history in detail page
- [ ] Activity feed - Dashboard realtime activity stream
- [ ] Recommendations bar - Bottom bar with LLM-generated suggestions

### Priority 2 (Future Enhancements)
- [ ] Document dates calendar - Calendar view of due dates, expirations
- [ ] Bulk operations toolbar - Multi-select actions
- [ ] Advanced search filters - Date ranges, status filters
- [ ] Dashboard widgets - Customizable widget layout
- [ ] Email notifications - Appointment reminders, document alerts
- [ ] Team member management - Invite/remove users
- [ ] Role-based permissions - Admin vs member access

### Priority 3 (Nice to Have)
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts guide
- [ ] Data import/export (bulk CSV)
- [ ] API integrations (QuickBooks, Xero)
- [ ] Custom document templates
- [ ] Audit compliance reports

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
