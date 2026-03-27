import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="rounded-lg border">
    <div className="p-3 border-b bg-muted/30">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="p-3 border-b last:border-0">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-2 w-full" />
      </div>
    ))}
  </div>
);
