"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Building2, Clock, Search, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { deleteUserAdmin } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  organizations: { name: string } | null;
}

interface UsersListProps {
  users: User[];
  adminEmail: string;
}

export function UsersList({ users, adminEmail }: UsersListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      (user.name?.toLowerCase().includes(query) ?? false) ||
      (user.organizations?.name.toLowerCase().includes(query) ?? false)
    );
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;

    startDeleteTransition(async () => {
      const result = await deleteUserAdmin(userToDelete.id);
      if (result.success) {
        toast.success(`User "${userToDelete.name || userToDelete.email}" deleted`);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    });
  };

  const isAdmin = (email: string) => email.toLowerCase() === adminEmail.toLowerCase();

  return (
    <>
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{users.length} Users</CardTitle>
              <CardDescription className="text-slate-400">
                All registered users across organizations
              </CardDescription>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {(user.name || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name || "No name"}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-slate-500" />
                      <span className="text-sm text-slate-400">
                        {user.organizations?.name || "No organization"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={user.role === "owner" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {user.role}
                  </Badge>
                  {!isAdmin(user.email) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                      onClick={() => handleDeleteClick(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {isAdmin(user.email) && (
                    <Badge variant="outline" className="text-primary border-primary">
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && searchQuery && (
              <div className="text-center py-8 text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users match &quot;{searchQuery}&quot;</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}

            {users.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this user?
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <p className="text-white font-medium">{userToDelete.name || "No name"}</p>
              <p className="text-slate-400 text-sm">{userToDelete.email}</p>
              <p className="text-slate-500 text-sm">
                Organization: {userToDelete.organizations?.name || "None"}
              </p>
            </div>
          )}
          <div className="text-sm text-slate-400 space-y-1">
            <p>This action will:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>Remove the user from the platform</li>
              <li>Keep their created content (marked as &quot;Deleted User&quot;)</li>
              <li>This cannot be undone</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
