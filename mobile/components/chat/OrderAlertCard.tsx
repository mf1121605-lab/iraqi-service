import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  body: string;
}

interface AlertPayload {
  request_id: string;
  category: string;
  title: string;
  customer_name: string;
}

// Live "new request" card posted into the HQ room. Claiming re-uses the
// exact same requests.assigned_employee_id update the employee dashboard's
// own claim button already does — this card is a second surface for the
// same action, not a competing mechanism, so a claim from either place is
// instantly reflected on the other via this Realtime subscription.
export function OrderAlertCard({ body }: Props) {
  const { profile } = useAuth();
  const [payload, setPayload] = useState<AlertPayload | null>(null);
  const [assignedId, setAssignedId] = useState<string | null | undefined>(undefined);
  const [assignedName, setAssignedName] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setPayload(JSON.parse(body)); } catch { setPayload(null); }
  }, [body]);

  useEffect(() => {
    if (!payload?.request_id) return;

    async function load() {
      const { data } = await supabase
        .from('requests')
        .select('assigned_employee_id')
        .eq('id', payload!.request_id)
        .maybeSingle();
      setAssignedId(data?.assigned_employee_id ?? null);
    }
    load();

    const channel = supabase
      .channel(`order-alert-${payload.request_id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${payload.request_id}`,
      }, (p) => setAssignedId((p.new as { assigned_employee_id: string | null }).assigned_employee_id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // Deliberately depends on the stable request_id, not the whole payload
    // object — payload is a fresh object every time body is re-parsed, so
    // depending on it directly would resubscribe this channel constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.request_id]);

  useEffect(() => {
    if (!assignedId) { setAssignedName(''); return; }
    supabase
      .from('profiles')
      .select('given_name, family_name')
      .eq('id', assignedId)
      .maybeSingle()
      .then(({ data }) => setAssignedName([data?.given_name, data?.family_name].filter(Boolean).join(' ') || 'موظف'));
  }, [assignedId]);

  if (!payload || dismissed) return null;

  async function handleApprove() {
    if (!profile || !payload) return;
    setClaiming(true);
    await supabase.from('requests').update({ assigned_employee_id: profile.id, status: 'in_review' }).eq('id', payload.request_id);
    setClaiming(false);
  }

  const isClaimed = !!assignedId;
  const isMine = assignedId === profile?.id;

  return (
    <View style={styles.wrap}>
      <Text style={styles.badge}>🔔 طلب جديد</Text>
      <Text style={styles.title}>{payload.title}</Text>
      <Text style={styles.meta}>الزبون: {payload.customer_name}</Text>
      <Text style={styles.meta}>الخدمة: {payload.category}</Text>

      {assignedId === undefined ? (
        <ActivityIndicator color={COLORS.gold} size="small" style={{ marginTop: 8 }} />
      ) : isClaimed ? (
        <View style={styles.claimedPill}>
          <Text style={styles.claimedText}>
            {isMine ? 'قيد المعالجة معك' : `قيد المعالجة مع الموظف ${assignedName}`}
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={handleApprove} disabled={claiming} style={[styles.approveBtn, claiming && { opacity: 0.6 }]}>
            <Text style={styles.approveBtnText}>{claiming ? '...' : 'موافق'}</Text>
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} style={styles.rejectBtn}>
            <Text style={styles.rejectBtnText}>غير موافق</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(230,171,44,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.4)',
    gap: 4,
  },
  badge: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold, textAlign: 'right' },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, textAlign: 'right' },
  meta: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center' },
  approveBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#0d1117' },
  rejectBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center' },
  rejectBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#ef4444' },
  claimedPill: { marginTop: 8, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  claimedText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white70 },
});
