"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";
import { createFriend, updateFriend, deleteFriend, getFriend } from "./actions";

type Friend = {
  friend_id: string;
  name: string;
  net_owed_to_me_paise: number;
};

type EditingFriend = {
  friend_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  upi_handle: string | null;
};

interface FriendListProps {
  friends: Friend[];
}

export function FriendList({ friends }: FriendListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState<EditingFriend | null>(null);

  const sorted = [...friends].sort(
    (a, b) =>
      Math.abs(b.net_owed_to_me_paise) - Math.abs(a.net_owed_to_me_paise)
  );

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createFriend(formData);
      if (result?.success) {
        toast.success("Friend added");
        setAddOpen(false);
        router.refresh();
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  async function handleUpdate(formData: FormData) {
    if (!editingFriend) return;
    startTransition(async () => {
      const result = await updateFriend(editingFriend.friend_id, formData);
      if (result?.success) {
        toast.success("Friend updated");
        setEditOpen(false);
        setEditingFriend(null);
        router.refresh();
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  function handleEdit(friend: Friend) {
    startTransition(async () => {
      try {
        const full = await getFriend(friend.friend_id);
        setEditingFriend({
          friend_id: full.id,
          name: full.name,
          phone: full.phone ?? null,
          email: full.email ?? null,
          upi_handle: full.upi_handle ?? null,
        });
        setEditOpen(true);
      } catch {
        toast.error("Couldn't load friend details");
      }
    });
  }

  async function handleDelete(id: string) {
    if (
      !confirm("Remove this friend? Their share history on past expenses stays.")
    )
      return;
    startTransition(async () => {
      try {
        await deleteFriend(id);
        toast.success("Friend removed");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't remove friend");
      }
    });
  }

  function balanceDisplay(paise: number) {
    if (paise > 0) {
      return (
        <span className="text-emerald-500 font-medium text-sm">
          owes you {formatINR(paise)}
        </span>
      );
    }
    if (paise < 0) {
      return (
        <span className="text-red-400 font-medium text-sm">
          you owe {formatINR(Math.abs(paise))}
        </span>
      );
    }
    return <span className="text-muted-foreground text-sm">settled up ✓</span>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage split expenses</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Friend
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
              <DialogDescription>
                Add a new friend to split expenses with.
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upi_handle">UPI Handle</Label>
                <Input id="upi_handle" name="upi_handle" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding..." : "Add Friend"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 opacity-50" />
          </div>
          <p className="font-medium">No friends yet</p>
          <p className="text-sm mt-1">Add a friend to start splitting expenses</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((friend) => (
            <div
              key={friend.friend_id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-all duration-200 hover:bg-muted/50 hover:border-primary/20"
            >
              <button
                className="flex-1 text-left flex items-center gap-3"
                onClick={() => router.push(`/friends/${friend.friend_id}`)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{friend.name}</div>
                  <div className="text-sm">
                    {balanceDisplay(friend.net_owed_to_me_paise)}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(friend)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(friend.friend_id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Friend</DialogTitle>
            <DialogDescription>
              Update your friend&apos;s details.
            </DialogDescription>
          </DialogHeader>
          <form
            action={handleUpdate}
            className="space-y-4"
            key={editingFriend?.friend_id}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={editingFriend?.name ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={editingFriend?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={editingFriend?.email ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-upi">UPI Handle</Label>
              <Input
                id="edit-upi"
                name="upi_handle"
                defaultValue={editingFriend?.upi_handle ?? ""}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
