-- Stickers: a dedicated message_type ('text' | 'sticker') across all
-- three chat surfaces (group rooms, private request chat, DM threads).
-- A sticker message stores its emoji directly in the existing `body`
-- column (no new asset/image hosting needed) and renders large with no
-- bubble chrome — the existing body/attachment check constraints already
-- allow a body-only row, so no constraint changes needed beyond the type.
alter table public.chat_messages add column message_type text not null default 'text' check (message_type in ('text', 'sticker'));
alter table public.request_messages add column message_type text not null default 'text' check (message_type in ('text', 'sticker'));
alter table public.direct_messages add column message_type text not null default 'text' check (message_type in ('text', 'sticker'));
