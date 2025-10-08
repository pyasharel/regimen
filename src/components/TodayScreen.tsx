import { useNavigate } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, Crown, Smile, Moon, Coffee } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";

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
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [hasCompounds, setHasCompounds] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Generate week days - keep the current week stable
  const getWeekDays = () => {
    const days = [];
    // Start from the beginning of the current week (Sunday)
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);
    
    // Generate 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  useEffect(() => {
    loadDoses();
    checkCompounds();
    loadUserName();
    
    // Check premium status
    const checkPremium = () => {
      const premiumStatus = localStorage.getItem('testPremiumMode') === 'true';
      setIsPremium(premiumStatus);
    };
    
    checkPremium();
    window.addEventListener('storage', checkPremium);
    return () => window.removeEventListener('storage', checkPremium);
  }, [selectedDate]);

  const loadUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user name:', error);
        return;
      }

      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]); // Use first name only
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const checkCompounds = async () => {
    try {
      const { data, error } = await supabase
        .from('compounds')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      setHasCompounds((data?.length || 0) > 0);
    } catch (error) {
      console.error('Error checking compounds:', error);
    }
  };

  const loadDoses = async () => {
    try {
      // Format date in local timezone to avoid UTC conversion issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const { data: dosesData, error } = await supabase
        .from('doses')
        .select(`
          *,
          compounds (name)
        `)
        .eq('scheduled_date', dateStr);

      if (error) throw error;

      const formattedDoses = dosesData?.map(d => ({
        ...d,
        compound_name: d.compounds?.name
      })) || [];

      // Sort doses by time (convert text times to sortable format)
      const sortedDoses = formattedDoses.sort((a, b) => {
        const getTimeValue = (time: string) => {
          if (time === 'Morning') return '08:00';
          if (time === 'Afternoon') return '14:00';
          if (time === 'Evening') return '18:00';
          return time;
        };
        
        return getTimeValue(a.scheduled_time).localeCompare(getTimeValue(b.scheduled_time));
      });

      setDoses(sortedDoses);
    } catch (error) {
      console.error('Error loading doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDose = async (doseId: string, currentStatus: boolean) => {
    try {
      // Check if sound is enabled
      const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
      
      // Trigger haptic feedback
      triggerHaptic();
      
      // Play sound if enabled and checking off (not unchecking)
      if (!currentStatus && soundEnabled) {
        playCheckSound();
      }

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

  // Get greeting based on time of day with icons
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", Icon: Coffee };
    if (hour < 17) return { text: "Good afternoon", Icon: Smile };
    return { text: "Good evening", Icon: Moon };
  };

  const greeting = getGreeting();

  // Haptic feedback function
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Subtle 50ms vibration
    }
  };

  // Sound feedback function - bubble pop sound
  const playCheckSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Bubble pop: quick frequency drop from high to low
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.08);
    oscillator.type = 'sine';
    
    // Sharp attack, fast decay
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.08);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <style>{`
        @keyframes draw-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Today</h2>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
            {isPremium && (
              <Crown className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
            {greeting.text}{userName ? `, ${userName}` : ''}
          </h2>
          <greeting.Icon className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-primary animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
      </div>

      {/* Calendar Section */}
      <div className="border-b border-border px-4 pb-6 space-y-4">
        {/* Month/Year Display with View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            {selectedDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          
          <button
            onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface hover:bg-muted transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {viewMode === 'week' ? 'Month' : 'Week'}
          </button>
        </div>

        {viewMode === 'week' ? (
          <>
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => changeWeek('prev')}
                className="rounded-lg p-2 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex justify-between gap-1.5 flex-1 px-4">
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-2 transition-colors relative ${
                        isSelected && isToday
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
                          : isSelected
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
              
              <button
                onClick={() => changeWeek('next')}
                className="rounded-lg p-2 hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-lg border border-border"
            />
          </div>
        )}
      </div>

      {/* Doses */}
      <div className="flex-1 space-y-4 p-4">
        {doses.length > 0 && (
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Today's Regimen
          </h3>
        )}
        
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading doses...
          </div>
        ) : doses.length === 0 ? (
          hasCompounds ? (
            <div className="text-center py-8 text-muted-foreground">
              No doses scheduled for this date
            </div>
          ) : (
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
          )
        ) : (
          doses.map((dose) => (
            <div
              key={dose.id}
              className={`overflow-hidden rounded-2xl border transition-all animate-fade-in ${
                dose.taken
                  ? 'bg-card border-border'
                  : 'bg-primary border-primary shadow-sm'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold ${dose.taken ? 'text-muted-foreground' : 'text-white'}`}>
                      {dose.compound_name}
                    </h3>
                    <p className={`mt-1 text-sm ${dose.taken ? 'text-muted-foreground' : 'text-white/90'}`}>
                      {formatTime(dose.scheduled_time)} • {dose.dose_amount} {dose.dose_unit}
                      {dose.calculated_iu && ` • ${dose.calculated_iu} IU`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDose(dose.id, dose.taken)}
                    className={`h-7 w-7 rounded-full border-2 transition-all duration-200 ${
                      dose.taken
                        ? 'bg-success border-success scale-100'
                        : 'border-muted-foreground/40 hover:border-primary active:scale-95'
                    }`}
                  >
                    {dose.taken && (
                      <svg
                        className="h-full w-full text-white animate-[draw-check_0.2s_ease-out]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="24"
                        strokeDashoffset="24"
                        style={{
                          animation: 'draw-check 0.2s ease-out forwards',
                        }}
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

      <BottomNavigation />
    </div>
  );
};
