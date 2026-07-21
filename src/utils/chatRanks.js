// Member rank thresholds and visual styles for group chat bubbles.
// Ranks are computed from message_count (client-side from loaded messages,
// or from chat_member_stats if that migration has been applied).
export const RANKS = [
  {
    id: 'legend',
    minMessages: 200,
    label: { ar: 'المتفاعل الأسطورة', ckb: 'کارتێکنەری ئەسطووری' },
    emoji: '🔥',
    badgeClass: 'bg-orange-500/20 text-orange-300',
    bubbleClass: 'bubble-legendary text-white',
    nameClass: 'text-orange-300',
  },
  {
    id: 'enthusiast',
    minMessages: 80,
    label: { ar: 'عضو حماسي', ckb: 'ئەندامی هیجانبەخش' },
    emoji: '⚡',
    badgeClass: 'bg-purple-500/20 text-purple-300',
    bubbleClass: 'bg-purple-50 border border-purple-400/40 text-purple-950',
    nameClass: 'text-purple-600',
  },
  {
    id: 'active',
    minMessages: 30,
    label: { ar: 'عضو نشط', ckb: 'ئەندامی چالاک' },
    emoji: '✨',
    badgeClass: 'bg-blue-500/20 text-blue-300',
    bubbleClass: 'bg-blue-50 border border-blue-400/30 text-blue-950',
    nameClass: 'text-blue-600',
  },
  {
    id: 'persistent',
    minMessages: 10,
    label: { ar: 'عضو مثابر', ckb: 'ئەندامی بەردەوام' },
    emoji: '🌱',
    badgeClass: 'bg-emerald-500/20 text-emerald-300',
    bubbleClass: 'bg-emerald-50 border border-emerald-400/30 text-emerald-950',
    nameClass: 'text-emerald-600',
  },
  {
    id: 'new',
    minMessages: 0,
    label: { ar: 'عضو جديد', ckb: 'ئەندامی نوێ' },
    emoji: '👋',
    badgeClass: 'bg-white/10 text-white/50',
    bubbleClass: 'bg-white border border-gray-900/15 text-gray-900',
    nameClass: 'text-gray-500',
  },
];

export function getRank(messageCount) {
  for (const rank of RANKS) {
    if (messageCount >= rank.minMessages) return rank;
  }
  return RANKS[RANKS.length - 1];
}
