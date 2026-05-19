"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Trash2, FileText, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  updateExpenseReceipt,
  removeExpenseReceipt,
  getReceiptUrl,
} from "./actions";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

interface ReceiptUploadProps {
  expenseId: string;
  userId: string;
  existingPath: string | null;
}

export function ReceiptUpload({
  expenseId,
  userId,
  existingPath,
}: ReceiptUploadProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(existingPath);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WebP, HEIC, and PDF files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("File must be under 5MB.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function handleUpload() {
    if (!selectedFile) return;
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const filePath = `${userId}/${expenseId}/${selectedFile.name}`;

      // If there's an existing receipt, delete it first
      if (currentPath) {
        await supabase.storage.from("receipts").remove([currentPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const result = await updateExpenseReceipt(expenseId, filePath);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setCurrentPath(filePath);
      setSelectedFile(null);
      setPreview(null);
      setExistingUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemove() {
    if (!currentPath) return;
    setError(null);

    startTransition(async () => {
      const result = await removeExpenseReceipt(expenseId);
      if (result?.error) {
        setError(result.error);
        return;
      }

      setCurrentPath(null);
      setExistingUrl(null);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleViewReceipt() {
    if (!currentPath) return;

    startTransition(async () => {
      const result = await getReceiptUrl(currentPath!);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) {
        setExistingUrl(result.url);
      }
    });
  }

  function clearSelection() {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm font-medium">Receipt</p>

        {/* Existing receipt */}
        {currentPath && !selectedFile && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate flex-1">
                {currentPath.split("/").pop()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewReceipt}
                disabled={isPending}
              >
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {existingUrl && (
              <div className="rounded-lg border overflow-hidden">
                {currentPath.match(/\.(jpe?g|png|webp|heic)$/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={existingUrl}
                    alt="Receipt"
                    className="max-h-64 w-full object-contain bg-muted"
                  />
                ) : (
                  <a
                    href={existingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-4 text-sm text-blue-600 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    Open PDF in new tab
                  </a>
                )}
              </div>
            )}

            <div>
              <label className="cursor-pointer text-sm text-muted-foreground hover:text-foreground underline">
                Replace receipt
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* No receipt — file picker */}
        {!currentPath && !selectedFile && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Click to upload a receipt</span>
            <span className="text-xs">JPG, PNG, WebP, HEIC, or PDF — max 5MB</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}

        {/* Selected file preview */}
        {selectedFile && (
          <div className="space-y-3">
            {preview ? (
              <div className="rounded-lg border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 w-full object-contain bg-muted"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm truncate">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1 h-3 w-3" />
                    Upload
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
