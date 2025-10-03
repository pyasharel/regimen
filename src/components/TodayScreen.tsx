import { useNavigate } from "react-router-dom";
import { Plus, Settings, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Dose {
  id: string;
  compound_id: string;
  scheduled_date: string;
  scheduled_time: string;
  dose_amount: number;
  dose_unit: string;
  calculated_iu: number | null;
  taken: boolean;
  compound_name?: string;
}

export const TodayScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Generate week days
  const getWeekDays = () => {
    const days = [];
    const today = new Date(selectedDate);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today.setDate(diff + i));
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  useEffect(() => {
    loadDoses();
  }, [selectedDate]);

  const loadDoses = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data: dosesData, error } = await supabase
        .from('doses')
        .select(`
          *,
          compounds (name)
        `)
        .eq('scheduled_date', dateStr)
        .order('scheduled_time');

      if (error) throw error;

      const formattedDoses = dosesData?.map(d => ({
        ...d,
        compound_name: d.compounds?.name
      })) || [];

      setDoses(formattedDoses);
    } catch (error) {
      console.error('Error loading doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDose = async (doseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('doses')
        .update({
          taken: !currentStatus,
          taken_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', doseId);

      if (error) throw error;

      // Update local state
      setDoses(doses.map(d =>
        d.id === doseId
          ? { ...d, taken: !currentStatus }
          : d
      ));

      toast({
        title: !currentStatus ? "Dose marked as taken" : "Dose unmarked",
        description: "Your progress has been updated"
      });
    } catch (error) {
      console.error('Error toggling dose:', error);
      toast({
        title: "Error",
        description: "Failed to update dose",
        variant: "destructive"
      });
    }
  };

  const formatTime = (time: string) => {
    if (time === 'Morning') return '8:00 AM';
    if (time === 'Afternoon') return '2:00 PM';
    if (time === 'Evening') return '6:00 PM';
    return time;
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="w-10" /> {/* Spacer for alignment */}
          <h1 className="text-xl font-bold">Regimen</h1>
          <button 
            onClick={() => navigate('/notifications')}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Calendar Week View */}
      <div className="border-b border-border px-4 py-6 space-y-4">
        {/* Month/Year Display with Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeWeek('prev')}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Today
            </button>
          </div>
          
          <button
            onClick={() => changeWeek('next')}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Days */}
        <div className="flex justify-between gap-2">
          {weekDays.map((day, index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors relative ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isToday
                    ? 'bg-surface ring-2 ring-primary/40'
                    : 'hover:bg-muted'
                }`}
              >
                {isToday && !isSelected && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                <span className="text-xs font-medium">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]}
                </span>
                <span className="text-lg font-bold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Doses */}
      <div className="flex-1 space-y-4 p-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading doses...
          </div>
        ) : doses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold mb-2">No doses scheduled</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first compound to get started
            </p>
            <button
              onClick={() => navigate('/add-compound')}
              className="rounded-full bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Add First Compound
            </button>
          </div>
        ) : (
          doses.map((dose) => (
            <div
              key={dose.id}
              className={`overflow-hidden rounded-2xl border border-border shadow-lg transition-all animate-fade-in ${
                dose.taken
                  ? 'bg-muted opacity-75'
                  : 'bg-primary'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold ${dose.taken ? 'text-muted-foreground' : 'text-primary-foreground'}`}>
                      {dose.compound_name}
                    </h3>
                    <p className={`mt-1 text-sm ${dose.taken ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                      {dose.dose_amount} {dose.dose_unit}
                      {dose.calculated_iu && ` • ${dose.calculated_iu} IU`}
                      {' • '}{formatTime(dose.scheduled_time)}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDose(dose.id, dose.taken)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      dose.taken
                        ? 'bg-success border-success'
                        : 'border-primary-foreground/40 hover:border-primary-foreground'
                    }`}
                  >
                    {dose.taken && (
                      <svg
                        className="h-full w-full text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
