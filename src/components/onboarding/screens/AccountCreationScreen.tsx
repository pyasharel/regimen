import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingData } from '../hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { trackSignup, trackFirstCompoundAdded } from '@/utils/analytics';
import { getStoredAttribution, clearAttribution } from '@/utils/attribution';
import { persistentStorage } from '@/utils/persistentStorage';
import { withQueryTimeout } from '@/utils/withTimeout';

// Timeout for welcome email (4 seconds)
const WELCOME_EMAIL_TIMEOUT_MS = 4000;

/**
 * Send welcome email in background with timeout - never blocks UI
 */
async function sendWelcomeEmailInBackground(userId: string, email: string, fullName: string) {
  try {
    console.log('[Onboarding] Attempting to send welcome email to:', email);
    
    // Atomically update only if welcome_email_sent is still false
    const { data: updateResult } = await withQueryTimeout(
      supabase
        .from('profiles')
        .update({ welcome_email_sent: true })
        .eq('user_id', userId)
        .eq('welcome_email_sent', false)
        .select(),
      'welcome_email_flag_update',
      WELCOME_EMAIL_TIMEOUT_MS
    );

    // Only send email if we successfully updated (meaning we won the race)
    if (updateResult && updateResult.length > 0) {
      console.log('[Onboarding] Won race condition, sending welcome email');
      
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { 
          email,
          fullName: fullName || 'there'
        }
      });
      
      if (error) {
        console.error('[Onboarding] Welcome email send failed:', error);
        // Reset flag on failure
        await supabase
          .from('profiles')
          .update({ welcome_email_sent: false })
          .eq('user_id', userId);
      } else {
        console.log('[Onboarding] Welcome email sent successfully');
      }
    } else {
      console.log('[Onboarding] Welcome email already sent or update failed');
    }
  } catch (error) {
    console.error('[Onboarding] Welcome email background task error:', error);
  }
}

// Generate doses for onboarding compound
function generateDosesForOnboarding(
  compoundId: string,
  userId: string,
  scheduleType: string,
  scheduleDays: string[] | null,
  intervalDays: number | undefined,
  timeOfDay: string,
  doseAmount: number,
  doseUnit: string
): Array<{
  compound_id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  dose_amount: number;
  dose_unit: string;
}> {
  const doses: Array<{
    compound_id: string;
    user_id: string;
    scheduled_date: string;
    scheduled_time: string;
    dose_amount: number;
    dose_unit: string;
  }> = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const dayNameToIndex: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  
  // Generate doses for next 60 days
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    
    let shouldAdd = false;
    
    if (scheduleType === 'daily') {
      shouldAdd = true;
    } else if (scheduleType === 'weekly' || scheduleType === 'specific_days') {
      if (scheduleDays) {
        const dayIndices = scheduleDays.map(d => dayNameToIndex[d] ?? -1);
        shouldAdd = dayIndices.includes(dayOfWeek);
      }
    } else if (scheduleType === 'interval' && intervalDays) {
      shouldAdd = i % intervalDays === 0;
    }
    
    if (shouldAdd) {
      doses.push({
        compound_id: compoundId,
        user_id: userId,
        scheduled_date: formatDate(date),
        scheduled_time: timeOfDay,
        dose_amount: doseAmount,
        dose_unit: doseUnit,
      });
    }
  }
  
  return doses;
}

interface AccountCreationScreenProps {
  data: OnboardingData;
  onSuccess: () => void;
}

