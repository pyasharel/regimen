import { ReactNode } from "react";

interface MainHeaderProps {
  title: string;
  rightSlot?: ReactNode;
}

export const MainHeader = ({ title, rightSlot }: MainHeaderProps) => {
  return (
    <header className="border-b border-border bg-background sticky top-0 flex-shrink-0 z-10">
      {/* Safe area spacer - this extends the background into the notch area */}
      <div 
        className="bg-background"
        style={{ height: 'env(safe-area-inset-top, 0px)' }}
      />
      {/* Actual header content - fixed height, below safe area */}
      <div className="flex items-center justify-between w-full h-14 px-4 relative">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
            REGIMEN
          </h1>
        </div>
        {rightSlot && (
          <div className="flex-shrink-0 pointer-events-auto">
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
};
