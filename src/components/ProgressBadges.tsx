import { Badge } from "@/components/ui/badge";

interface ProgressBadgesProps {
  badges: {
    id: string;
    name: string;
    description: string;
    illustration: string;
    tier?: number;
    earned: boolean;
    earnedDate?: string;
  }[];
}

export const ProgressBadges = ({ badges }: ProgressBadgesProps) => {
  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  if (earnedBadges.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Achievements</h3>
        <Badge variant="secondary" className="text-xs">
          {earnedBadges.length} / {badges.length}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {earnedBadges.map((badge) => {
          return (
            <div
              key={badge.id}
              className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-sm"
            >
              <div className="flex h-16 w-16 items-center justify-center mb-2">
                <img src={badge.illustration} alt={badge.name} className="w-full h-full object-contain" />
              </div>
              <p className="text-xs font-medium text-center line-clamp-2">{badge.name}</p>
              {badge.earnedDate && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(badge.earnedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          );
        })}
        
        {lockedBadges.slice(0, 3 - (earnedBadges.length % 3 || 3)).map((badge) => {
          return (
            <div
              key={badge.id}
              className="flex flex-col items-center p-3 rounded-xl bg-muted/30 border border-border/50 opacity-40"
            >
              <div className="flex h-16 w-16 items-center justify-center mb-2 grayscale opacity-50">
                <img src={badge.illustration} alt={badge.name} className="w-full h-full object-contain" />
              </div>
              <p className="text-xs font-medium text-center text-muted-foreground line-clamp-2">{badge.name}</p>
            </div>
          );
        })}
      </div>

      {lockedBadges.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Keep going! {lockedBadges.length} more achievement{lockedBadges.length !== 1 ? 's' : ''} to unlock
        </p>
      )}
    </div>
  );
};
