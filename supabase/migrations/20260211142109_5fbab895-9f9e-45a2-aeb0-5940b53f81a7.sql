
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- reports
DROP POLICY IF EXISTS "Anyone can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;

CREATE POLICY "Anyone can insert reports" ON public.reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read reports" ON public.reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reports" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- site_settings
DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;

CREATE POLICY "Anyone can read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- statuses
DROP POLICY IF EXISTS "Anyone can read statuses" ON public.statuses;
DROP POLICY IF EXISTS "Admins can manage statuses" ON public.statuses;

CREATE POLICY "Anyone can read statuses" ON public.statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage statuses" ON public.statuses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- websites
DROP POLICY IF EXISTS "Anyone can read websites" ON public.websites;
DROP POLICY IF EXISTS "Admins can manage websites" ON public.websites;

CREATE POLICY "Anyone can read websites" ON public.websites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage websites" ON public.websites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
