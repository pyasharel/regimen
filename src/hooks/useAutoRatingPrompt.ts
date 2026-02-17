import { useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { persistentStorage } from '@/utils/persistentStorage';
import { requestRating } from '@/utils/ratingHelper';
import { supabase } from '@/integrations/supabase/client';
import { getUserIdWithFallback } from '@/utils/safeAuth';
import { appVersion } from '../../capacitor.config';

// Eligibility thresholds
const MIN_ACCOUNT_AGE_DAYS = 7;
const MIN_DOSES_LOGGED = 15;
const MIN_COMPOUNDS = 2;
const COOLDOWN_DAYS = 120;

/**
 * Smart auto-rating prompt hook.
 * 
 * Exposes triggerIfEligible() which checks all criteria and fires
 * the native rating dialog if the user qualifies. No pre-prompt UI,
 * no store redirects — just the native OS dialog at the right moment.
 */
export function useAutoRatingPrompt() {
  const promptedThisSession = useRef(false);

  const triggerIfEligible = useCallback(async (compoundCount: number) => {
    const tag = '[AutoRating]';

    // Guard: web platform
    if (!Capacitor.isNativePlatform()) {
      console.log(tag, 'Skip: web platform');
      return;
    }

    // Guard: already prompted this session
    if (promptedThisSession.current) {
      console.log(tag, 'Skip: already prompted this session');
      return;
    }

    // Guard: compound count
    if (compoundCount < MIN_COMPOUNDS) {
      console.log(tag, `Skip: only ${compoundCount} compounds (need ${MIN_COMPOUNDS})`);
      return;
    }

    // Guard: cooldown (120 days)
    const lastPromptDate = await persistentStorage.get('lastRatingPromptDate');
    if (lastPromptDate) {
      const daysSince = (Date.now() - new Date(lastPromptDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) {
        console.log(tag, `Skip: last prompt ${Math.round(daysSince)}d ago (need ${COOLDOWN_DAYS}d)`);
        return;
      }
    }

    // Guard: once per app version
    const lastPromptVersion = await persistentStorage.get('lastRatingPromptVersion');
    if (lastPromptVersion === appVersion) {
      console.log(tag, `Skip: already prompted for version ${appVersion}`);
      return;
    }

    // Guard: account age and dose count (requires network)
    try {
      const userId = await getUserIdWithFallback(3000);
      if (!userId) {
        console.log(tag, 'Skip: no userId');
        return;
      }

      // Check account age
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', userId)
        .single();

      if (!profile?.created_at) {
        console.log(tag, 'Skip: no profile created_at');
        return;
      }

      const accountAgeDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < MIN_ACCOUNT_AGE_DAYS) {
        console.log(tag, `Skip: account ${Math.round(accountAgeDays)}d old (need ${MIN_ACCOUNT_AGE_DAYS}d)`);
        return;
      }

      // Check total doses logged
      const { data: stats } = await supabase
        .from('user_stats')
        .select('total_doses_logged')
        .eq('user_id', userId)
        .single();

      const totalDoses = stats?.total_doses_logged ?? 0;
      if (totalDoses < MIN_DOSES_LOGGED) {
        console.log(tag, `Skip: ${totalDoses} doses logged (need ${MIN_DOSES_LOGGED})`);
        return;
      }

      // All criteria met!
      console.log(tag, '✅ All criteria met, requesting rating', {
        accountAgeDays: Math.round(accountAgeDays),
        totalDoses,
        compoundCount,
        appVersion,
      });

      promptedThisSession.current = true;

      const result = await requestRating('auto_prompt', { skipStoreFallback: true });
      console.log(tag, 'Rating result:', result);

      // Record prompt regardless of whether OS actually showed the dialog
      await persistentStorage.set('lastRatingPromptDate', new Date().toISOString());
      await persistentStorage.set('lastRatingPromptVersion', appVersion);

    } catch (err) {
      console.error(tag, 'Error during eligibility check:', err);
    }
  }, []);

  return { triggerIfEligible };
}