export function AccountCreationScreen({ data, onSuccess }: AccountCreationScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple email validation regex
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Create the account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: data.firstName || undefined,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email already has an account. Try signing in instead.');
        } else {
          throw signUpError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error('No user returned from signup');
      }

      // Get attribution and locale data
      const attribution = getStoredAttribution();
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1] || null;

      // Save onboarding data to profile with attribution and country
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.firstName || null,
          path_type: data.pathType,
          experience_level: data.experienceLevel,
          pain_points: data.painPoints,
          goals: data.goals,
          current_weight: data.currentWeight,
          current_weight_unit: data.weightUnit,
          goal_weight: data.goalWeight,
          height_feet: data.heightFeet,
          height_inches: data.heightInches,
          height_cm: data.heightCm,
          height_unit: data.heightUnit,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          // Attribution data
          utm_source: attribution?.utm_source || null,
          utm_medium: attribution?.utm_medium || null,
          utm_campaign: attribution?.utm_campaign || null,
          utm_content: attribution?.utm_content || null,
          referrer: attribution?.referrer || null,
          landing_page: attribution?.landing_page || null,
          attributed_at: attribution?.utm_source || attribution?.referrer ? new Date().toISOString() : null,
          // Country/locale tracking
          country_code: countryCode,
          detected_locale: locale,
        })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error('[Onboarding] Profile update error:', profileError);
        // Don't fail the flow for profile update errors
      } else {
        console.log('[Onboarding] Profile updated with attribution and country:', { 
          utm_source: attribution?.utm_source, 
          country_code: countryCode 
        });
      }
      
      // Sync unit preferences to local storage for immediate use in MetricLogModal
      await persistentStorage.set('weightUnit', data.weightUnit === 'kg' ? 'kg' : 'lbs');
      await persistentStorage.set('heightUnit', data.heightUnit === 'cm' ? 'metric' : 'imperial');
      await persistentStorage.set('unitSystem', data.weightUnit === 'kg' ? 'metric' : 'imperial');
      console.log('[Onboarding] Synced unit preferences to local storage:', {
        weightUnit: data.weightUnit === 'kg' ? 'kg' : 'lbs',
        unitSystem: data.weightUnit === 'kg' ? 'metric' : 'imperial'
      });
      
      // Clear attribution after successful signup
      clearAttribution();

      // Create compound if medication was set up
      if (data.medication) {
        const scheduleType = data.medication.frequency === 'Daily' ? 'daily' : 
                            data.medication.frequency === 'Weekly' ? 'weekly' : 
                            data.medication.frequency === 'Specific days' ? 'specific_days' : 'interval';
        
        // Map time of day to actual time - Bedtime = 21:00 (9 PM)
        const timeOfDay = data.medication.timeOfDay === 'Morning' ? '09:00' :
                         data.medication.timeOfDay === 'Afternoon' ? '14:00' :
                         data.medication.timeOfDay === 'Evening' ? '19:00' :
                         data.medication.timeOfDay === 'Bedtime' ? '21:00' :
                         data.medication.customTime || '09:00';

        // Build schedule_days array for specific days or weekly
        let scheduleDays: string[] | null = null;
        if (scheduleType === 'specific_days' && data.medication.specificDays) {
          // Map short day names to full names
          const dayMap: Record<string, string> = {
            'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
            'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday'
          };
          scheduleDays = data.medication.specificDays.map(d => dayMap[d] || d);
        } else if (scheduleType === 'weekly' && data.medication.specificDays && data.medication.specificDays.length > 0) {
          // Weekly uses specificDays from MedicationSetup
          const dayMap: Record<string, string> = {
            'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
            'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday'
          };
          scheduleDays = data.medication.specificDays.map(d => dayMap[d] || d);
        } else if (scheduleType === 'weekly') {
          // Fallback to today
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          scheduleDays = [days[new Date().getDay()]];
        }

        // For interval scheduling, store frequency in schedule_days as the interval number
        let intervalValue: number | undefined;
        if (scheduleType === 'interval' && data.medication.frequencyDays) {
          intervalValue = data.medication.frequencyDays;
        }

        const { data: compoundData, error: compoundError } = await supabase
          .from('compounds')
          .insert({
            user_id: authData.user.id,
            name: data.medication.name,
            intended_dose: data.medication.dose,
            dose_unit: data.medication.doseUnit,
            schedule_type: scheduleType,
            schedule_days: scheduleDays,
            time_of_day: [timeOfDay],
            start_date: new Date().toISOString().split('T')[0],
            interval_days: intervalValue, // Store the actual interval for "Every X days"
          })
          .select()
          .single();

        if (compoundError) {
          console.error('[Onboarding] Compound creation error:', compoundError);
          // Don't fail the flow
        } else if (compoundData) {
          console.log('[Onboarding] Compound created:', compoundData.id);
          
          // Track first compound added (during onboarding = time_since_signup ~0)
          const firstCompoundKey = 'regimen_first_compound_tracked';
          if (!localStorage.getItem(firstCompoundKey)) {
            trackFirstCompoundAdded({ timeSinceSignupHours: 0, userId: authData.user.id });
            
            // Update profile with timestamp
            await supabase
              .from('profiles')
              .update({ first_compound_added_at: new Date().toISOString() })
              .eq('user_id', authData.user.id);
            
            localStorage.setItem(firstCompoundKey, 'true');
            console.log('[Onboarding] Tracked first compound added during onboarding');
          }
          
          // Generate doses for the next 60 days
          const doses = generateDosesForOnboarding(
            compoundData.id,
            authData.user.id,
            scheduleType,
            scheduleDays,
            intervalValue,
            timeOfDay,
            data.medication.dose,
            data.medication.doseUnit
          );
          
          console.log(`[Onboarding] Generated ${doses.length} doses for compound`);
          
          if (doses.length > 0) {
            // Retry logic for dose insertion
            let insertAttempt = 0;
            const maxAttempts = 3;
            let dosesInserted = false;
            
            while (insertAttempt < maxAttempts && !dosesInserted) {
              insertAttempt++;
              const { error: dosesError, count } = await supabase
                .from('doses')
                .insert(doses);
              
              if (dosesError) {
                console.error(`[Onboarding] Doses creation attempt ${insertAttempt} failed:`, dosesError);
                if (insertAttempt < maxAttempts) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } else {
                dosesInserted = true;
                console.log(`[Onboarding] Successfully inserted doses on attempt ${insertAttempt}`);
              }
            }
            
            if (!dosesInserted) {
              console.error('[Onboarding] All dose insertion attempts failed');
            }
          }
        }
      }

      // Create initial progress entry for starting weight if provided
      if (data.currentWeight) {
        const weightInLbs = data.weightUnit === 'kg' 
          ? data.currentWeight * 2.20462 
          : data.currentWeight;
        
        const today = new Date().toISOString().split('T')[0];
        
        const { error: progressError } = await supabase
          .from('progress_entries')
          .insert({
            user_id: authData.user.id,
            entry_date: today,
            category: 'metrics',
            metrics: { weight: weightInLbs },
            notes: null, // Don't set default text
          });
        
        if (progressError) {
          console.error('[Onboarding] Initial weight entry error:', progressError);
          // Don't fail the flow
        } else {
          console.log('[Onboarding] Created initial weight entry');
        }
      }

      // Send welcome email in background (fire-and-forget, never blocks UI)
      sendWelcomeEmailInBackground(authData.user.id, email, data.firstName || '');

      trackSignup('email');
      onSuccess();
    } catch (err: any) {
      console.error('[Onboarding] Account creation error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Headline */}
      <div className="mb-6">
        <h1 
          className="text-2xl font-bold text-[#333333] animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          Save your progress
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 space-y-4">
          {/* Email */}
          <div 
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
          >
            <label className="text-sm font-medium text-[#666666] mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full h-14 px-5 rounded-xl bg-white border-2 border-transparent text-base text-[#333333] placeholder:text-[#999999] focus:border-primary focus:outline-none shadow-sm transition-all"
            />
          </div>

          {/* Password */}
          <div 
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
          >
            <label className="text-sm font-medium text-[#666666] mb-2 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full h-14 px-5 pr-12 rounded-xl bg-white border-2 border-transparent text-base text-[#333333] placeholder:text-[#999999] focus:border-primary focus:outline-none shadow-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#666666] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#999999] mt-2">
              Password must be at least 8 characters
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
              
              {/* Show sign-in option when account already exists */}
              {error.includes('already has an account') && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/auth?email=${encodeURIComponent(email)}&mode=signin`;
                  }}
                  className="text-primary text-sm font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
                >
                  Sign in to your account →
                </button>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6">
          <OnboardingButton 
            type="submit"
            loading={loading}
            disabled={!email || !password}
          >
            Create Account
          </OnboardingButton>
        </div>
      </form>
    </div>
  );
}
