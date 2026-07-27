import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  body: string;
  isMine: boolean;
  senderName?: string;
  timestamp?: string;
  messageType?: string;
  bundled?: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Baghdad',
  });
}

export function MessageBubble({ body, isMine, senderName, timestamp, messageType }: Props) {
  if (messageType === 'payment_proposal') {
    let parsed = { method: '', amount: '', notes: '' };
    try { parsed = JSON.parse(body); } catch {}
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={styles.paymentBubble}>
          <Text style={styles.paymentLabel}>💰 اتفاقية دفع</Text>
          <Text style={styles.paymentText}>{parsed.method === 'zaincash' ? 'ZainCash' : 'Qi Card'}</Text>
          <Text style={styles.paymentText}>{Number(parsed.amount).toLocaleString('ar-IQ')} IQD</Text>
          {parsed.notes ? <Text style={styles.paymentNotes}>{parsed.notes}</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblesTheirs]}>
        {!isMine && senderName && (
          <Text style={styles.sender}>{senderName}</Text>
        )}
        <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
          {body}
        </Text>
        {timestamp && (
          <Text style={styles.time}>{formatTime(timestamp)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  bubbleMine: {
    backgroundColor: '#d97706',
    borderBottomEndRadius: 4,
  },
  bubblesTheirs: {
    backgroundColor: '#21262d',
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.white10,
  },
  sender: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.goldBright,
    marginBottom: 3,
    textAlign: 'right',
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  textMine: { color: '#fff' },
  textTheirs: { color: COLORS.white },
  time: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textAlign: 'right',
  },
  paymentBubble: {
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 4,
  },
  paymentLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.gold,
    textAlign: 'right',
  },
  paymentText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
  },
  paymentNotes: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
