-- ProfileDrawer.js has let any signed-in user (employee/customer/founder)
-- upload their own avatar to site-assets/avatars/{their own id}/... since
-- an earlier migration, but the only write policy on this bucket
-- (site_assets_write_founder, 20260716120000) is founder/co-admin only —
-- so every non-founder self-avatar upload has been silently failing with
-- a permission-denied error since that feature shipped. This adds a
-- narrow insert policy scoped to a user's own avatar folder, mirroring
-- the existing room-moderator path-scoping pattern on the same bucket.
create policy site_assets_write_own_avatar
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
