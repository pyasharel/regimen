import { useState } from 'react';
import { OnboardingButton } from '../OnboardingButton';
import { OnboardingData } from '../hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { trackSignup } from '@/utils/analytics';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please fill in all fields');
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

      // Save onboarding data to profile
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
        })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.error('[Onboarding] Profile update error:', profileError);
        // Don't fail the flow for profile update errors
      }

      // Create compound if medication was set up
      if (data.medication) {
        const scheduleType = data.medication.frequency === 'Daily' ? 'daily' : 
                            data.medication.frequency === 'Weekly' ? 'weekly' : 
                            data.medication.frequency === 'Specific days' ? 'specific_days' : 'interval';
        
        const timeOfDay = data.medication.timeOfDay === 'Morning' ? '09:00' :
                         data.medication.timeOfDay === 'Afternoon' ? '14:00' :
                         data.medication.timeOfDay === 'Evening' ? '19:00' :
                         data.medication.customTime || '09:00';

        const { error: compoundError } = await supabase
          .from('compounds')
          .insert({
            user_id: authData.user.id,
            name: data.medication.name,
            intended_dose: data.medication.dose,
            dose_unit: data.medication.doseUnit,
            schedule_type: scheduleType,
            time_of_day: [timeOfDay],
            start_date: new Date().toISOString().split('T')[0],
          });

        if (compoundError) {
          console.error('[Onboarding] Compound creation error:', compoundError);
          // Don't fail the flow
        }
      }

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
              className="w-full h-14 px-5 rounded-xl bg-white border-2 border-transparent text-base focus:border-primary focus:outline-none shadow-sm transition-all"
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
                className="w-full h-14 px-5 pr-12 rounded-xl bg-white border-2 border-transparent text-base focus:border-primary focus:outline-none shadow-sm transition-all"
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
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg animate-in fade-in duration-200">
              {error}
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
