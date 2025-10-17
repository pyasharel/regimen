import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface EncouragingMessageProps {
  type: 'weight_down' | 'weight_up' | 'consistent' | 'getting_started';
  data?: {
    change?: number;
    streak?: number;
  };
}

const MESSAGES = {
  weight_down: [
    { icon: TrendingDown, text: "Transformation in progress 💪", color: "text-green-500" },
    { icon: TrendingDown, text: "Your hard work is paying off! 🔥", color: "text-green-500" },
    { icon: TrendingDown, text: "Results are showing! Keep it up 🌟", color: "text-green-500" },
  ],
  weight_up: [
    { icon: TrendingUp, text: "Building muscle takes time ⚡", color: "text-blue-500" },
    { icon: TrendingUp, text: "Strength gains in progress 💎", color: "text-blue-500" },
    { icon: TrendingUp, text: "Mass is coming! Stay consistent 🏋️", color: "text-blue-500" },
  ],
  consistent: [
    { icon: Activity, text: "Consistency is key 🔥", color: "text-orange-500" },
    { icon: Activity, text: "Daily dedication pays off 🎯", color: "text-orange-500" },
    { icon: Activity, text: "Building habits, building results 💪", color: "text-orange-500" },
  ],
  getting_started: [
    { icon: Activity, text: "Great start! Keep logging 🌟", color: "text-primary" },
    { icon: Activity, text: "You're on the right track ⚡", color: "text-primary" },
    { icon: Activity, text: "Consistency begins now 🔥", color: "text-primary" },
  ],
};

export const EncouragingMessage = ({ type, data }: EncouragingMessageProps) => {
  const messages = MESSAGES[type];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  const Icon = randomMessage.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${randomMessage.color} border-current/20 bg-current/5 gap-1.5 text-xs font-medium px-3 py-1`}
    >
      <Icon className="h-3.5 w-3.5" />
      {randomMessage.text}
    </Badge>
  );
};
