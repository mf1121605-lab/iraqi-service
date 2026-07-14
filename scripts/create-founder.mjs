#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { isValidIraqiPhone, toE164 } from '../src/utils/phoneHelper.js';

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
  }

  const phone = getArg('phone');
  const password = getArg('password');
  const email = getArg('email');
  const givenName = getArg('given-name');
  const fatherName = getArg('father-name');
  const grandfatherName = getArg('grandfather-name');
  const familyName = getArg('family-name');
  const force = process.argv.includes('--force');

  if (!phone || !isValidIraqiPhone(phone)) {
    fail('--phone is required and must be a valid Iraqi mobile number (07xxxxxxxxx).');
  }
  if (!password || password.length < 8) {
    fail('--password is required and should be at least 8 characters.');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count: existingFounders, error: countError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'founder');

  if (countError) {
    fail(`could not check for an existing founder: ${countError.message}`);
  }
  if (existingFounders > 0 && !force) {
    fail(
      `A founder account already exists (${existingFounders}). This is designed as a single-founder ` +
        'system (see admin_level/co_admin in the schema) — pass --force if you really intend to create ' +
        'another one.'
    );
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: toE164(phone),
    email: email || undefined,
    password,
    phone_confirm: true,
    email_confirm: Boolean(email),
    user_metadata: { role: 'founder', phone: toE164(phone) },
  });

  if (createError) {
    fail(createError.message);
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      given_name: givenName ?? null,
      father_name: fatherName ?? null,
      grandfather_name: grandfatherName ?? null,
      family_name: familyName ?? null,
    })
    .eq('id', created.user.id);

  if (profileError) {
    fail(profileError.message);
  }

  console.log('Founder account created successfully.');
  console.log(`  id:    ${created.user.id}`);
  console.log(`  phone: ${toE164(phone)}`);
  console.log('Sign in at /employee (founders use the employee-style phone/email + password login).');
}

main().catch((err) => fail(err.message));
