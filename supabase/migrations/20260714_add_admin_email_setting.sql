-- Insert default admin notification email setting
INSERT INTO public.system_settings (key, value)
VALUES 
  ('admin_email_settings', '{"email": "admin@admin.com"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
