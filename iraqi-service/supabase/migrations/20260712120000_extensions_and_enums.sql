-- Extensions
create extension if not exists pgcrypto; -- gen_random_uuid()

-- Enums
create type user_role as enum ('founder', 'employee', 'customer');

create type account_status as enum ('active', 'suspended');

create type service_category as enum ('military', 'education', 'welfare', 'general');

-- قيد المراجعة -> (يحتاج تعديل / مقبول / مرفوض)
create type request_status as enum (
  'submitted',
  'in_review',
  'needs_changes',
  'approved',
  'rejected'
);
