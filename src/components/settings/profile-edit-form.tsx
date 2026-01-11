"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Shield } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "@/app/(dashboard)/settings/actions";

interface ProfileEditFormProps {
  profile: {
    id: string;
    name: string | null;
    email: string;
    role: string | null;
  };
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setHasChanges(value.trim() !== (profile.name || "").trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Name must be 100 characters or less");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", trimmedName);

      const result = await updateProfile(formData);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated successfully");
        setHasChanges(false);
        router.refresh();
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>
          Update your personal information. Changes will reflect across the entire application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your display name"
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown throughout the app including task assignments, activity feeds, and more.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <Badge variant="outline" className="shrink-0">Read-only</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Email changes are not supported at this time.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Role
            </Label>
            <div className="flex items-center gap-2">
              <Badge variant={getRoleBadgeVariant(profile.role)} className="capitalize">
                {profile.role || "member"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Role is managed by your organization admin
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? "You have unsaved changes" : "No changes to save"}
            </p>
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
