import wordmarkLogo from "@/assets/regimen-wordmark-transparent.png";

interface ChartWatermarkProps {
  className?: string;
  position?: "top-right" | "bottom-right";
}

export const ChartWatermark = ({ 
  className = "", 
  position = "top-right" 
}: ChartWatermarkProps) => {
  const positionClasses = position === "bottom-right" 
    ? "bottom-2 right-2" 
    : "top-2 right-2";

  return (
    <img
      src={wordmarkLogo}
      alt=""
      className={`absolute ${positionClasses} h-4 w-auto opacity-[0.25] pointer-events-none select-none z-10 ${className}`}
      draggable={false}
    />
  );
};
