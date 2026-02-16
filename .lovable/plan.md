

# Partner Promo Flow: Deploy Fixes and Re-Test

## What We Know Now

Your RevenueCat screenshot confirms the correct test account (ed3d0077). The good news:
- Country detection shows "United States" correctly
- RevenueCat received the `partner_code: TRYREGIMEN` attribute
- The 2 sessions is normal -- the Google Play purchase flow backgrounds the app briefly

The problems are that the code fixes from last session haven't reached your phone yet. The edge function also needs deployment.

## What Needs to Happen

### 1. Deploy the validate-promo-code Edge Function
The updated edge function (with server-side attribution, duplicate prevention, and redemption count tracking) is written but needs to be deployed. This happens automatically when the build runs.

### 2. Fix the Test Account in the Database
Before re-testing, we should clean up your test account so it starts fresh:
- Set `subscription_status` back to `none` (already is)
- Clear any stale data
- OR: delete the test account entirely and create a fresh one when you re-test

### 3. Rebuild and Sync to Android
You need to:
1. Run `npm run build` in your local project (pull latest code first)
2. Run `npx cap sync android`
3. Open in Android Studio and deploy to your phone

### 4. Re-Test the Full Flow
With the new build on your phone:
1. Sign out of the test account (or use a fresh one)
2. Sign up with a new test email
3. Enter TRYREGIMEN promo code
4. Complete the Google Play purchase
5. Verify in the database that `partner_code_redemptions` has a record, `subscription_type = annual`, and `subscription_status = trialing`

### 5. Clean Up the Sandbox in RevenueCat
For the existing test customer (ed3d0077), you can click "Delete Customer" at the bottom of the RevenueCat profile page. This removes the sandbox data so you get a clean test. When you sign up again with a new account, it will create a fresh RevenueCat customer.

## Technical Details

### Edge Function Deployment
The `validate-promo-code` function will be auto-deployed. It now:
- Extracts user_id from the auth token
- Checks for duplicate redemptions before allowing re-use
- Inserts into `partner_code_redemptions` server-side (bypassing RLS)
- Increments `redemption_count` on the partner code

### Client-Side Fixes (already in codebase)
- `SubscriptionPaywall.tsx`: After successful Android partner purchase, updates profile with `subscription_type: 'annual'` and `subscription_status: 'trialing'`
- `SubscriptionContext.tsx`: Uses IP geolocation API for country detection
- `revenuecat-webhook`: Broader product_id matching for annual detection

### Re-Test Checklist
After deploying the new build, verify these 5 things:
1. `partner_code_redemptions` table has a new row for the test user
2. `partner_promo_codes.redemption_count` incremented from 0 to 1
3. Profile shows `subscription_type = 'annual'`
4. Profile shows `subscription_status = 'trialing'` (or appropriate status)
5. RevenueCat customer shows `partner_code: TRYREGIMEN` attribute and sandbox entitlement

### Recommended Testing Approach
- Delete the existing RevenueCat customer (ed3d0077) via the "Delete Customer" button
- Delete or keep the existing database profile (either works -- a fresh signup is cleanest)
- Use a different test email (e.g., `test2@tester.com`) for a fully clean test
- This avoids any confusion from stale sandbox data

