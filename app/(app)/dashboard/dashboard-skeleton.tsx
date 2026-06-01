import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Loading placeholder for the dashboard. Mirrors the layout of DashboardView
// (same `space-y-8` container + grids) so the Suspense fallback paints the page
// shell instantly without shifting once the streamed data arrives.
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-md bg-muted" />
          <div className="h-4 w-32 rounded bg-muted/70" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>

      {/* Primary KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-28 rounded bg-muted/70" />
              <div className="h-8 w-8 rounded-full bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-24 rounded-md bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5 space-y-2">
              <div className="h-3 w-20 rounded bg-muted/70" />
              <div className="h-5 w-28 rounded-md bg-muted" />
              <div className="h-3 w-16 rounded bg-muted/70" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spend Analyzer Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-36 rounded-md bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full rounded-lg bg-muted/50" />
        </CardContent>
      </Card>

      {/* Category Breakdown + Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-5 w-40 rounded-md bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 rounded bg-muted/70" />
                    <div className="h-4 w-16 rounded bg-muted/70" />
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Grid: Recent Activity + Friend Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="h-5 w-32 rounded-md bg-muted" />
              <div className="h-4 w-16 rounded bg-muted/70" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center justify-between px-2 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-32 rounded bg-muted/70" />
                        <div className="h-3 w-20 rounded bg-muted/70" />
                      </div>
                    </div>
                    <div className="h-4 w-16 rounded bg-muted/70" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
