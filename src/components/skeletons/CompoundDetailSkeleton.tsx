import { Skeleton } from "@/components/ui/skeleton";

export function CompoundDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="app-top-padding" />
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back arrow */}
          <Skeleton className="w-9 h-9 rounded-full" />
          {/* Title */}
          <Skeleton className="h-5 w-36 rounded-md" />
          {/* Edit icon */}
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Two stat cards side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 space-y-2 bg-muted/50">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
          <div className="rounded-xl p-4 space-y-2 bg-muted/50">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
        </div>

        {/* Three info chips row */}
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded-full" />
          <Skeleton className="h-8 flex-1 rounded-full" />
          <Skeleton className="h-8 flex-1 rounded-full" />
        </div>

        {/* Chart card */}
        <div className="rounded-xl bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <Skeleton className="h-[160px] w-full rounded-lg" />
        </div>

        {/* Dose history section */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 rounded" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl bg-muted/50 p-4"
            >
              {/* Syringe icon placeholder */}
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              {/* Text lines */}
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              {/* Checkbox placeholder */}
              <Skeleton className="w-6 h-6 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
