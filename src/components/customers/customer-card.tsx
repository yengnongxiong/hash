"use client";

import { Customer, PersonTag, CustomerWithUserInfo } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Mail, Phone, MapPin, Eye } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";
import { ColoredTagsDisplay } from "./tag-selector";
import { cn } from "@/lib/utils";

interface CustomerCardProps {
  customer: CustomerWithUserInfo;
  personTags: PersonTag[];
  onClick: () => void;
  selected?: boolean;
  onSelect?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CustomerCard({ customer, personTags, onClick, selected = false, onSelect }: CustomerCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-colors h-full flex flex-col relative group",
        selected && "ring-2 ring-primary"
      )}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div
          className={cn(
            "absolute top-3 left-3 z-10 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            className="bg-background"
          />
        </div>
      )}
      <CardContent className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className={cn("h-10 w-10 shrink-0", onSelect && "ml-6")}>
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{customer.name}</p>
              {customer.customer_number && (
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {customer.customer_number}
                </Badge>
              )}
            </div>
            {customer.company && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{customer.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="mt-3 space-y-1.5 flex-1">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {customer.tags && customer.tags.length > 0 && (
          <div className="mt-3">
            <ColoredTagsDisplay
              tags={customer.tags}
              personTags={personTags}
              maxDisplay={3}
              size="sm"
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
          <div className="flex flex-col text-xs text-muted-foreground min-w-0 flex-1">
            <span className="truncate">
              Created {formatDistanceToNow(new Date(customer.created_at))}
            </span>
            <span className="truncate">
              Updated {formatDistanceToNow(new Date(customer.updated_at))}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
