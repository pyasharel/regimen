import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MainHeader } from "@/components/MainHeader";

export function ProgressScreenSkeleton() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
      <div className="flex-1 min-h-0 scroll-container pb-24">
        <MainHeader title="Progress" />
        <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          {/* Metric tabs */}
          <div className="flex gap-2 border-b border-border/50 pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-14" />
            ))}
          </div>

          {/* Chart area */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>

          {/* Photos section */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
