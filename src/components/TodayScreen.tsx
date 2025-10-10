import { useNavigate } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, Sun, Moon } from "lucide-react";
import { PremiumDiamond } from "@/components/ui/icons/PremiumDiamond";
import { SunriseIcon } from "@/components/ui/icons/SunriseIcon";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import bubblePopSound from "@/assets/bubble-pop.mp3";
import { scheduleAllUpcomingDoses, cancelDoseNotification, requestNotificationPermissions } from "@/utils/notificationScheduler";
import { NotificationPermissionDialog } from "@/components/NotificationPermissionDialog";

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
  const [animatingDoses, setAnimatingDoses] = useState<Set<string>>(new Set());
  const [showDayComplete, setShowDayComplete] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationAsked, setNotificationAsked] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Check if we should show notification permission dialog
  useEffect(() => {
    const checkNotificationPermission = () => {
      const hasAsked = localStorage.getItem('notificationPermissionAsked');
      if (!hasAsked && doses.length > 0 && !notificationAsked) {
        setShowNotificationDialog(true);
        setNotificationAsked(true);
      }
    };
    
    checkNotificationPermission();
  }, [doses, notificationAsked]);

  const handleNotificationResponse = async (accepted: boolean) => {
    localStorage.setItem('notificationPermissionAsked', 'true');
    setShowNotificationDialog(false);
    
    if (accepted) {
      const granted = await requestNotificationPermissions();
      if (granted && doses.length > 0) {
        await scheduleAllUpcomingDoses(doses);
      }
    }
  };

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
      // Don't allow toggling if animation is in progress
      if (animatingDoses.has(doseId)) return;
      
      // Check if sound is enabled
      const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
      
      // Trigger haptic feedback
      triggerHaptic();
      
      // Play sound if enabled and checking off (not unchecking)
      if (!currentStatus && soundEnabled) {
        playCheckSound();
      }

      // Mark as animating
      if (!currentStatus) {
        setAnimatingDoses(prev => new Set(prev).add(doseId));
      }

      const { error } = await supabase
        .from('doses')
        .update({
          taken: !currentStatus,
          taken_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', doseId);

      if (error) throw error;

      // Cancel notification when dose is marked as taken
      if (!currentStatus) {
        await cancelDoseNotification(doseId);
      }

      // Update local state
      const updatedDoses = doses.map(d =>
        d.id === doseId
          ? { ...d, taken: !currentStatus }
          : d
      );
      setDoses(updatedDoses);

      // Check if this was the last dose
      if (!currentStatus) {
        const allTaken = updatedDoses.every(d => d.taken);
        if (allTaken && updatedDoses.length > 0) {
          // Trigger last dose celebration after regular animation
          setTimeout(() => {
            triggerLastDoseCelebration();
          }, 600);
        }
      }

      // Remove from animating set after animation completes
      setTimeout(() => {
        setAnimatingDoses(prev => {
          const next = new Set(prev);
          next.delete(doseId);
          return next;
        });
      }, 600);
    } catch (error) {
      console.error('Error toggling dose:', error);
      toast({
        title: "Error",
        description: "Failed to update dose",
        variant: "destructive"
      });
    }
  };

  const triggerLastDoseCelebration = () => {
    // Medium haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Play two-tone chime
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (soundEnabled) {
      playChimeSound();
    }

    // Show celebration message
    setShowDayComplete(true);
    
    // Hide after animation
    setTimeout(() => {
      setShowDayComplete(false);
    }, 2000);
  };

  const playChimeSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone (ding)
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 800;
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.2);

    // Second tone (DING) - higher and slightly delayed
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.value = 1000;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.35, audioContext.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    osc2.start(audioContext.currentTime + 0.15);
    osc2.stop(audioContext.currentTime + 0.4);
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
    if (hour >= 6 && hour < 12) return { text: "Good morning", Icon: SunriseIcon };
    if (hour >= 12 && hour < 18) return { text: "Good afternoon", Icon: Sun };
    return { text: "Good evening", Icon: Moon };
  };

  const greeting = getGreeting();

  // Haptic feedback function
  const triggerHaptic = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if ('vibrate' in navigator) {
        navigator.vibrate(50); // Subtle 50ms vibration for web
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  // Sound feedback function - bubble pop sound
  const playCheckSound = () => {
    const audio = new Audio(bubblePopSound);
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Sound play failed:', err));
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <style>{`
        @keyframes draw-check {
          0% {
            stroke-dashoffset: 24;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes checkbox-check {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.85);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes golden-shine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        
        @keyframes day-complete-enter {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes progress-ring {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: scale(2.5) rotate(180deg);
            opacity: 0;
          }
        }
      `}</style>
      {/* Header */}
      <header className="border-b border-border px-4 py-4 bg-background sticky top-0 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Today</h2>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6F61] to-[#8B5CF6] bg-clip-text text-transparent">
              REGIMEN
            </h1>
            {isPremium && (
              <PremiumDiamond className="h-5 w-5 text-primary" />
            )}
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-4 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
            {greeting.text}{userName ? `, ${userName}` : ''}
          </h2>
          <greeting.Icon className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-primary animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
      </div>

      {/* Calendar Section */}
      <div className="border-b border-border px-4 pb-6 space-y-4 flex-shrink-0">
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
                className="rounded-lg p-2 hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Previous week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex justify-between gap-2 flex-1 px-2">
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 min-w-[48px] transition-colors relative ${
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
                      <span className="text-xl font-bold">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => changeWeek('next')}
                className="rounded-lg p-2 hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Next week"
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
      <div className="flex-1 space-y-4 p-4 relative overflow-y-auto">
        {/* Day Complete Celebration */}
        {showDayComplete && (
          <>
            {/* Subtle confetti particles */}
            <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: '-10px',
                    backgroundColor: i % 3 === 0 ? '#FF6F61' : i % 3 === 1 ? '#8B5CF6' : '#FCD34D',
                    animation: `confetti-fall ${2 + Math.random()}s ease-in forwards`,
                    animationDelay: `${Math.random() * 0.3}s`,
                    opacity: 0.8
                  }}
                />
              ))}
            </div>
            
            {/* Perfect Day message */}
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
              style={{
                animation: 'day-complete-enter 0.5s ease-out',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)'
              }}
            >
              <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Perfect Day!
              </div>
            </div>
          </>
        )}
        
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
              ref={(el) => {
                if (el) cardRefs.current.set(dose.id, el);
                else cardRefs.current.delete(dose.id);
              }}
              className={`overflow-hidden rounded-2xl border transition-all animate-fade-in relative ${
                dose.taken
                  ? 'bg-card border-border'
                  : 'bg-primary border-primary shadow-sm'
              }`}
              style={{
                opacity: dose.taken ? 0.85 : 1,
                transform: dose.taken ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Golden shine for day complete only */}
              {showDayComplete && dose.taken && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent 40%, rgba(255,215,0,0.3) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                    animation: 'golden-shine 0.3s ease-out'
                  }}
                />
              )}
              
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold transition-colors duration-300 ${dose.taken ? 'text-muted-foreground' : 'text-white'}`}>
                      {dose.compound_name}
                    </h3>
                    <p className={`mt-1 text-sm transition-colors duration-300 ${dose.taken ? 'text-muted-foreground' : 'text-white/90'}`}>
                      {formatTime(dose.scheduled_time)} • {dose.dose_amount} {dose.dose_unit}
                      {dose.calculated_iu && ` • ${dose.calculated_iu} IU`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDose(dose.id, dose.taken)}
                    disabled={animatingDoses.has(dose.id)}
                    className={`h-7 w-7 rounded-full border-2 transition-all duration-200 ${
                      dose.taken
                        ? 'bg-success border-success'
                        : 'border-white/40 hover:border-white active:scale-95'
                    }`}
                    style={{
                      ...(animatingDoses.has(dose.id) && dose.taken ? {
                        animation: 'checkbox-check 0.2s ease-out'
                      } : {})
                    }}
                  >
                    {dose.taken && (
                      <svg
                        className="h-full w-full text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="24"
                        strokeDashoffset="0"
                        style={{
                          animation: animatingDoses.has(dose.id) ? 'draw-check 0.2s ease-out' : 'none',
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
        className="fixed right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomNavigation />
      
      <NotificationPermissionDialog 
        open={showNotificationDialog}
        onResponse={handleNotificationResponse}
      />
    </div>
  );
};
