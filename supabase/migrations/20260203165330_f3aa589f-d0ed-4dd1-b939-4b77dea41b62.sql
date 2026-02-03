-- Fix PUBLIC_DATA_EXPOSURE: Add restrictive RLS policies to sensitive tables
-- These tables should only be accessible by service_role (for edge functions) and admins

-- 1. partner_promo_codes - deny all regular user access
CREATE POLICY "No user access to partner promo codes"
ON public.partner_promo_codes
FOR ALL
TO authenticated
USING (false);

-- 2. partner_code_redemptions - deny all regular user access  
CREATE POLICY "No user access to partner redemptions"
ON public.partner_code_redemptions
FOR ALL
TO authenticated
USING (false);

-- 3. lifetime_codes - already has service role policy, add deny policy for regular users
CREATE POLICY "No user access to lifetime codes"
ON public.lifetime_codes
FOR ALL
TO authenticated
USING (false);

-- 4. welcome_emails_sent - already has service role policy, add deny policy for regular users
CREATE POLICY "No user access to welcome emails"
ON public.welcome_emails_sent
FOR ALL
TO authenticated
USING (false);