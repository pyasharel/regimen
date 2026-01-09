import wordmarkLogo from "@/assets/regimen-wordmark-transparent.png";

interface ChartWatermarkProps {
  className?: string;
}

export const ChartWatermark = ({ className = "" }: ChartWatermarkProps) => {
  return (
    <img
      src={wordmarkLogo}
      alt=""
      className={`absolute top-2 right-2 h-4 w-auto opacity-[0.25] pointer-events-none select-none z-10 ${className}`}
      draggable={false}
    />
  );
};
