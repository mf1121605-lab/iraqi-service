-- Run this ONCE in the Supabase SQL Editor after deploying the app.
-- Replace the secret value below with what you set in PUSH_DISPATCH_SECRET
-- in Vercel environment variables.

update public.app_config
set value = 'https://iraqi-service.vercel.app/api/push/dispatch'
where key = 'push_dispatch_url';

update public.app_config
set value = 'a7e00e933463aecc8dcb6cff85265d453964220d0c2da6831fc5a61bec7cbb05'
where key = 'push_dispatch_secret';
