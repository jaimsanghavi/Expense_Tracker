"use client";

import { useTransition } from "react";
import { User, Mail, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "./actions";

interface ProfileFormProps {
  email: string;
  displayName: string;
  monthlyBudgetPaise: number | null;
}

export function ProfileForm({ email, displayName, monthlyBudgetPaise }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await updateProfile(formData);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={displayName}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_budget">Monthly Budget (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthly_budget"
                  name="monthly_budget"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={monthlyBudgetPaise ? (monthlyBudgetPaise / 100).toString() : ""}
                  placeholder="e.g. 50000"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Set a monthly spending limit to track your budget
              </p>
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
