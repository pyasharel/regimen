import { ReactNode } from "react";

interface MainHeaderProps {
  title: string;
  rightSlot?: ReactNode;
}

export const MainHeader = ({ title, rightSlot }: MainHeaderProps) => {
  return (
    <header className="border-b border-border px-4 mt-6 bg-background sticky top-0 flex-shrink-0 z-10 h-16 flex items-center">
      <div className="flex items-center justify-between w-full">
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
