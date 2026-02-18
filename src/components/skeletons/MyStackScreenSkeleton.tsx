import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MainHeader } from "@/components/MainHeader";

export function MyStackScreenSkeleton() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
      <div className="flex-1 min-h-0 scroll-container pb-24">
        <MainHeader title="My Stack" />
        <div className="p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>

          {/* Section header */}
          <Skeleton className="h-4 w-20" />

          {/* Compound cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
