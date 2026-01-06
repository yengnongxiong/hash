"use client";

import { Customer } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
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
            {customer.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
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

        <div className="mt-3 text-xs text-muted-foreground">
          Updated {formatDistanceToNow(new Date(customer.updated_at))}
        </div>
      </CardContent>
    </Card>
  );
}
