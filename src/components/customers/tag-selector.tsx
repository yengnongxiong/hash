"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { PersonTag } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, X, Search } from "lucide-react";

interface TagSelectorProps {
  personTags: PersonTag[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagSelector({
  personTags,
  selectedTags,
  onChange,
  placeholder = "Select tags...",
  disabled = false,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle wheel events manually to ensure scrolling works inside dialogs
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    // Scroll the container
    container.scrollTop += e.deltaY;

    // Prevent the event from bubbling up to parent (Dialog)
    e.stopPropagation();
  }, []);

  const filteredTags = useMemo(() => {
    if (!search.trim()) return personTags;
    return personTags.filter((tag) =>
      tag.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [personTags, search]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearch(""); // Clear search when closing
    }
  };

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const handleRemoveTag = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    onChange(selectedTags.filter((t) => t !== tagName));
  };

  const getTagColor = (tagName: string): string => {
    return personTags.find((t) => t.name === tagName)?.color || "bg-gray-500";
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-auto min-h-10 py-2"
        >
          <div className="flex flex-wrap gap-1 flex-1 min-w-0 overflow-hidden">
            {selectedTags.length > 0 ? (
              selectedTags.map((tagName) => (
                <span
                  key={tagName}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white max-w-[150px]"
                  style={{
                    backgroundColor: `var(--tag-color)`,
                  }}
                >
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", getTagColor(tagName))}
                  />
                  <span className="text-foreground truncate">{tagName}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleRemoveTag(e, tagName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRemoveTag(e as unknown as React.MouseEvent, tagName);
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 max-h-[300px] overflow-hidden" align="start">
        {personTags.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No tags available. Create tags using the Tags button.
          </div>
        ) : (
          <div className="flex flex-col max-h-[300px]">
            {/* Search input */}
            <div className="p-2 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            {/* Tags list - scrollable */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 overscroll-contain scrollbar-thin"
              onWheel={handleWheel}
            >
              {filteredTags.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground text-center">
                  No tags found
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer min-w-0"
                    onClick={() => handleToggleTag(tag.name)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.name)}
                      onCheckedChange={() => handleToggleTag(tag.name)}
                      className="shrink-0"
                    />
                    <div className={cn("w-3 h-3 rounded-full shrink-0", tag.color)} />
                    <span className="text-sm flex-1 w-0 truncate">{tag.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Display component for showing colored tags (read-only)
interface ColoredTagsDisplayProps {
  tags: string[];
  personTags: PersonTag[];
  maxDisplay?: number;
  size?: "sm" | "default";
}

export function ColoredTagsDisplay({
  tags,
  personTags,
  maxDisplay = 3,
  size = "default",
}: ColoredTagsDisplayProps) {
  const getTagColor = (tagName: string): string => {
    return personTags.find((t) => t.name === tagName)?.color || "bg-gray-500";
  };

  const displayTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 overflow-hidden">
      {displayTags.map((tagName, index) => (
        <span
          key={`${tagName}-${index}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full font-medium max-w-[120px]",
            size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"
          )}
        >
          <span
            className={cn(
              "rounded-full shrink-0",
              getTagColor(tagName),
              size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
            )}
          />
          <span className="text-foreground truncate">{tagName}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className={cn(
          "text-muted-foreground shrink-0",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
