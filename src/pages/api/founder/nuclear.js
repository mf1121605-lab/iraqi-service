import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  if (auth.caller.role !== 'founder') {
    return res.status(403).json({ error: 'founder only' });
  }

  const { action, passcode } = req.body ?? {};
  if (!['activate', 'deactivate'].includes(action)) {
    return res.status(400).json({ error: 'action must be activate or deactivate' });
  }

  const expected = process.env.FOUNDER_USERS_PASSCODE ?? '';
  if (!expected) return res.status(500).json({ error: 'passcode not configured' });
  const provided = String(passcode ?? '');
  const len = Math.max(expected.length, provided.length);
  const a = Buffer.alloc(len);
  Buffer.from(expected).copy(a);
  const b = Buffer.alloc(len);
  Buffer.from(provided).copy(b);
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });
  }

  if (action === 'activate') {
    const { error: lockError } = await supabaseAdmin
      .from('site_lockdown')
      .update({ active: true, activated_at: new Date().toISOString() })
      .eq('id', 1);
    if (lockError) return res.status(500).json({ error: lockError.message });

    const { error: wipeError } = await supabaseAdmin.rpc('fn_nuclear_wipe');
    if (wipeError) return res.status(500).json({ error: wipeError.message });

    return res.status(200).json({ ok: true, message: 'lockdown activated and data wiped' });
  }

  const { error } = await supabaseAdmin
    .from('site_lockdown')
    .update({ active: false, activated_at: null })
    .eq('id', 1);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, message: 'lockdown lifted' });
}
