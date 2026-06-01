"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/category-icon";
import { IconPicker } from "@/components/icon-picker";
import { createCategory, updateCategory, deleteCategory } from "./actions";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

export function CategoryList({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [isPending, startTransition] = useTransition();

  function handleEdit(category: Category) {
    setEditing(category);
    setSelectedIcon(category.icon ?? "");
    setSelectedColor(category.color ?? "#6366f1");
    setDialogOpen(true);
  }

  function handleAdd() {
    setEditing(null);
    setSelectedIcon("");
    setSelectedColor("#6366f1");
    setDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      let result;
      if (editing) {
        result = await updateCategory(editing.id, formData);
      } else {
        result = await createCategory(formData);
      }

      if (!result?.error) {
        toast.success(editing ? "Category updated" : "Category added");
        setDialogOpen(false);
        setEditing(null);
        // Refresh list by re-fetching (relies on revalidatePath on server)
        const { getCategories } = await import("./actions");
        const updated = await getCategories();
        setCategories(updated);
      } else {
        toast.error("Couldn't save category");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    startTransition(async () => {
      try {
        await deleteCategory(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success("Category deleted");
      } catch {
        toast.error("Couldn't delete category");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button size="sm" onClick={handleAdd} />}>
            <Plus className="size-4 mr-1" />
            Add Category
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Category" : "New Category"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update the category details below."
                  : "Add a new expense category."}
              </DialogDescription>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  placeholder="e.g. Food & Dining"
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-8 gap-2">
                  {[
                    "#ef4444", "#f97316", "#f59e0b", "#eab308",
                    "#84cc16", "#22c55e", "#10b981", "#14b8a6",
                    "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
                    "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
                    "#f43f5e", "#fb923c", "#78716c", "#6b7280",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`h-7 w-7 rounded-full transition-all ${
                        selectedColor === c
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input type="hidden" name="color" value={selectedColor} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Saving..."
                    : editing
                      ? "Update"
                      : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No categories yet. Add one to get started.
        </p>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon icon={category.icon} color={category.color} size="md" />
                <span className="text-sm font-medium">{category.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(category)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
