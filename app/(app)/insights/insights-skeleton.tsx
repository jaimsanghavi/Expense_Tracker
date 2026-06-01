import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Mirrors the InsightsView layout so streamed content swaps in without shifting.
export function InsightsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-52 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            </CardHeader>
            <CardContent className="relative">
              <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Spending Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted/70" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/50" />
        </CardContent>
      </Card>

      {/* Category + Payment Method Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, cardIdx) => (
          <Card key={cardIdx}>
            <CardHeader className="pb-3">
              <div className="h-5 w-36 animate-pulse rounded bg-muted/70" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
                        <div className="h-4 w-24 animate-pulse rounded bg-muted/70" />
                      </div>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Month-over-Month */}
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-44 animate-pulse rounded bg-muted/70" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-12 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-14 animate-pulse rounded bg-muted/70" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
