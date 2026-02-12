
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS border_color TEXT DEFAULT '#d1d5db';
