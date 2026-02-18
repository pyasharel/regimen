import { Skeleton } from "@/components/ui/skeleton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MainHeader } from "@/components/MainHeader";

export function TodayScreenSkeleton() {
  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding" style={{ paddingTop: 'var(--app-banner-height, 0px)' }}>
      <div className="flex-1 min-h-0 scroll-container pb-32">
        <MainHeader title="Today" />
        
        {/* Greeting */}
        <div className="px-4 pt-4 pb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Week calendar strip */}
        <div className="border-b border-border px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex gap-1 justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Dose cards */}
        <div className="px-4 pt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
              <Skeleton className="h-6 w-6 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
