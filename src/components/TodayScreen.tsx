import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TodayScreen = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate week dates
  const getWeekDates = () => {
    const week = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = (date: Date) => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <button onClick={() => navigate("/settings")} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <Settings className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Regimen</h1>
        <button className="rounded-lg p-2 hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* Calendar Week View */}
      <div className="border-b border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => navigateWeek(-1)} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-semibold">
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => navigateWeek(1)} className="rounded-lg p-2 hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, index) => {
            const isTodayDate = isToday(date);
            return (
              <button
                key={index}
                className={`flex flex-col items-center rounded-xl p-2 transition-all ${
                  isTodayDate
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-xs font-medium">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                </span>
                <span className={`mt-1 text-lg font-bold ${isTodayDate ? "" : "text-muted-foreground"}`}>
                  {date.getDate()}
                </span>
                {/* Dose indicator bars - placeholder */}
                <div className="mt-2 flex gap-0.5">
                  <div className="h-0.5 w-2 rounded-full bg-primary/60" />
                  <div className="h-0.5 w-2 rounded-full bg-primary/40" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Plus className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-2xl font-bold">No doses scheduled for today</h2>
        <p className="mb-8 max-w-sm text-muted-foreground">
          Start tracking your health optimization journey by adding your first compound
        </p>
        <Button onClick={() => navigate("/add-compound")} size="lg" className="shadow-xl shadow-primary/20">
          <Plus className="mr-2 h-5 w-5" />
          Add First Compound
        </Button>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => navigate("/add-compound")}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm">
        {[
          { name: "Today", path: "/today", active: true },
          { name: "My Stack", path: "/stack", active: false },
          { name: "Progress", path: "/progress", active: false },
          { name: "Settings", path: "/settings", active: false },
        ].map((tab) => (
          <button
            key={tab.name}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab.active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="h-1 w-1 rounded-full" />
            <span className="text-[11px] font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
