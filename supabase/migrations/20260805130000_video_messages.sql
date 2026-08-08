ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'image', 'voice', 'video', 'order_alert'));

ALTER TABLE public.request_messages DROP CONSTRAINT IF EXISTS request_messages_message_type_check;
ALTER TABLE public.request_messages ADD CONSTRAINT request_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'payment_proposal', 'image', 'voice', 'video'));

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_message_type_check
  CHECK (message_type IN ('text', 'sticker', 'image', 'voice', 'video'));
