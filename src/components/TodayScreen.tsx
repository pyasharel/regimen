import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, Sun, Moon, CheckCircle, MoreVertical, Pencil, ClipboardList, CircleSlash } from "lucide-react";
import { SunriseIcon } from "@/components/ui/icons/SunriseIcon";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TodayBanner } from "@/components/TodayBanner";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { PreviewModeTimer } from "@/components/subscription/PreviewModeTimer";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import bubblePopSound from "@/assets/light-bubble-pop-regimen.m4a";
import { scheduleAllUpcomingDoses, cancelDoseNotification } from "@/utils/notificationScheduler";
import { formatDose } from "@/utils/doseUtils";
import { StreakBadge } from "@/components/StreakBadge";
import { checkAndScheduleStreakNotifications, initializeEngagementNotifications } from "@/utils/engagementNotifications";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { useQueryClient } from "@tanstack/react-query";
import { MainHeader } from "@/components/MainHeader";
import { DoseEditModal } from "@/components/DoseEditModal";
import { LogTodayDrawerContent } from "@/components/LogTodayDrawerContent";
import { trackDoseLogged, trackDoseSkipped, trackPaywallShown } from "@/utils/analytics";
import { useTheme } from "@/components/ThemeProvider";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Dose {
  id: string;
  compound_id: string;
  scheduled_date: string;
  scheduled_time: string;
  dose_amount: number;
  dose_unit: string;
  calculated_iu: number | null;
  calculated_ml: number | null;
  taken: boolean;
  skipped?: boolean;
  compound_name?: string;
  schedule_type?: string;
}

