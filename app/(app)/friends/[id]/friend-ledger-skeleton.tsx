import { Separator } from "@/components/ui/separator";

export function FriendLedgerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted/50" />
            <div className="h-7 w-40 rounded bg-muted/50" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-muted/50" />
            <div className="h-4 w-44 rounded bg-muted/50" />
          </div>
        </div>
        <div className="h-9 w-28 rounded-md bg-muted/50" />
      </div>

      {/* Net Balance */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="h-4 w-24 rounded bg-muted/50" />
        <div className="h-7 w-56 rounded bg-muted/50" />
      </div>

      <Separator />

      {/* Ledger */}
      <div>
        <div className="mb-4 h-6 w-20 rounded bg-muted/50" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-l-4 border-l-muted p-3"
            >
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 rounded bg-muted/50" />
                <div className="h-4 w-24 rounded bg-muted/50" />
              </div>
              <div className="h-5 w-16 rounded bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
