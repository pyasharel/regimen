-- Allow users to check their own admin status
CREATE POLICY "Users can check own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);