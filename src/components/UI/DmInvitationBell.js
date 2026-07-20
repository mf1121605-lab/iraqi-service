import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MessageCircleMore, X } from 'lucide-react';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';

function displayNameFor(sender) {
  if (!sender) return '';
  if (sender.role === 'customer') return sender.given_name || 'مستخدم';
  return [sender.given_name, sender.family_name].filter(Boolean).join(' ') || sender.role;
}

// Mounted for every signed-in role — anyone in a shared chat room can send
// anyone else a DM request, not just staff. Fires the modal the instant an
// invitation lands (postgres_changes INSERT filtered to this user as the
// receiver), independent of which page they're currently on.
export default function DmInvitationBell({ userId, locale }) {
  const router = useRouter();
  const t = (path) => translate(locale, path);
  const [queue, setQueue] = useState([]);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabaseClient
      .channel(`dm-invitations-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_room_invitations', filter: `receiver_id=eq.${userId}` },
        async ({ new: row }) => {
          const { data: sender } = await supabaseClient
            .from('profiles')
            .select('given_name, family_name, role, avatar_key')
            .eq('id', row.sender_id)
            .maybeSingle();
          setQueue((current) => [...current, { ...row, sender }]);
        }
      )
      .subscribe();

    return () => supabaseClient.removeChannel(channel);
  }, [userId]);

  if (!userId) return null;

  const current = queue[0];

  function dismiss() {
    setQueue((rest) => rest.slice(1));
  }

  async function handleReject() {
    if (!current) return;
    setResponding(true);
    await supabaseClient.from('chat_room_invitations').update({ status: 'rejected' }).eq('id', current.id);
    setResponding(false);
    dismiss();
  }

  async function handleAccept() {
    if (!current) return;
    setResponding(true);
    const { data: threadId } = await supabaseClient.rpc('accept_chat_invitation', { p_invitation_id: current.id });
    setResponding(false);
    dismiss();
    if (threadId) router.push(`/chat/dm/${threadId}`);
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-sm rounded-[1.5rem] border border-gold-400/20 bg-surface-dark p-6 text-white shadow-[0_0_60px_-15px_rgba(230,171,44,0.4)]">
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.close')}
          className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold-400/15 text-gold-300">
          <MessageCircleMore className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="mt-3 text-center font-display text-lg font-bold">
          {t('dmInvitations.newRequestTitle').replace('{name}', displayNameFor(current.sender))}
        </h3>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleReject}
            disabled={responding}
            className="flex-1 rounded-xl2 border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {t('dmInvitations.rejectCta')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={responding}
            className="btn-cinematic-gold flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {t('dmInvitations.acceptCta')}
          </button>
        </div>
      </div>
    </div>
  );
}
