"use client";

import { Customer } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Phone, MapPin, Eye } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/format";

interface CustomerCardProps {
  customer: Customer;
  onClick: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CustomerCard({ customer, onClick }: CustomerCardProps) {
  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
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
                <Building2 className="h-3 w-3" />
                <span className="truncate">{customer.company}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
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

        {customer.tags && customer.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {customer.tags.slice(0, 3).map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {customer.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{customer.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(new Date(customer.updated_at))}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
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
