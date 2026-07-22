-- Remove any existing 'love' and 'angry' reactions before tightening the
-- constraint, so no existing row violates the new check.
delete from public.social_reactions where reaction_type in ('love', 'angry');

alter table public.social_reactions
  drop constraint if exists social_reactions_reaction_type_check;

alter table public.social_reactions
  add constraint social_reactions_reaction_type_check
  check (reaction_type in ('like', 'dislike'));
