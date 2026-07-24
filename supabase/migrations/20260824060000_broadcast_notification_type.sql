-- Add notification_type to allow filtering broadcast vs system notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type text DEFAULT 'general';
