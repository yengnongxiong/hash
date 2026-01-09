"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Kanban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "People", href: "/people", icon: Users },
  { name: "Dates", href: "/dates", icon: Calendar },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Whiteboard", href: "/whiteboard", icon: Kanban },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({ collapsed, toggle, onNavigate, hideCollapseButton }: {
  collapsed: boolean;
  toggle: () => void;
  onNavigate?: () => void;
  hideCollapseButton?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className={cn("border-b flex items-center", collapsed ? "p-3 justify-center" : "p-6")}>
        <Link href="/dashboard" onClick={onNavigate}>
          <h1 className={cn("font-bold transition-all", collapsed ? "text-lg" : "text-xl")}>
            {collapsed ? "H" : "Hash"}
          </h1>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.name}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>
      {!hideCollapseButton && (
        <div className={cn("p-3 border-t", collapsed && "flex justify-center")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn("w-full", collapsed && "w-auto px-2")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Main navigation menu for the application
        </SheetDescription>
        <div className="flex flex-col h-full bg-muted/30">
          <SidebarContent
            collapsed={false}
            toggle={() => {}}
            onNavigate={() => setOpen(false)}
            hideCollapseButton
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex border-r bg-muted/30 h-screen sticky top-0 flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} toggle={toggle} />
      </aside>
    </TooltipProvider>
  );
}