export const TodayScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [doses, setDoses] = useState<Dose[]>([]);
  const { designVariant } = useTheme();
  const isRefinedMode = designVariant === 'refined';
  
  // Track engagement for first dose notification
  useEngagementTracking();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [hasCompounds, setHasCompounds] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [animatingDoses, setAnimatingDoses] = useState<Set<string>>(new Set());
  const [showDayComplete, setShowDayComplete] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Dose edit modal state
  const [editingDose, setEditingDose] = useState<Dose | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogTodayModal, setShowLogTodayModal] = useState(false);
  
  // Subscription state
  const { 
    isSubscribed, 
    isLoading: subscriptionLoading, 
    refreshSubscription,
    previewModeCompoundAdded 
  } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [verifyingSubscription, setVerifyingSubscription] = useState(false);
  const [showPreviewTimer, setShowPreviewTimer] = useState(false);


  // Generate week days - keep the current week stable (Monday start)
  const getWeekDays = () => {
    const days = [];
    // Start from the beginning of the current week (Monday)
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    // Convert Sunday (0) to 7 for Monday-based calculation
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - adjustedDay + 1); // +1 to start on Monday
    
    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  // Start preview timer if user has added compound but not subscribed
  useEffect(() => {
    const checkPreviewMode = async () => {
      if (isSubscribed || !previewModeCompoundAdded) {
        setShowPreviewTimer(false);
        return;
      }

      // Check if user has any compounds
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('compounds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count && count > 0) {
        console.log('[TodayScreen] 🎯 User in preview mode with compound, starting timer');
        setShowPreviewTimer(true);
      }
    };

    checkPreviewMode();
  }, [isSubscribed, previewModeCompoundAdded]);

  // Check for post-checkout verification (web only)
  useEffect(() => {
    const verifyCheckout = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) return;

      // Native uses RevenueCat; calling the Stripe check-subscription function can overwrite the
      // backend profile to "none" and later flip the UI back into preview mode.
      if (Capacitor.isNativePlatform()) {
        console.log('[POST-CHECKOUT] Native platform detected - skipping Stripe verification');

        try {
          setVerifyingSubscription(true);
          await refreshSubscription('post_checkout_native');
        } finally {
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
          setVerifyingSubscription(false);
        }
        return;
      }

      console.log('[POST-CHECKOUT] Detected session_id:', sessionId);
      setVerifyingSubscription(true);

      try {
        // Call check-subscription to verify and update subscription status
        const { data, error } = await supabase.functions.invoke('check-subscription');

        if (error) {
          console.error('[POST-CHECKOUT] Error verifying subscription:', error);
          toast({
            title: "Verification Error",
            description: "We're having trouble verifying your subscription. Please refresh the page.",
            variant: "destructive"
          });
        } else {
          console.log('[POST-CHECKOUT] Subscription verified:', data);

          // Refresh the subscription context multiple times
          await refreshSubscription('post_checkout_web_1');
          await new Promise(resolve => setTimeout(resolve, 1000));
          await refreshSubscription('post_checkout_web_2');

          // Show success message
          if (data?.subscribed) {
            toast({
              title: "Welcome to Premium! 🎉",
              description: data.status === 'trialing'
                ? "Your 14-day free trial has started. Enjoy unlimited access!"
                : "Your subscription is now active. Enjoy unlimited access!",
            });

            // Force close paywall after successful subscription
            setShowPaywall(false);
          }
        }
      } catch (error) {
        console.error('[POST-CHECKOUT] Exception during verification:', error);
      } finally {
        // Remove session_id from URL
        searchParams.delete('session_id');
        setSearchParams(searchParams, { replace: true });
        setVerifyingSubscription(false);
      }
    };

    verifyCheckout();
  }, [searchParams, setSearchParams, refreshSubscription, toast]);

  // Load data when date changes
  useEffect(() => {
    loadDoses();
    checkCompounds();
    loadUserName();
  }, [selectedDate]);

  // Initialize engagement notifications only once on mount
  useEffect(() => {
    initializeEngagementNotifications();
  }, []);


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
    const startTime = Date.now();
    console.log('[TodayScreen] 🚀 Starting loadDoses...');
    try {
      // Format date in local timezone to avoid UTC conversion issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Get regular scheduled doses for the selected date (only from active compounds)
      const { data: dosesData, error: dosesError } = await supabase
        .from('doses')
        .select(`
          *,
          compounds (name, schedule_type, is_active)
        `)
        .eq('scheduled_date', dateStr);
      console.log('[TodayScreen] ⏱️ doses query took:', Date.now() - startTime, 'ms');

      if (dosesError) throw dosesError;

      // Get "As Needed" compounds for this user
      const { data: asNeededCompounds, error: compoundsError } = await supabase
        .from('compounds')
        .select('*')
        .eq('schedule_type', 'As Needed')
        .eq('is_active', true);

      if (compoundsError) throw compoundsError;

      // Create virtual doses for "As Needed" medications
      const asNeededDoses = asNeededCompounds?.map(compound => ({
        id: `as-needed-${compound.id}`,
        compound_id: compound.id,
        compound_name: compound.name,
        dose_amount: compound.intended_dose,
        dose_unit: compound.dose_unit,
        scheduled_time: '',
        scheduled_date: dateStr,
        taken: false,
        taken_at: null,
        skipped: false,
        schedule_type: 'As Needed',
        calculated_iu: compound.calculated_iu,
        calculated_ml: compound.calculated_ml,
        user_id: compound.user_id,
        created_at: new Date().toISOString(),
        compounds: { name: compound.name, schedule_type: 'As Needed' }
      })) || [];

      // Filter out untaken doses from inactive compounds, but keep taken doses for history
      const formattedDoses = [
        ...(dosesData?.filter(d => {
          // If compound is inactive, only show if dose was taken or skipped
          if (d.compounds?.is_active === false) {
            return d.taken || d.skipped;
          }
          return true;
        }).map(d => ({
          ...d,
          compound_name: d.compounds?.name,
          schedule_type: d.compounds?.schedule_type
        })) || []),
        ...asNeededDoses
      ];

      // Sort doses by time (convert text times to sortable format)
      // Keep "As Needed" at the end
      const sortedDoses = formattedDoses.sort((a, b) => {
        // As Needed goes to the end
        if (a.schedule_type === 'As Needed' && b.schedule_type !== 'As Needed') return 1;
        if (b.schedule_type === 'As Needed' && a.schedule_type !== 'As Needed') return -1;
        
        const getTimeValue = (time: string) => {
          if (time === 'Morning') return '08:00';
          if (time === 'Afternoon') return '14:00';
          if (time === 'Evening') return '18:00';
          return time;
        };
        
        return getTimeValue(a.scheduled_time).localeCompare(getTimeValue(b.scheduled_time));
      });

      setDoses(sortedDoses);
      console.log('[TodayScreen] ⏱️ Total loadDoses took:', Date.now() - startTime, 'ms');
    } catch (error) {
      console.error('Error loading doses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDose = async (doseId: string, currentStatus: boolean) => {
    // Don't allow toggling if animation is in progress
    if (animatingDoses.has(doseId)) return;

    try {
      // Find the dose to check if it's an "as needed" virtual dose
      const dose = doses.find(d => d.id === doseId);
      if (!dose) return;
      
      // Check if sound is enabled
      const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
      
      // Trigger haptic feedback with heavy impact
      triggerHaptic('heavy');
      
      // Play sound if enabled and checking off (not unchecking)
      if (!currentStatus && soundEnabled) {
        playCheckSound();
      }

      // Mark as animating
      if (!currentStatus) {
        setAnimatingDoses(prev => new Set(prev).add(doseId));
      }

      // For "as needed" medications, create a new dose record if checking off
      if (dose.schedule_type === 'As Needed') {
        if (!currentStatus) {
          // Create a new dose record for this "as needed" medication
          const { data: newDose, error: insertError } = await supabase
            .from('doses')
            .insert({
              user_id: (await supabase.auth.getUser()).data.user?.id,
              compound_id: dose.compound_id,
              dose_amount: dose.dose_amount,
              dose_unit: dose.dose_unit,
              calculated_iu: dose.calculated_iu,
              calculated_ml: dose.calculated_ml,
              scheduled_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              scheduled_date: selectedDate.toISOString().split('T')[0],
              taken: true,
              taken_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) throw insertError;
        }
        // Don't allow unchecking "as needed" doses
      } else {
        // Regular scheduled dose - update it
        // Use scheduled date/time for taken_at (not current time) to support retroactive logging
        let takenAtTimestamp: string | null = null;
        if (!currentStatus) {
          // Construct timestamp from scheduled date and time
          const scheduledDateStr = dose.scheduled_date;
          const scheduledTime = dose.scheduled_time;
          // Convert time format (e.g., "08:00" or "Morning" -> actual time)
          let hours = 8, minutes = 0;
          if (scheduledTime === 'Morning') { hours = 8; minutes = 0; }
          else if (scheduledTime === 'Afternoon') { hours = 14; minutes = 0; }
          else if (scheduledTime === 'Evening') { hours = 18; minutes = 0; }
          else {
            const timeMatch = scheduledTime.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
              hours = parseInt(timeMatch[1]);
              minutes = parseInt(timeMatch[2]);
            }
          }
          // Create the timestamp in local time, then convert to ISO
          const takenDate = new Date(scheduledDateStr + 'T00:00:00');
          takenDate.setHours(hours, minutes, 0, 0);
          takenAtTimestamp = takenDate.toISOString();
        }
        
        const { error } = await supabase
          .from('doses')
          .update({
            taken: !currentStatus,
            taken_at: takenAtTimestamp
          })
          .eq('id', doseId);

        if (error) throw error;
      }

      // Cancel notification when dose is marked as taken
      if (!currentStatus) {
        await cancelDoseNotification(doseId);
        // Track dose logged analytics
        trackDoseLogged(dose.compound_name || 'Unknown', true);
      } else {
        // Track dose unmarked
        trackDoseLogged(dose.compound_name || 'Unknown', false);
      }

      // Update local state
      const updatedDoses = doses.map(d =>
        d.id === doseId
          ? { ...d, taken: !currentStatus }
          : d
      );
      setDoses(updatedDoses);

      // Invalidate streak query to refresh in real-time
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      // Check if this was the last dose (excluding "as needed" medications)
      if (!currentStatus) {
        const scheduledDoses = updatedDoses.filter(d => d.schedule_type !== 'As Needed');
        const allScheduledTaken = scheduledDoses.every(d => d.taken);
        if (allScheduledTaken && scheduledDoses.length > 0) {
          // Trigger last dose celebration after regular animation
          setTimeout(() => {
            triggerLastDoseCelebration();
          }, 600);
        }
        
        // Check and schedule streak notifications
        await checkAndScheduleStreakNotifications();
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

  const skipDose = async (doseId: string, isCurrentlySkipped: boolean) => {
    try {
      const dose = doses.find(d => d.id === doseId);
      if (!dose) return;

      // Don't allow skipping "as needed" doses
      if (dose.schedule_type === 'As Needed') {
        toast({
          title: "Cannot Skip",
          description: "As-needed medications cannot be skipped",
          variant: "destructive"
        });
        return;
      }

      triggerHaptic('light');

      const { error } = await supabase
        .from('doses')
        .update({
          skipped: !isCurrentlySkipped,
          taken: false, // Ensure taken is false when skipping
          taken_at: null
        })
        .eq('id', doseId);

      if (error) throw error;

      // Update local state
      setDoses(doses.map(d =>
        d.id === doseId
          ? { ...d, skipped: !isCurrentlySkipped, taken: false }
          : d
      ));

      // Cancel notification when dose is skipped
      if (!isCurrentlySkipped) {
        await cancelDoseNotification(doseId);
        trackDoseSkipped(dose.compound_name || 'Unknown');
      }

      // Invalidate streak query to refresh
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      toast({
        title: isCurrentlySkipped ? "Dose Restored" : "Dose Skipped",
        description: isCurrentlySkipped 
          ? "You can now mark this dose as taken" 
          : "This dose has been marked as skipped",
      });
    } catch (error) {
      console.error('Error skipping dose:', error);
      toast({
        title: "Error",
        description: "Failed to update dose",
        variant: "destructive"
      });
    }
  };

  // Rotating success messages for variety
  const celebrationMessages = [
    "Perfect Day!",
    "All done!",
    "Nailed it!",
    "On point!",
    "Crushed it!",
    "You're consistent!"
  ];
  const [celebrationMessage, setCelebrationMessage] = useState(celebrationMessages[0]);

  const triggerLastDoseCelebration = () => {
    // Strong haptic feedback pattern
    triggerHaptic('heavy');
    setTimeout(() => triggerHaptic('medium'), 100);

    // Play two-tone chime
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (soundEnabled) {
      playChimeSound();
    }

    // Pick a random celebration message
    const randomMessage = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
    setCelebrationMessage(randomMessage);

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
    // Handle preset times
    if (time === 'Morning') return '8:00 AM';
    if (time === 'Afternoon') return '2:00 PM';
    if (time === 'Evening') return '6:00 PM';
    
    // Handle custom time in HH:MM format (24-hour)
    const customTimeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (customTimeMatch) {
      let hours = parseInt(customTimeMatch[1]);
      const minutes = customTimeMatch[2];
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours}:${minutes} ${period}`;
    }
    
    // Handle 24-hour format (HH:MM) and convert to 12-hour with AM/PM
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert 0 to 12, and keep 1-12
      return `${hours}:${minutes} ${ampm}`;
    }
    
    return time;
  };

  const goToToday = () => {
    triggerHaptic('light');
    setSelectedDate(new Date());
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    triggerHaptic('light');
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

  // Haptic feedback function - Medium impact for dose toggles
  const triggerHaptic = async (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      if (Capacitor.isNativePlatform()) {
        const style = intensity === 'light' ? ImpactStyle.Light : 
                     intensity === 'medium' ? ImpactStyle.Medium : 
                     ImpactStyle.Heavy;
        await Haptics.impact({ style });
      } else if ('vibrate' in navigator) {
        const duration = intensity === 'light' ? 30 : 
                        intensity === 'medium' ? 50 : 
                        100;
        navigator.vibrate(duration);
      }
    } catch (err) {
      console.log('Haptic failed:', err);
    }
  };

  // Sound feedback function - bubble pop sound
  const playCheckSound = () => {
    const audio = new Audio(bubblePopSound);
    audio.volume = 1.0; // Full volume
    audio.play().catch(err => console.log('Sound play failed:', err));
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
        <div className="flex-1 min-h-0 scroll-container pb-32">
          <MainHeader title="Today" />
          {/* Match the greeting block spacing exactly */}
          <div className="px-4 pt-4 pb-4 flex-shrink-0">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </div>
          {/* Rest of skeleton content */}
          <div className="px-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col app-top-padding">
      {/* Subscription Verification Overlay */}
      {verifyingSubscription && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
              <CheckCircle className="absolute inset-0 m-auto w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Verifying Subscription</h3>
              <p className="text-sm text-muted-foreground">
                Just a moment while we activate your premium access...
              </p>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Scrollable Content - Header inside scroll area */}
      <div className="flex-1 min-h-0 scroll-container pb-24">
        {/* Header */}
        <MainHeader title="Today" />

        {/* Greeting */}
        <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
              {greeting.text}{userName ? `, ${userName}` : ''}
            </h2>
            <greeting.Icon className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-primary animate-[pulse_4s_ease-in-out_infinite]" />
          </div>
          <StreakBadge />
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
            <div className="flex items-center justify-between gap-1">
              <button
                onClick={() => changeWeek('prev')}
                className="rounded-lg p-2 hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Previous week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex justify-between gap-1.5 flex-1 overflow-hidden">
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedDate(day);
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 flex-1 min-w-0 transition-colors relative ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isToday
                          ? 'ring-2 ring-primary ring-inset'
                          : 'hover:bg-muted'
                      }`}
                    >
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

      {/* Smart Banner */}
      <TodayBanner />

      {/* Doses */}
      <div className="p-4 space-y-4 relative">
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
                {celebrationMessage}
              </div>
            </div>
          </>
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
            <div className="flex items-center justify-center min-h-[50vh]">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  navigate('/add-compound');
                }}
                className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-8 hover:bg-primary/10 hover:border-primary/60 active:scale-[0.98] transition-all w-full max-w-md"
              >
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold mb-6 text-foreground">
                    Track Your First Compound
                  </h3>
                  
                  {/* Single CTA button */}
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-5 h-5" strokeWidth={2.5} />
                    <span>Add Compound</span>
                  </div>
                </div>
              </button>
            </div>
          )
        ) : (
          <>
            {(() => {
              // Group doses by time of day
              const scheduledDoses = doses.filter(d => d.schedule_type !== 'As Needed');
              
              const morningDoses = scheduledDoses.filter(d => {
                const time = d.scheduled_time;
                if (time === 'Morning') return true;
                const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  return hours >= 6 && hours < 12;
                }
                return false;
              });

              const afternoonDoses = scheduledDoses.filter(d => {
                const time = d.scheduled_time;
                if (time === 'Afternoon') return true;
                const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  return hours >= 12 && hours < 18;
                }
                return false;
              });

              const eveningDoses = scheduledDoses.filter(d => {
                const time = d.scheduled_time;
                if (time === 'Evening') return true;
                const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  return hours >= 18 || hours < 6;
                }
                return false;
              });

              const renderDoseCard = (dose: typeof doses[0]) => {
                const isSkipped = dose.skipped === true;
                const isHandled = dose.taken || isSkipped;
                
                // Refined mode: cards get tinted background (no border-left - we use inner line instead)
                const getCardBackground = () => {
                  if (isSkipped) return 'bg-muted/50 border-border/50';
                  if (dose.taken) {
                    return isRefinedMode 
                      ? 'bg-dose-card border-dose-card-border' 
                      : 'bg-card border-border';
                  }
                  // Untaken cards
                  return isRefinedMode 
                    ? 'bg-dose-card border-dose-card-border' 
                    : 'bg-primary border-primary';
                };
                
                return (
                  <div
                    key={dose.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(dose.id, el);
                      else cardRefs.current.delete(dose.id);
                    }}
                    className={`overflow-hidden rounded-2xl border transition-all relative ${getCardBackground()}`}
                    style={{
                      opacity: isHandled ? 0.65 : 1,
                      transform: isHandled ? 'scale(0.98)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      ...(isHandled || isRefinedMode ? {} : {
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                      })
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
                    
                    {/* Inner vertical accent line for refined mode */}
                    <div className={`flex ${isRefinedMode && !isSkipped ? 'pl-0' : ''}`}>
                      {isRefinedMode && !isSkipped && (
                        <div className="w-1 bg-primary rounded-full my-3 ml-3 flex-shrink-0" />
                      )}
                      <div className="p-3 min-h-[60px] flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Medication name with optional Skipped badge */}
                          <div className="flex items-center gap-2 mb-1 min-w-0">
                            <h3 className={`text-[17px] font-bold transition-colors duration-300 truncate ${
                              isSkipped 
                                ? 'text-muted-foreground/60' 
                                : dose.taken 
                                ? 'text-muted-foreground' 
                                : isRefinedMode
                                ? 'text-foreground'
                                : 'text-white'
                            }`}>
                              {dose.compound_name}
                            </h3>
                            {isSkipped && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted-foreground/20 text-muted-foreground/70">
                                Skipped
                              </span>
                            )}
                          </div>
                          
                          {/* Time and dosage on same line - using secondary/muted colors per spec */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[13px] transition-colors duration-300 ${
                              isSkipped
                                ? 'text-muted-foreground/40'
                                : dose.taken 
                                ? 'text-muted-foreground/60' 
                                : isRefinedMode
                                ? 'text-muted-foreground'
                                : 'text-white/70'
                            }`}>
                              {formatTime(dose.scheduled_time)}
                            </span>
                            <span className={`text-[13px] transition-colors duration-300 ${
                              isSkipped
                                ? 'text-muted-foreground/40'
                                : dose.taken 
                                ? 'text-muted-foreground/60' 
                                : isRefinedMode
                                ? 'text-muted-foreground'
                                : 'text-white/70'
                            }`}>·</span>
                            <span className={`text-[13px] transition-colors duration-300 ${
                              isSkipped
                                ? 'text-muted-foreground/40'
                                : dose.taken 
                                ? 'text-muted-foreground/60' 
                                : isRefinedMode
                                ? 'text-muted-foreground'
                                : 'text-white/70'
                            }`}>
                              {formatDose(dose.dose_amount, dose.dose_unit)}
                              {dose.calculated_iu && ` · ${dose.calculated_iu} IU`}
                              {dose.calculated_ml && ` · ${dose.calculated_ml} mL`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Edit menu (3-dots) between name and checkbox */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                                isSkipped
                                  ? 'text-muted-foreground/30 hover:text-muted-foreground/50'
                                  : dose.taken 
                                  ? 'text-muted-foreground/40 hover:text-muted-foreground/60' 
                                  : isRefinedMode
                                  ? 'text-muted-foreground/50 hover:text-muted-foreground/70'
                                  : 'text-white/40 hover:text-white/60'
                              }`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingDose(dose);
                              setShowEditModal(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Dose
                            </DropdownMenuItem>
                            {isSkipped ? (
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation();
                                skipDose(dose.id, true);
                              }}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Undo Skip
                              </DropdownMenuItem>
                            ) : !dose.taken && dose.schedule_type !== 'As Needed' && (
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation();
                                skipDose(dose.id, false);
                              }}>
                                <CircleSlash className="h-4 w-4 mr-2" />
                                Skip Dose
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Check button / Skip indicator */}
                        {isSkipped ? (
                          <div className="flex-shrink-0 h-7 w-7 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                            <CircleSlash className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleDose(dose.id, dose.taken)}
                            disabled={animatingDoses.has(dose.id)}
                            className={`flex-shrink-0 h-6 w-6 rounded-full border-2 transition-all duration-200 ${
                              dose.taken
                                ? isRefinedMode 
                                  ? 'bg-primary border-primary'
                                  : 'bg-success border-success'
                                : isRefinedMode
                                ? 'border-primary/50 hover:border-primary active:scale-95'
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
                                className="h-full w-full text-primary-foreground/90 p-0.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
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
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                );
              };

                return (
                  <>
                    {/* Morning Section */}
                    {morningDoses.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <h4 className={`text-[10px] font-bold uppercase tracking-[1.5px] ${isRefinedMode ? 'text-primary' : 'text-muted-foreground/60'}`}>
                            Morning
                          </h4>
                          {isRefinedMode && <div className="flex-1 h-px bg-border" />}
                        </div>
                        {morningDoses.map(renderDoseCard)}
                      </div>
                    )}

                    {/* Afternoon Section */}
                    {afternoonDoses.length > 0 && (
                      <div className={`space-y-3 ${morningDoses.length > 0 ? 'mt-6' : ''}`}>
                        <div className="flex items-center gap-2 px-1">
                          <h4 className={`text-[10px] font-bold uppercase tracking-[1.5px] ${isRefinedMode ? 'text-primary' : 'text-muted-foreground/60'}`}>
                            Afternoon
                          </h4>
                          {isRefinedMode && <div className="flex-1 h-px bg-border" />}
                        </div>
                        {afternoonDoses.map(renderDoseCard)}
                      </div>
                    )}

                    {/* Evening Section */}
                    {eveningDoses.length > 0 && (
                      <div className={`space-y-3 ${(morningDoses.length > 0 || afternoonDoses.length > 0) ? 'mt-6' : ''}`}>
                        <div className="flex items-center gap-2 px-1">
                          <h4 className={`text-[10px] font-bold uppercase tracking-[1.5px] ${isRefinedMode ? 'text-primary' : 'text-muted-foreground/60'}`}>
                            Evening
                          </h4>
                          {isRefinedMode && <div className="flex-1 h-px bg-border" />}
                        </div>
                        {eveningDoses.map(renderDoseCard)}
                      </div>
                    )}
                  </>
                );
              })()}

            {/* As Needed Section */}
            {doses.filter(d => d.schedule_type === 'As Needed').length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h4 className={`text-[10px] font-bold uppercase tracking-[1.5px] ${isRefinedMode ? 'text-primary' : 'text-muted-foreground/60'}`}>
                    As Needed
                  </h4>
                  {isRefinedMode && <div className="flex-1 h-px bg-border" />}
                </div>
                {doses.filter(d => d.schedule_type === 'As Needed').map((dose) => (
                  <div
                    key={dose.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(dose.id, el);
                      else cardRefs.current.delete(dose.id);
                    }}
                    className={`overflow-hidden rounded-2xl border transition-all animate-fade-in relative ${
                      dose.taken
                        ? 'bg-card border-border'
                        : 'bg-muted/30 border-border'
                    }`}
                    style={{
                      opacity: dose.taken ? 0.85 : 0.9,
                      transform: dose.taken ? 'scale(0.98)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Medication name */}
                          <h3 className={`text-lg font-bold mb-2 transition-colors duration-300 ${
                            dose.taken ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {dose.compound_name}
                          </h3>
                          
                          {/* Dosage badge with all info */}
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {formatDose(dose.dose_amount, dose.dose_unit)}
                            {dose.calculated_iu && ` • ${dose.calculated_iu} IU`}
                            {dose.calculated_ml && ` • Draw ${dose.calculated_ml} mL`}
                          </span>
                        </div>
                        
                        {/* Check button */}
                        <button
                          onClick={() => toggleDose(dose.id, dose.taken)}
                          disabled={animatingDoses.has(dose.id)}
                          className={`flex-shrink-0 h-7 w-7 rounded-full border-2 transition-all duration-200 ${
                            dose.taken
                              ? 'bg-success border-success'
                              : 'border-border hover:border-primary active:scale-95'
                          }`}
                          style={{
                            ...(animatingDoses.has(dose.id) && dose.taken ? {
                              animation: 'checkbox-check 0.2s ease-out'
                            } : {})
                          }}
                        >
                          {dose.taken && (
                            <svg
                              className="h-full w-full text-primary-foreground/90"
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
      </div>
      {/* End of scroll-container */}

      {/* Log Today FAB - primary daily action */}
      <Drawer open={showLogTodayModal} onOpenChange={setShowLogTodayModal}>
        <DrawerTrigger asChild>
          <button
            onClick={() => triggerHaptic('light')}
            className="fixed right-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary ring-[3px] ring-white/80 dark:ring-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            <ClipboardList className="h-6 w-6 text-white" />
          </button>
        </DrawerTrigger>
        
        {/* Log Today Drawer Content */}
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-lg flex flex-col max-h-[80vh]">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Log Today
              </DrawerTitle>
              <DrawerDescription>
                Track your daily metrics and notes
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-8 overflow-y-auto flex-1">
              <LogTodayDrawerContent onSuccess={() => setShowLogTodayModal(false)} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNavigation />

      {/* Preview Mode Timer */}
      {showPreviewTimer && !isSubscribed && (
        <PreviewModeTimer 
          onTimerStart={() => console.log('[TodayScreen] ⏱️ Preview timer started')}
          onPaywallDismiss={() => {
            console.log('[TodayScreen] User dismissed preview paywall');
          }}
        />
      )}

      {/* Dose Edit Modal */}
      <DoseEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingDose(null);
        }}
        dose={editingDose}
        onDoseUpdated={loadDoses}
      />
    </div>
  );
};
