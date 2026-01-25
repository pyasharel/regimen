

## Plan: Re-Enable Safari Partner Flow with 1-Month Free Offer + GA4 Consolidation

### Overview
Revert the paywall components to use Safari redirects for partner codes, giving users a tangible "1 month free" incentive to enter codes. This ensures partners get proper attribution while keeping the native Face ID flow for organic users.

---

### Phase 1: Update validate-promo-code Edge Function

**File:** `supabase/functions/validate-promo-code/index.ts`

**Current behavior:** Returns `useNativePurchase: true` for partner codes

**Change to:** 
- Set `useNativePurchase: false` for partner codes
- Add `redemptionUrl` with the Apple Offer Code redemption URL

```typescript
// For partner codes, return Safari redirect flow
return new Response(JSON.stringify({
  valid: true,
  type: 'partner_code',
  isPartnerCode: true,
  useNativePurchase: false,  // Changed from true
  redemptionUrl: `https://apps.apple.com/redeem?ctx=offercodes&id=6753905449&code=${upperCode}`,
  planType: partnerCode.plan_type,
  partnerName: partnerCode.partner_name,
  partnerCodeId: partnerCode.id,
  description: partnerCode.description
}), { ... });
```

---

### Phase 2: Update SubscriptionPaywall.tsx for Safari Flow

**File:** `src/components/SubscriptionPaywall.tsx`

**Add:**
1. State for Apple Offer Code flow:
   ```typescript
   interface AppleOfferCodePromo {
     code: string;
     redemptionUrl: string;
     partnerName: string;
     partnerCodeId: string;
   }
   const [appleOfferPromo, setAppleOfferPromo] = useState<AppleOfferCodePromo | null>(null);
   const [codeCopied, setCodeCopied] = useState(false);
   ```

2. Update `handleApplyPromo` to detect Safari redirect flow:
   ```typescript
   if (validateData.isPartnerCode && !validateData.useNativePurchase) {
     // Safari redirect flow for partner codes
     setAppleOfferPromo({
       code,
       redemptionUrl: validateData.redemptionUrl,
       partnerName: validateData.partnerName,
       partnerCodeId: validateData.partnerCodeId
     });
     toast.success(`Code applied! You'll get 1 month FREE via ${validateData.partnerName}`);
   }
   ```

3. Add copy-and-redirect UI when `appleOfferPromo` is set:
   ```tsx
   {appleOfferPromo && (
     <div className="space-y-4">
       <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
         <p className="text-center font-medium text-primary mb-2">
           🎉 1 Month FREE from {appleOfferPromo.partnerName}!
         </p>
         <p className="text-sm text-muted-foreground text-center">
           Copy your code, then complete signup in Safari
         </p>
       </div>
       
       <Button 
         onClick={() => copyToClipboard(appleOfferPromo.code)}
         variant="outline"
       >
         {codeCopied ? "Copied!" : `Copy Code: ${appleOfferPromo.code}`}
       </Button>
       
       <Button 
         onClick={() => openSafariRedemption(appleOfferPromo)}
       >
         Continue to App Store
       </Button>
     </div>
   )}
   ```

4. Add Safari redirect handler:
   ```typescript
   const openSafariRedemption = async (promo: AppleOfferCodePromo) => {
     // Save attribution before redirecting
     const { data: { user } } = await supabase.auth.getUser();
     if (user) {
       await savePartnerAttribution(promo.partnerCodeId, user.id);
     }
     
     // Open Safari for Apple Offer Code redemption
     await Browser.open({ url: promo.redemptionUrl });
     
     // Close paywall - user will complete in Safari
     onOpenChange(false);
   };
   ```

---

### Phase 3: Update OnboardingPaywallScreen.tsx Similarly

**File:** `src/components/onboarding/screens/OnboardingPaywallScreen.tsx`

Apply the same Safari redirect logic:
1. Add `AppleOfferCodePromo` state
2. Update promo validation to detect `useNativePurchase: false`
3. Show copy-code + Safari redirect UI for partner codes
4. Save attribution before Safari redirect

---

### Phase 4: Keep Revenue Tracking (Already Done)

The `revenuecat-webhook` changes we made earlier still apply:
- When users complete the Apple Offer Code flow and their subscription starts
- The webhook will detect pending partner attribution and link it
- First-year revenue tracking continues to work

---

### Phase 5: Update Partner Landing Page Messaging

**File:** `src/pages/PartnerLanding.tsx`

Ensure the messaging clearly states "1 month FREE" so partners can market this benefit:
- "Use code RESEARCH1 to get your first month FREE!"
- Emphasize the value: "That's a $3.99 value - free!"

---

### GA4 Scroll Tracking Consolidation

**Recommendation:** Disable GA4 Enhanced Measurement "Scrolls"

The `scroll_depth` event (if present on the landing page) provides more granular data (25%, 50%, 75%, 90%) compared to GA4's automatic `scroll` event (fires once at 90% only).

**Steps:**
1. Go to **GA4 Admin** → **Data Streams**
2. Select your web stream
3. Click **Enhanced Measurement** (gear icon)
4. Toggle OFF the **"Scrolls"** option
5. Keep your custom `scroll_depth` implementation (on landing page)

This consolidates to a single scroll tracking method with more actionable data.

---

### Files Changed Summary

| File | Changes |
|------|---------|
| `validate-promo-code/index.ts` | Set `useNativePurchase: false`, add `redemptionUrl` for partner codes |
| `SubscriptionPaywall.tsx` | Add Safari redirect flow with copy-code UI |
| `OnboardingPaywallScreen.tsx` | Add Safari redirect flow with copy-code UI |
| `PartnerLanding.tsx` | Update messaging to emphasize "1 month FREE" |

---

### App Store Connect Action

**Keep "Partner - 1 Month Free" offer ACTIVE**

Do NOT deactivate this offer - it's needed for the Safari redemption flow.

---

### User Experience After Implementation

**Organic Users (unchanged):**
1. See paywall → 14-day trial
2. Select plan → Face ID → Done

**Partner-Referred Users:**
1. Enter partner code (e.g., RESEARCH1)
2. See: "🎉 1 Month FREE from Research 1 Peptides!"
3. Tap "Copy Code: RESEARCH1" → Code copied
4. Tap "Continue to App Store" → Safari opens
5. Paste code in Safari → Face ID → Done
6. Return to app → Subscription active

**What Partners Can Market:**
> "Download Regimen and use code **RESEARCH1** to get your first month FREE!"

