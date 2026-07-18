-- Optional security-question password recovery, filling the gap left by
-- removing SMS OTP and never having a customer email to send a reset link
-- to. recovery_question_id maps to a fixed pair of questions defined in
-- src/utils/i18n.js; the answer is never stored in plain text.
alter table public.profiles add column recovery_question_id smallint;
alter table public.profiles add column recovery_answer_hash text;

alter table public.profiles
  add constraint profiles_recovery_question_valid
  check (recovery_question_id is null or recovery_question_id in (1, 2));
