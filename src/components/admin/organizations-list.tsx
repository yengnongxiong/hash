"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Users, FileText, UserCircle, Clock, Search } from "lucide-react";
import { format } from "date-fns";
import { OrganizationCodeActions } from "./organization-code-actions";

interface Organization {
  id: string;
  name: string;
  org_code: string | null;
  created_at: string;
  userCount: number;
  customerCount: number;
  documentCount: number;
}

interface OrganizationsListProps {
  organizations: Organization[];
}

export function OrganizationsList({ organizations }: OrganizationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrgs = organizations.filter((org) => {
    const query = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(query) ||
      (org.org_code?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{organizations.length} Organizations</CardTitle>
            <CardDescription className="text-slate-400">
              Share organization codes with businesses so their users can sign up
            </CardDescription>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{org.name}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      Created {format(new Date(org.created_at), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>

                {/* Organization Code Display */}
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2">
                    <p className="text-xs text-slate-400 mb-0.5">Invite Code</p>
                    <p className="font-mono text-lg font-bold text-emerald-400 tracking-widest">
                      {org.org_code || "N/A"}
                    </p>
                  </div>
                  <OrganizationCodeActions
                    orgId={org.id}
                    orgCode={org.org_code}
                    orgName={org.name}
                    userCount={org.userCount}
                    customerCount={org.customerCount}
                    documentCount={org.documentCount}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-slate-400">Users:</span>
                  <Badge variant="secondary">{org.userCount}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4 text-cyan-500" />
                  <span className="text-slate-400">People:</span>
                  <Badge variant="secondary">{org.customerCount}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span className="text-slate-400">Documents:</span>
                  <Badge variant="secondary">{org.documentCount}</Badge>
                </div>
              </div>
            </div>
          ))}

          {filteredOrgs.length === 0 && searchQuery && (
            <div className="text-center py-8 text-slate-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No organizations match &quot;{searchQuery}&quot;</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}

          {organizations.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No organizations yet</p>
              <p className="text-sm">Create your first organization to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
