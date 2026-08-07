import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

export type DeletableKind = 'message' | 'comment' | 'post';

const COPY: Record<DeletableKind, { title: string; body: string }> = {
  message: {
    title: 'حذف الرسالة',
    body: 'هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.',
  },
  comment: {
    title: 'حذف التعليق',
    body: 'هل أنت متأكد من حذف هذا التعليق؟ لا يمكن التراجع عن هذا الإجراء.',
  },
  post: {
    title: 'حذف المنشور',
    body: 'هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.',
  },
};

/**
 * Confirms, deletes the row, then reports back.
 *
 * The `count: 'exact'` is the important part. PostgREST reports a delete that
 * RLS refused as a *successful* response affecting zero rows — no error object
 * at all. Without checking the count, a user without permission would see the
 * row vanish optimistically and reappear on the next refresh, with nothing
 * explaining why. Treating "zero rows affected" as a permission failure is what
 * makes that case visible.
 *
 * onDeleted only fires once the row is genuinely gone, so callers can remove it
 * from local state without risking a phantom deletion.
 */
export function confirmDelete(opts: {
  kind: DeletableKind;
  table: string;
  id: string;
  onDeleted: () => void;
}) {
  const { kind, table, id, onDeleted } = opts;
  const copy = COPY[kind];

  Alert.alert(copy.title, copy.body, [
    { text: 'إلغاء', style: 'cancel' },
    {
      text: 'حذف',
      style: 'destructive',
      onPress: async () => {
        const { error, count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .eq('id', id);

        if (error) {
          Alert.alert('تعذّر الحذف', error.message);
          return;
        }
        if (!count) {
          Alert.alert('تعذّر الحذف', 'لا تملك صلاحية حذف هذا العنصر.');
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onDeleted();
      },
    },
  ]);
}
