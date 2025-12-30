import { ReactNode } from "react";
import { DesignVariantToggle } from "@/components/DesignVariantToggle";

interface MainHeaderProps {
  title: string;
  rightSlot?: ReactNode;
  showDesignToggle?: boolean;
}

export const MainHeader = ({ title, rightSlot, showDesignToggle = true }: MainHeaderProps) => {
  return (
    <header className="border-b border-border bg-background flex-shrink-0">
      {/* Header content - CSS Grid for perfect centering */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full h-14 px-4 gap-2">
        {/* Left: Page title + Design Toggle */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {title}
          </h2>
          {showDesignToggle && <DesignVariantToggle />}
        </div>

        {/* Center: Logo - naturally centered via grid middle column */}
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent whitespace-nowrap">
          REGIMEN
        </h1>

        {/* Right: Action slot (or empty space for balance) */}
        <div className="flex justify-end">
          {rightSlot}
        </div>
      </div>
    </header>
  );
};
