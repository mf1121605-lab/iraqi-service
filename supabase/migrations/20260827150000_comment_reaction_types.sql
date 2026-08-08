-- social_comment_reactions only ever supported a single boolean-like
-- "heart" toggle (no reaction_type column) — extend it to the same
-- 6-reaction set already used on posts (social_reactions) so comments
-- get the same full reaction picker.
alter table public.social_comment_reactions add column if not exists reaction_type text not null default 'like';
alter table public.social_comment_reactions drop constraint if exists social_comment_reactions_type_check;
alter table public.social_comment_reactions add constraint social_comment_reactions_type_check check (reaction_type in ('like', 'love', 'laugh', 'wow', 'sad', 'angry'));
