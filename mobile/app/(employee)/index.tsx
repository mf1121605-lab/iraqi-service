import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { HapticPressable } from '@/components/ui/HapticPressable';
import { Avatar } from '@/components/chat/Avatar';
import { ChatBackgroundLayer } from '@/components/chat/ChatBackgroundLayer';
import { ChatBackgroundPicker } from '@/components/chat/ChatBackgroundPicker';
import { ChatBgTheme, getChatBgTheme, setChatBgTheme } from '@/utils/chatBackgroundPrefs';
import { MessageBubble, MessageStatus } from '@/components/chat/MessageBubble';
import { ReactionPickerOverlay } from '@/components/ui/ReactionPickerOverlay';
import { buildChatReactions, DELETE_KEY, REPLY_KEY } from '@/constants/chatReactions';
import { confirmDelete } from '@/lib/confirmDelete';
import { VoiceRecorderBar } from '@/components/chat/VoiceRecorderBar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { uploadMediaSmart, type UploadHandle } from '@/lib/resumableUpload';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { playSound } from '@/utils/soundFX';
import {
  CREDIT_COMMISSION_RATE,
  CREDIT_PAYMENT_NOTE,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  creditFinalAmount,
} from '@/utils/paymentMethods';
import { CHAT_DOCUMENT_MIME_TYPES } from '@/constants/documentMimeTypes';

const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['mastercard', 'zaincash', 'credit'];

async function uploadAttachment(
  uri: string,
  userId: string,
  kind: 'image' | 'voice' | 'video' | 'file',
  onProgress?: (pct: number) => void,
  onHandle?: (handle: UploadHandle) => void,
  fileName?: string,
  mimeType?: string,
): Promise<string | null> {
  try {
    const ext = kind === 'voice'
      ? 'm4a'
      : kind === 'file'
        ? (fileName?.split('.').pop()?.toLowerCase() ?? 'bin')
        : (uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg'));
    const path = `chat/${userId}/${Date.now()}.${ext}`;
    const contentType = kind === 'voice'
      ? 'audio/m4a'
      : kind === 'video'
        ? `video/${ext === 'mov' ? 'quicktime' : ext}`
        : kind === 'file'
          ? (mimeType ?? 'application/octet-stream')
          : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // Dispatches by file size: small images go through a plain single-
    // request upload; long voice notes and videos go through the chunked,
    // resumable TUS path — see lib/resumableUpload.ts.
    let publicUrl: string | null = null;
    let uploadErr: Error | null = null;
    await uploadMediaSmart(uri, 'site-assets', path, contentType, {
      onProgress,
      onHandle,
      onSuccess: (url) => { publicUrl = url; },
      onError: (err) => { uploadErr = err; },
    });
    if (uploadErr) { console.error('upload failed:', uploadErr); return null; }
    return publicUrl;
  } catch (err) {
    console.error('upload failed:', err);
    return null;
  }
}

// Same upload approach onboarding.tsx uses for a self-avatar photo:
// arrayBuffer() rather than RN's unreliable Blob polyfill, uploaded to the
// self-writable avatars/{userId}/ path (site_assets_write_own_avatar).
async function uploadOwnPhoto(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) { console.error('avatar upload failed:', error.message); return null; }
    return path;
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ScreenView = 'list' | 'chat' | 'profile';
type QueueTab = 'requests' | 'quick';

interface RequestItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  assigned_employee_id: string | null;
  customer_id: string;
  created_at: string;
  service_id: string | null;
  service: { label_ar: string } | null;
  customer: { given_name: string | null; family_name: string | null; phone: string | null } | null;
}

interface QuickRequest {
  id: string;
  section_name: string;
  content: string;
  status: string;
  created_at: string;
  customer: { id: string; given_name: string | null; family_name: string | null; phone: string | null } | null;
}

interface Message {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  reply_to_id: string | null;
  message_type: string | null;
  created_at: string;
  read_at: string | null;
  reactions: { emoji: string; user_id: string }[];
}

interface HistoryEntry {
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

interface Category {
  key: string;
  label_ar: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Matches the real `request_status` enum — submitted is the only initial
// value; there is no separate pending/in_progress/completed/cancelled set.
const STATUS_LABELS: Record<string, string> = {
  submitted:     'قيد الانتظار',
  in_review:     'تحت المراجعة',
  needs_changes: 'يحتاج تعديلات',
  approved:      'موافق عليه',
  rejected:      'مرفوض',
};

const STATUS_COLORS: Record<string, string> = {
  submitted:     '#f59e0b',
  in_review:     '#8b5cf6',
  needs_changes: '#f97316',
  approved:      '#22c55e',
  rejected:      '#ef4444',
};

const EMPLOYEE_STATUS_OPTIONS = ['in_review', 'needs_changes', 'approved', 'rejected'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const color = STATUS_COLORS[status] ?? COLORS.muted;
  const label = STATUS_LABELS[status] ?? status;
  return (
    <View style={[pill.wrap, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <View style={[pill.dot, { backgroundColor: color }]} />
      <Text style={[pill.text, { color, fontSize: small ? 9 : 11 }]}>{label}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: { fontFamily: FONTS.bold },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
  const { profile, signOut, refreshProfile } = useAuth();
  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(' ') || 'الموظف';

  // Navigation
  const [view, setView] = useState<ScreenView>('list');
  const [queueTab, setQueueTab] = useState<QueueTab>('requests');

  // Queue data
  const [queue, setQueue] = useState<RequestItem[] | null>(null);
  const [quickRequests, setQuickRequests] = useState<QuickRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Chat data
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [customer, setCustomer] = useState<{ id: string; given_name: string | null; avatar_key: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [customerTyping, setCustomerTyping] = useState(false);
  const [bgTheme, setBgTheme] = useState<ChatBgTheme>('none');
  const [showBgPicker, setShowBgPicker] = useState(false);

  useEffect(() => { getChatBgTheme().then(setBgTheme); }, []);
  const flatListRef = useRef<FlashList<Message>>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingBroadcast = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat input
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadHandleRef = useRef<UploadHandle | null>(null);
  const [recording, setRecording] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // This screen never unmounts between the queue/chat/profile sub-views —
  // `view`/`selectedId` just switch which JSX the same component returns —
  // so a plain unmount-only cleanup would miss "tapped back to the queue
  // mid-upload" or "opened a different request's chat mid-upload". Keying
  // the effect on both means it also re-fires (and aborts) on those
  // transitions, on top of covering the real unmount case.
  useEffect(() => () => { uploadHandleRef.current?.abort(); }, [view, selectedId]);

  // Status update
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [nextStatus, setNextStatus] = useState('in_review');
  const [statusNote, setStatusNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mastercard');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');

  // Profile settings
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Accept/reject preview for an unclaimed request
  const [previewRequest, setPreviewRequest] = useState<RequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [decisionSaving, setDecisionSaving] = useState(false);

  // ── Load queue ────────────────────────────────────────────────────────────

  const loadQueue = useCallback(async () => {
    supabase.rpc('expire_stale_claims').then(() => {});
    const { data } = await supabase
      .from('requests')
      // service_id + its label lets the queue show the exact sub-service the
      // customer picked (e.g. "تحديث البيان السنوي") instead of only the
      // broad category — the founder's dynamic category-services system
      // already captures this at submission time, but the queue never
      // surfaced it before.
      .select('id, title, description, category, status, assigned_employee_id, customer_id, created_at, service_id, service:category_services(label_ar), customer:profiles!customer_id(given_name, family_name, phone)')
      .order('created_at', { ascending: false });
    setQueue((data ?? []) as unknown as RequestItem[]);
    setRefreshing(false);
  }, []);

  const loadQuickRequests = useCallback(async () => {
    const { data } = await supabase
      .from('quick_requests')
      .select('id, section_name, content, status, created_at, customer:profiles!customer_id(id, given_name, family_name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setQuickRequests((data ?? []) as unknown as QuickRequest[]);
  }, []);

  // ── Load employee extra fields ────────────────────────────────────────────

  useEffect(() => {
    if (!profile || profileLoaded) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('specialization, active_services, qualification, is_active, avatar_key')
        .eq('id', profile.id)
        .single();
      if (data) {
        setSpecialization(data.specialization ?? '');
        setActiveServices(data.active_services ?? []);
        setQualification(data.qualification ?? '');
        setIsActive(data.is_active ?? true);
        setAvatarKey(data.avatar_key ?? null);
      }
      setProfileLoaded(true);
    })();
  }, [profile, profileLoaded]);

  // ── Load categories ───────────────────────────────────────────────────────

  useEffect(() => {
    supabase
      .from('categories')
      .select('key, label_ar')
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data as Category[]); });
  }, []);

  // ── Initial data load + realtime ──────────────────────────────────────────

  useEffect(() => {
    if (!profile) return;
    loadQueue();
    loadQuickRequests();

    const channel = supabase
      .channel('employee-requests-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        loadQueue();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_requests' }, () => {
        loadQuickRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, loadQueue, loadQuickRequests]);

  // ── Chat realtime ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`emp-detail-${selectedId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'request_messages',
        filter: `request_id=eq.${selectedId}`,
      }, () => loadDetail(selectedId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_message_reactions' }, () => loadDetail(selectedId))
      .subscribe();

    const typingChannel = supabase
      .channel(`request-typing-${selectedId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { senderId } = payload.payload as { senderId: string };
        if (senderId === profile?.id) return;
        setCustomerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setCustomerTyping(false), 3000);
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setCustomerTyping(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current || !profile?.id) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { senderId: profile.id } });
  }, [profile?.id]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && view === 'chat') {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, view]);

  // ── Load chat detail ──────────────────────────────────────────────────────

  async function loadDetail(requestId: string) {
    setLoadingChat(true);
    const [{ data: msgRows }, { data: histRows }, { data: reqRow }] = await Promise.all([
      supabase
        .from('request_messages')
        .select('id, sender_id, body, attachment_url, reply_to_id, message_type, created_at, read_at, reactions:request_message_reactions(emoji, user_id)')
        .eq('request_id', requestId)
        .order('created_at'),
      supabase
        .from('request_status_history')
        .select('old_status, new_status, note, created_at')
        .eq('request_id', requestId)
        .order('created_at'),
      supabase.from('requests').select('customer_id').eq('id', requestId).maybeSingle(),
    ]);
    setMessages((msgRows ?? []) as Message[]);
    setHistory((histRows ?? []) as HistoryEntry[]);
    setLoadingChat(false);

    // Mark messages from customer as read
    const unread = (msgRows ?? []).filter((m: Message) => m.sender_id !== profile?.id && !m.read_at);
    if (unread.length > 0) {
      supabase
        .from('request_messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map((m: Message) => m.id))
        .then(() => {});
    }

    if (reqRow?.customer_id) {
      const { data: cust } = await supabase
        .from('profiles')
        .select('id, given_name, avatar_key')
        .eq('id', reqRow.customer_id)
        .maybeSingle();
      setCustomer(cust ?? null);
    } else {
      setCustomer(null);
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function openChat(req: RequestItem) {
    setSelectedId(req.id);
    setSelectedRequest(req);
    setMessages([]);
    setHistory([]);
    setShowStatusForm(false);
    setShowPaymentForm(false);
    setShowHistory(false);
    setMessageBody('');
    setReplyTo(null);
    setView('chat');
    loadDetail(req.id);
  }

  function openPreview(req: RequestItem) {
    setPreviewRequest(req);
    setDeclineReason('');
  }

  // موافق ✅ — accept_request() does the same claim the old instant button
  // did (assigned_employee_id + status='in_review'), but only after
  // verifying eligibility server-side; the customer's chat/notification
  // are unchanged, they already fire off any status change.
  async function handleAcceptPreview() {
    if (!profile || !previewRequest) return;
    setDecisionSaving(true);
    const { data, error } = await supabase.rpc('accept_request', { p_request_id: previewRequest.id });
    setDecisionSaving(false);
    if (error) {
      Alert.alert('تعذّر القبول', error.message);
      return;
    }
    const accepted = previewRequest;
    setPreviewRequest(null);
    await loadQueue();
    openChat({ ...accepted, assigned_employee_id: profile.id, status: (data?.status as string) ?? 'in_review' });
  }

  // غير موافق ❌ — logs the decline (with an optional reason) and drops
  // the request out of this supervisor's own queue; it stays visible to
  // any other supervisor still eligible for its category/service.
  async function handleDeclinePreview() {
    if (!previewRequest) return;
    setDecisionSaving(true);
    const { error } = await supabase.rpc('decline_request', {
      p_request_id: previewRequest.id,
      p_reason: declineReason.trim() || null,
    });
    setDecisionSaving(false);
    if (error) {
      Alert.alert('تعذّر الرفض', error.message);
      return;
    }
    setPreviewRequest(null);
    loadQueue();
  }

  async function handleStatusUpdate() {
    if (!selectedId) return;
    setStatusSaving(true);
    await supabase.rpc('set_request_status', {
      p_request_id: selectedId,
      p_new_status: nextStatus,
      p_note: statusNote || null,
    });
    setStatusNote('');
    setShowStatusForm(false);
    setStatusSaving(false);
    loadQueue();
    loadDetail(selectedId);
  }

  async function handleSend() {
    const text = messageBody.trim();
    if (!text || !profile || !selectedId) return;
    setSending(true);
    setMessageBody('');
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    await supabase.from('request_messages').insert({
      request_id: selectedId,
      sender_id: profile.id,
      body: text,
      message_type: 'text',
      reply_to_id: replyId,
    });
    playSound('messageSent');
    setSending(false);
  }

  async function pickAndSendImage() {
    if (!profile || !selectedId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور والفيديوهات من إعدادات الجهاز لإرسال المرفقات.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === 'video';
    setSending(true);
    setUploadProgress(0);
    const url = await uploadAttachment(
      asset.uri, profile.id, isVideo ? 'video' : 'image', setUploadProgress,
      (h) => { uploadHandleRef.current = h; },
    );
    uploadHandleRef.current = null;
    setUploadProgress(null);
    if (url) {
      await supabase.from('request_messages').insert({
        request_id: selectedId, sender_id: profile.id, body: isVideo ? '🎬 فيديو' : '📷 صورة',
        message_type: isVideo ? 'video' : 'image', attachment_url: url, reply_to_id: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع المرفق، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function pickAndSendDocument() {
    if (!profile || !selectedId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: CHAT_DOCUMENT_MIME_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setSending(true);
    setUploadProgress(0);
    const url = await uploadAttachment(
      asset.uri, profile.id, 'file', setUploadProgress,
      (h) => { uploadHandleRef.current = h; }, asset.name, asset.mimeType,
    );
    uploadHandleRef.current = null;
    setUploadProgress(null);
    if (url) {
      await supabase.from('request_messages').insert({
        request_id: selectedId, sender_id: profile.id, body: `📎 ${asset.name}`,
        message_type: 'file', attachment_url: url, reply_to_id: replyTo?.id ?? null,
      });
      setReplyTo(null);
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع الملف، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function sendVoice(uri: string, durationMs: number) {
    if (!profile || !selectedId) return;
    setRecording(false);
    if (durationMs < 800) return;
    setSending(true);
    setUploadProgress(0);
    const url = await uploadAttachment(
      uri, profile.id, 'voice', setUploadProgress,
      (h) => { uploadHandleRef.current = h; },
    );
    uploadHandleRef.current = null;
    setUploadProgress(null);
    if (url) {
      await supabase.from('request_messages').insert({
        request_id: selectedId, sender_id: profile.id, body: '🎤 رسالة صوتية',
        message_type: 'voice', attachment_url: url,
      });
    } else {
      Alert.alert('تعذّر الإرسال', 'حدث خطأ أثناء رفع الرسالة الصوتية، حاول مرة أخرى.');
    }
    setSending(false);
  }

  async function pickReaction(messageId: string, emoji: string) {
    if (!profile) return;
    const msg = messages.find((m) => m.id === messageId);
    const mine = msg?.reactions.find((r) => r.user_id === profile.id);
    if (mine) await supabase.from('request_message_reactions').delete().eq('message_id', messageId).eq('user_id', profile.id);
    if (!mine || mine.emoji !== emoji) {
      await supabase.from('request_message_reactions').insert({ message_id: messageId, user_id: profile.id, emoji });
      playSound('reaction');
    }
  }

  function summarizeReactions(reactions: { emoji: string; user_id: string }[]) {
    const counts: Record<string, number> = {};
    reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] ?? 0) + 1; });
    return Object.entries(counts).map(([emoji, count]) => ({ emoji, count, mine: false }));
  }

  // Stable across renders driven by anything other than messages/profile/
  // customer changing (payment form toggling, upload progress ticking).
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender_id === profile?.id;
    const prev = messages[index - 1];
    const bundled = !!(prev && prev.sender_id === item.sender_id &&
      new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() < 120_000);
    const replySource = item.reply_to_id ? messages.find((m) => m.id === item.reply_to_id) : null;
    const status: MessageStatus = item.read_at ? 'read' : 'sent';
    return (
      <ReactionPickerOverlay
        reactions={buildChatReactions(isMine)}
        align={isMine ? 'end' : 'start'}
        onSelectReaction={(key) => {
          // Reply rides in the bar as a seventh slot so long-press
          // still offers it, exactly as the old popover did.
          if (key === REPLY_KEY) setReplyTo(item);
          else if (key === DELETE_KEY) {
            confirmDelete({
              kind: 'message',
              table: 'request_messages',
              id: item.id,
              // Drop it locally too: the realtime DELETE event is the usual
              // path, but this keeps the list right if that socket is down.
              onDeleted: () => setMessages((cur) => cur.filter((m) => m.id !== item.id)),
            });
          }
          else pickReaction(item.id, key);
        }}
      >
        <MessageBubble
          body={item.body ?? ''}
          isMine={isMine}
          timestamp={item.created_at}
          messageType={item.message_type ?? undefined}
          attachmentUrl={item.attachment_url}
          attachmentType={
            item.message_type === 'image' ? 'image' :
            item.message_type === 'voice' ? 'voice' :
            item.message_type === 'video' ? 'video' :
            item.message_type === 'file' ? 'file' : null
          }
          senderAvatarKey={!isMine ? customer?.avatar_key : undefined}
          onSenderPress={!isMine && customer?.id ? () => router.push({ pathname: '/user/[userId]', params: { userId: customer.id } }) : undefined}
          status={isMine ? status : undefined}
          reactions={summarizeReactions(item.reactions)}
          replyTo={replySource ? { body: replySource.body ?? '' } : null}
          bundled={bundled}
        />
      </ReactionPickerOverlay>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, profile, customer]);

  async function handleLogPayment() {
    if (!paymentAmount || !selectedId || !profile || !selectedRequest) return;
    setPaymentSaving(true);
    const baseAmount = parseFloat(paymentAmount);
    const isCredit = paymentMethod === 'credit';
    const amount = isCredit ? creditFinalAmount(baseAmount) : baseAmount;
    const payloadBody = JSON.stringify({ method: paymentMethod, amount, notes: paymentNotes });

    await Promise.all([
      supabase.from('request_payments').insert({
        request_id: selectedId,
        employee_id: profile.id,
        customer_id: selectedRequest.customer_id,
        method: paymentMethod,
        amount,
        base_amount: isCredit ? baseAmount : null,
        commission_rate: isCredit ? CREDIT_COMMISSION_RATE * 100 : null,
        notes: paymentNotes || null,
        logged_by: profile.id,
      }),
      supabase.from('request_messages').insert({
        request_id: selectedId,
        sender_id: profile.id,
        body: payloadBody,
        message_type: 'payment_proposal',
      }),
    ]);

    setPaymentAmount('');
    setPaymentNotes('');
    setShowPaymentForm(false);
    setPaymentSuccess('تم تسجيل الدفعة بنجاح ✓');
    setTimeout(() => setPaymentSuccess(''), 3000);
    setPaymentSaving(false);
    loadDetail(selectedId);
  }

  async function handleSendCreditNote() {
    if (!selectedId || !profile) return;
    await supabase.from('request_messages').insert({
      request_id: selectedId,
      sender_id: profile.id,
      body: CREDIT_PAYMENT_NOTE,
      message_type: 'text',
    });
    loadDetail(selectedId);
  }

  async function handleAcceptQuick(requestId: string) {
    const { data, error } = await supabase.rpc('accept_quick_request', { p_request_id: requestId });
    if (!error && data) {
      Alert.alert('قبلت الطلب', 'تم فتح محادثة خاصة مع الزبون.');
      loadQuickRequests();
    }
  }

  async function handleRejectQuick(requestId: string) {
    await supabase.rpc('reject_quick_request', { p_request_id: requestId });
    loadQuickRequests();
  }

  async function toggleService(key: string) {
    if (!profile) return;
    const next = activeServices.includes(key)
      ? activeServices.filter((k) => k !== key)
      : [...activeServices, key];
    setActiveServices(next);
    await supabase.from('profiles').update({ active_services: next }).eq('id', profile.id);
    loadQueue();
  }

  async function saveProfile() {
    if (!profile) return;
    setProfileSaving(true);
    await supabase.from('profiles').update({ specialization, qualification: qualification.trim() || null }).eq('id', profile.id);
    setProfileSaving(false);
    refreshProfile();
  }

  async function toggleActive(value: boolean) {
    if (!profile) return;
    setIsActive(value);
    await supabase.from('profiles').update({ is_active: value }).eq('id', profile.id);
    refreshProfile();
  }

  async function handlePickAvatar() {
    if (!profile) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور من إعدادات الجهاز.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUploading(true);
    const path = await uploadOwnPhoto(result.assets[0].uri, profile.id);
    if (path) {
      await supabase.from('profiles').update({ avatar_key: path }).eq('id', profile.id);
      setAvatarKey(path);
      refreshProfile();
    } else {
      Alert.alert('تعذّر الرفع', 'تعذّر رفع الصورة، حاول مرة أخرى');
    }
    setAvatarUploading(false);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'profile') {
    return (
      <ScreenBg>
        <View style={styles.navBar}>
          <Pressable onPress={() => setView('list')} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backIcon}>›</Text>
          </Pressable>
          <Text style={styles.navTitle}>إعدادات الملف الوظيفي</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.profileScroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🖼️ الصورة الشخصية</Text>
            <View style={avatarStyles.row}>
              <Avatar avatarKey={avatarKey} name={fullName} seed={profile?.id} size={64} />
              <Pressable
                onPress={handlePickAvatar}
                disabled={avatarUploading}
                style={({ pressed }) => [avatarStyles.changeBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={avatarStyles.changeBtnText}>{avatarUploading ? '...' : 'تغيير الصورة'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <View style={avatarStyles.row}>
              <Switch
                value={isActive}
                onValueChange={toggleActive}
                thumbColor={isActive ? COLORS.gold : '#888'}
                trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{isActive ? '🟢 نشط' : '⚪ غير نشط'}</Text>
                <Text style={styles.cardSub}>عند إيقاف النشاط لن تظهر ضمن قائمة المشرفين المتاحين للزبائن</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎓 الشهادة / التخصص العلمي</Text>
            <TextInput
              value={qualification}
              onChangeText={setQualification}
              placeholder="مثال: بكالوريوس حقوق"
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              textAlign="right"
            />
            <Text style={styles.cardTitle}>🎯 التخصص</Text>
            <TextInput
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="مثال: معاملات عسكرية، دراسية..."
              placeholderTextColor={COLORS.white40}
              style={styles.input}
              textAlign="right"
            />
            <Pressable
              onPress={saveProfile}
              disabled={profileSaving}
              style={({ pressed }) => [styles.goldBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.goldBtnText}>{profileSaving ? '...' : 'حفظ'}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 الخدمات النشطة</Text>
            <Text style={styles.cardSub}>اختر الفئات التي تعمل عليها — ستظهر لك طلباتها فقط</Text>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                onPress={() => toggleService(cat.key)}
                style={styles.serviceRow}
              >
                <View style={[styles.serviceCheckbox, activeServices.includes(cat.key) && styles.serviceCheckboxActive]}>
                  {activeServices.includes(cat.key) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.serviceLabel}>{cat.label_ar}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScreenBg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT VIEW
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'chat' && selectedRequest) {
    const isClosed = ['approved', 'rejected'].includes(selectedRequest.status);
    const custName = customer?.given_name ?? 'الزبون';

    return (
      <ScreenBg>
        <ChatBackgroundLayer theme={bgTheme} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Nav header */}
          <View style={styles.chatNavBar}>
            <Pressable onPress={() => setView('list')} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backIcon}>›</Text>
            </Pressable>
            <Avatar
              avatarKey={customer?.avatar_key}
              name={custName}
              seed={customer?.id}
              size={34}
            />
            <View style={styles.chatNavCenter}>
              <Text style={styles.chatNavTitle} numberOfLines={1}>{selectedRequest.title}</Text>
              {customerTyping ? (
                <Text style={styles.typingIndicator}>الزبون يكتب...</Text>
              ) : (
                <StatusPill status={selectedRequest.status} small />
              )}
            </View>
            <Pressable onPress={() => setShowBgPicker(true)} style={styles.settingsBtn} hitSlop={8}>
              <Text style={styles.settingsIcon}>🎨</Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowStatusForm((v) => !v); setShowHistory(false); }}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Text style={[styles.settingsIcon, showStatusForm && { color: COLORS.gold }]}>⚙️</Text>
            </Pressable>
          </View>
          <ChatBackgroundPicker
            visible={showBgPicker}
            current={bgTheme}
            onSelect={(t) => { setBgTheme(t); setChatBgTheme(t); setShowBgPicker(false); }}
            onClose={() => setShowBgPicker(false)}
          />

          {/* Status update panel */}
          {showStatusForm && (
            <View style={styles.statusPanel}>
              <Text style={styles.statusPanelTitle}>تحديث حالة الطلب</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                {EMPLOYEE_STATUS_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setNextStatus(s)}
                    style={[styles.statusOption, nextStatus === s && styles.statusOptionActive]}
                  >
                    <Text style={[styles.statusOptionText, nextStatus === s && { color: COLORS.gold }]}>
                      {STATUS_LABELS[s] ?? s}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={statusNote}
                onChangeText={setStatusNote}
                placeholder="ملاحظة (اختياري)..."
                placeholderTextColor={COLORS.white40}
                style={styles.statusNoteInput}
                textAlign="right"
              />
              <Pressable
                onPress={handleStatusUpdate}
                disabled={statusSaving}
                style={({ pressed }) => [styles.goldBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.goldBtnText}>{statusSaving ? '...' : 'حفظ التحديث'}</Text>
              </Pressable>

              {/* History toggle */}
              <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.historyToggle}>
                <Text style={styles.historyToggleText}>
                  {showHistory ? '▲ إخفاء سجل الحالات' : '▼ سجل الحالات'}
                </Text>
              </Pressable>
              {showHistory && (
                <View style={styles.historyList}>
                  {history.length === 0 ? (
                    <Text style={styles.historyEmpty}>لا يوجد تاريخ بعد</Text>
                  ) : (
                    history.map((entry, i) => (
                      <View key={i} style={styles.historyItem}>
                        <Text style={styles.historyStatus}>{STATUS_LABELS[entry.new_status] ?? entry.new_status}</Text>
                        <Text style={styles.historyTime}>
                          {new Date(entry.created_at).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}
                        </Text>
                        {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* Messages */}
          {loadingChat ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          ) : (
            <FlashList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.msgList}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={80}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatEmoji}>💬</Text>
                  <Text style={styles.emptyChatText}>لا توجد رسائل بعد — ابدأ المحادثة</Text>
                </View>
              }
              renderItem={renderMessage}
            />
          )}

          {/* Payment success toast */}
          {paymentSuccess ? (
            <View style={styles.paymentSuccessToast}>
              <Text style={styles.paymentSuccessText}>{paymentSuccess}</Text>
            </View>
          ) : null}

          {/* Payment form */}
          {showPaymentForm && (
            <View style={styles.paymentForm}>
              <View style={styles.paymentFormHeader}>
                <Text style={styles.paymentFormTitle}>💰 تسجيل اتفاقية دفع</Text>
                <Pressable onPress={() => setShowPaymentForm(false)} hitSlop={8}>
                  <Text style={styles.paymentFormClose}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.methodRow}>
                {PAYMENT_METHOD_OPTIONS.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setPaymentMethod(m)}
                    style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                  >
                    <Text style={[styles.methodBtnText, paymentMethod === m && { color: '#000' }]}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder={paymentMethod === 'credit' ? 'قيمة كارت الرصيد الأصلية' : 'المبلغ بالدينار العراقي'}
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                keyboardType="numeric"
                textAlign="right"
              />
              {paymentMethod === 'credit' && !!paymentAmount && !Number.isNaN(parseFloat(paymentAmount)) && (
                <Text style={styles.creditPreview}>
                  المبلغ النهائي بعد عمولة 40%: {creditFinalAmount(parseFloat(paymentAmount)).toLocaleString('ar-IQ')} د.ع
                </Text>
              )}
              <TextInput
                value={paymentNotes}
                onChangeText={setPaymentNotes}
                placeholder="ملاحظات (اختياري)"
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                textAlign="right"
              />
              <Pressable
                onPress={handleLogPayment}
                disabled={paymentSaving || !paymentAmount}
                style={({ pressed }) => [styles.goldBtn, (!paymentAmount || paymentSaving) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.goldBtnText}>{paymentSaving ? '...' : 'تثبيت وإصدار وصل الدفع'}</Text>
              </Pressable>
              <Pressable onPress={handleSendCreditNote} style={styles.creditNoteBtn}>
                <Text style={styles.creditNoteBtnText}>ℹ️ إرسال ملاحظة الدفع بالرصيد للزبون</Text>
              </Pressable>
            </View>
          )}

          {/* Reply preview */}
          {replyTo && !isClosed && (
            <View style={styles.replyBar}>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Text style={styles.replyBarClose}>✕</Text>
              </Pressable>
              <Text style={styles.replyBarText} numberOfLines={1}>الرد على: {replyTo.body}</Text>
            </View>
          )}

          {/* Input bar */}
          {!isClosed ? (
            recording ? (
              <VoiceRecorderBar onSend={sendVoice} onCancel={() => setRecording(false)} />
            ) : (
              <>
              {uploadProgress !== null && (
                <View style={uploadBarStyles.row}>
                  <View style={uploadBarStyles.track}>
                    <View style={[uploadBarStyles.fill, { width: `${uploadProgress}%` }]} />
                  </View>
                  <Text style={uploadBarStyles.text}>{uploadProgress}%</Text>
                </View>
              )}
              <View style={styles.inputBar}>
                <Pressable
                  onPress={() => setShowPaymentForm((v) => !v)}
                  style={[styles.toolBtn, showPaymentForm && styles.toolBtnActive]}
                  hitSlop={6}
                >
                  <Text style={styles.toolBtnIcon}>💰</Text>
                </Pressable>
                <TextInput
                  value={messageBody}
                  onChangeText={(t) => { setMessageBody(t); broadcastTyping(); }}
                  placeholder="اكتب رسالة..."
                  placeholderTextColor={COLORS.white40}
                  style={styles.textInput}
                  multiline
                  textAlign="right"
                  maxLength={2000}
                />
                <Pressable style={styles.toolBtn} onPress={pickAndSendDocument} disabled={sending} hitSlop={6}>
                  <Text style={styles.toolBtnIcon}>📎</Text>
                </Pressable>
                <Pressable style={styles.toolBtn} onPress={pickAndSendImage} disabled={sending} hitSlop={6}>
                  <Text style={styles.toolBtnIcon}>🖼️</Text>
                </Pressable>
                {messageBody.trim() ? (
                  <Pressable
                    onPress={handleSend}
                    disabled={sending}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      sending && styles.sendBtnDisabled,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {sending ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Ionicons name="arrow-up" size={20} color="#000" />
                    )}
                  </Pressable>
                ) : (
                  <Pressable style={styles.micBtn} onPress={() => setRecording(true)} disabled={sending} hitSlop={6}>
                    <Text style={styles.micIcon}>🎤</Text>
                  </Pressable>
                )}
              </View>
              </>
            )
          ) : (
            <View style={styles.closedBar}>
              <Text style={styles.closedText}>
                {selectedRequest.status === 'approved' ? '✅ تم إنجاز الطلب' : '❌ تم رفض الطلب'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </ScreenBg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────

  const myRequests = queue?.filter((r) => r.assigned_employee_id === profile?.id) ?? [];
  const unclaimedRequests = queue?.filter((r) => !r.assigned_employee_id) ?? [];
  const allVisible = [...unclaimedRequests, ...myRequests.filter((r) => !unclaimedRequests.find((u) => u.id === r.id))];
  const pending = myRequests.filter((r) => r.status === 'submitted').length;
  const inProgress = myRequests.filter((r) => r.status === 'in_review').length;
  const completed = myRequests.filter((r) => r.status === 'approved').length;
  const quickBadge = quickRequests?.length ?? 0;

  if (queue === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadQueue(); loadQuickRequests(); }}
            tintColor={COLORS.gold}
          />
        }
      >
        {/* Header */}
        <View style={styles.listHeader}>
          <Pressable onPress={() => { Alert.alert('تسجيل الخروج', 'هل تريد الخروج؟', [{ text: 'إلغاء', style: 'cancel' }, { text: 'خروج', style: 'destructive', onPress: signOut }]); }} hitSlop={8}>
            <Text style={styles.headerIcon}>🚪</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Image source={require('@/assets/full-logo-transparent.png')} style={styles.headerLogo} contentFit="contain" />
            <View style={styles.headerBadgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>موظف</Text>
              </View>
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>موثّق ✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.empName}>{fullName}</Text>
          </View>
          <Pressable onPress={() => setView('profile')} hitSlop={8}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: pending, label: 'انتظار', color: '#f59e0b', emoji: '⏳' },
            { value: inProgress, label: 'معالجة', color: '#3b82f6', emoji: '⚡' },
            { value: completed, label: 'مكتملة', color: '#22c55e', emoji: '✅' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderColor: s.color + '30' }]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Queue tabs */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setQueueTab('requests')}
            style={[styles.tab, queueTab === 'requests' && styles.tabActive]}
          >
            <Text style={[styles.tabText, queueTab === 'requests' && styles.tabTextActive]}>📋 الطلبات</Text>
          </Pressable>
          <Pressable
            onPress={() => setQueueTab('quick')}
            style={[styles.tab, queueTab === 'quick' && styles.tabActive, queueTab === 'quick' && styles.tabActiveQuick]}
          >
            <Text style={[styles.tabText, queueTab === 'quick' && styles.tabTextQuick]}>
              ⚡ سريع{quickBadge > 0 ? ` (${quickBadge})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Requests list */}
        {queueTab === 'requests' ? (
          allVisible.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
              <Text style={styles.emptySub}>ستظهر هنا الطلبات المتاحة</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {allVisible.map((req) => {
                const isMine = req.assigned_employee_id === profile?.id;
                const isUnclaimed = !req.assigned_employee_id;
                const statusColor = STATUS_COLORS[req.status] ?? COLORS.muted;
                return (
                  <Pressable
                    key={req.id}
                    onPress={() => isMine ? openChat(req) : openPreview(req)}
                    style={({ pressed }) => [
                      styles.reqCard,
                      isUnclaimed && styles.reqCardUnclaimed,
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <View style={[styles.accentBar, { backgroundColor: statusColor }]} />
                    <View style={styles.reqCardInner}>
                      <View style={styles.reqCardTop}>
                        <StatusPill status={req.status} small />
                        <Text style={styles.reqTitle} numberOfLines={2}>{req.title}</Text>
                      </View>
                      <View style={styles.reqCardBottom}>
                        {isUnclaimed ? (
                          <HapticPressable
                            onPress={() => openPreview(req)}
                            style={styles.claimBtn}
                          >
                            <Text style={styles.claimBtnText}>عرض والقرار</Text>
                          </HapticPressable>
                        ) : (
                          <View style={styles.myBadge}>
                            <Text style={styles.myBadgeText}>طلبي</Text>
                          </View>
                        )}
                        <Text style={styles.reqCategory}>
                          {req.service?.label_ar ?? categories.find((c) => c.key === req.category)?.label_ar ?? req.category}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : (
          /* Quick requests */
          quickRequests === null ? (
            <View style={styles.center}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          ) : quickRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyTitle}>لا توجد طلبات سريعة</Text>
              <Text style={styles.emptySub}>ستظهر هنا طلبات الزبائن السريعة</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {quickRequests.map((req) => {
                const name = [req.customer?.given_name, req.customer?.family_name].filter(Boolean).join(' ') || '—';
                return (
                  <View key={req.id} style={styles.quickCard}>
                    <Text style={styles.quickSection}>{req.section_name}</Text>
                    <Text style={styles.quickCustomer}>👤 {name}</Text>
                    <Text style={styles.quickContent} numberOfLines={4}>{req.content}</Text>
                    <View style={styles.quickActions}>
                      <Pressable
                        onPress={() => handleAcceptQuick(req.id)}
                        style={({ pressed }) => [styles.quickAccept, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.quickAcceptText}>✓ قبول</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectQuick(req.id)}
                        style={({ pressed }) => [styles.quickReject, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.quickRejectText}>✕ رفض</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Accept / reject preview for an unclaimed request */}
      <Modal
        visible={!!previewRequest}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewRequest(null)}
      >
        <View style={previewStyles.backdrop}>
          <View style={previewStyles.card}>
            <Text style={previewStyles.title} numberOfLines={2}>{previewRequest?.title}</Text>
            <Text style={previewStyles.meta}>
              {previewRequest?.service?.label_ar
                ?? categories.find((c) => c.key === previewRequest?.category)?.label_ar
                ?? previewRequest?.category}
            </Text>
            {previewRequest?.customer && (
              <Text style={previewStyles.customer}>
                👤 {[previewRequest.customer.given_name, previewRequest.customer.family_name].filter(Boolean).join(' ') || 'زبون'}
                {previewRequest.customer.phone ? ` — ${previewRequest.customer.phone}` : ''}
              </Text>
            )}
            {previewRequest?.description ? (
              <Text style={previewStyles.desc} numberOfLines={5}>{previewRequest.description}</Text>
            ) : null}
            <TextInput
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="سبب الرفض (اختياري)"
              placeholderTextColor={COLORS.white40}
              style={previewStyles.reasonInput}
              textAlign="right"
            />
            <View style={previewStyles.actionsRow}>
              <Pressable
                disabled={decisionSaving}
                onPress={handleAcceptPreview}
                style={({ pressed }) => [previewStyles.acceptBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={previewStyles.acceptText}>{decisionSaving ? '...' : '✅ موافق'}</Text>
              </Pressable>
              <Pressable
                disabled={decisionSaving}
                onPress={handleDeclinePreview}
                style={({ pressed }) => [previewStyles.rejectBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={previewStyles.rejectText}>{decisionSaving ? '...' : '❌ غير موافق'}</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setPreviewRequest(null)} hitSlop={8} style={previewStyles.closeBtn}>
              <Text style={previewStyles.closeText}>إغلاق</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenBg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const uploadBarStyles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 6 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.gold },
  text: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.gold, minWidth: 28, textAlign: 'left' },
});

const avatarStyles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  changeBtn: { backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  changeBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
});

const previewStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#161b22', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.goldBorder, padding: 18, gap: 10 },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white, textAlign: 'right' },
  meta: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right' },
  customer: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right' },
  desc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right', lineHeight: 19 },
  reasonInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13,
  },
  actionsRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: { flex: 1, backgroundColor: 'rgba(34,197,94,0.16)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)', borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  acceptText: { fontFamily: FONTS.bold, fontSize: 14, color: '#22c55e' },
  rejectBtn: { flex: 1, backgroundColor: 'rgba(239,68,68,0.14)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)', borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  rejectText: { fontFamily: FONTS.bold, fontSize: 14, color: '#ef4444' },
  closeBtn: { alignItems: 'center', paddingVertical: 6 },
  closeText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white40 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },

  // Header
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 },
  headerIcon: { fontSize: 22, padding: 6 },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerLogo: { width: 30, height: 30 * (823 / 900) },
  headerBadgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  roleBadge: { backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  roleBadgeText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  verifiedBadge: { backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  verifiedText: { fontFamily: FONTS.bold, fontSize: 11, color: '#3b82f6' },
  empName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#161b22', borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: FONTS.bold, fontSize: 22 },
  statLabel: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(230,171,44,0.15)' },
  tabActiveQuick: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tabText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white40 },
  tabTextActive: { color: COLORS.gold },
  tabTextQuick: { color: '#f59e0b' },

  // Request cards
  list: { gap: 10 },
  reqCard: { backgroundColor: '#161b22', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, flexDirection: 'row', overflow: 'hidden' },
  reqCardUnclaimed: { borderColor: 'rgba(230,171,44,0.25)', backgroundColor: 'rgba(230,171,44,0.04)' },
  accentBar: { width: 4 },
  reqCardInner: { flex: 1, padding: 12, gap: 8 },
  reqCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'space-between' },
  reqTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, flex: 1, textAlign: 'right' },
  reqCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reqCategory: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white40 },
  claimBtn: { backgroundColor: 'rgba(230,171,44,0.15)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.4)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  claimBtnText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  myBadge: { backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  myBadgeText: { fontFamily: FONTS.bold, fontSize: 10, color: '#60a5fa' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10, backgroundColor: '#161b22', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  // Quick cards
  quickCard: { backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', borderRadius: RADIUS.md, padding: 14, gap: 8 },
  quickSection: { fontFamily: FONTS.bold, fontSize: 11, color: '#f59e0b' },
  quickCustomer: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  quickContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, lineHeight: 20, textAlign: 'right' },
  quickActions: { flexDirection: 'row', gap: 8 },
  quickAccept: { flex: 1, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  quickAcceptText: { fontFamily: FONTS.bold, fontSize: 12, color: '#22c55e' },
  quickReject: { flex: 1, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  quickRejectText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },

  // ── Chat view ──────────────────────────────────────────────────────────────
  chatNavBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 10, backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: 'rgba(230,171,44,0.15)', gap: 8 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.white10 },
  navTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, flex: 1, textAlign: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(230,171,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: COLORS.gold, lineHeight: 28 },
  chatNavCenter: { flex: 1, gap: 4 },
  chatNavTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'right' },
  typingIndicator: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  settingsBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20, color: COLORS.muted },

  // Status panel
  statusPanel: { backgroundColor: '#161b22', borderBottomWidth: 1, borderBottomColor: 'rgba(230,171,44,0.15)', padding: 12, gap: 10 },
  statusPanelTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right' },
  statusScroll: { flexGrow: 0 },
  statusOption: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 6 },
  statusOptionActive: { backgroundColor: 'rgba(230,171,44,0.15)', borderColor: 'rgba(230,171,44,0.5)' },
  statusOptionText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white70 },
  statusNoteInput: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },

  // History
  historyToggle: { paddingVertical: 4 },
  historyToggleText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  historyList: { gap: 8, paddingTop: 4 },
  historyEmpty: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  historyItem: { borderRightWidth: 2, borderRightColor: 'rgba(230,171,44,0.3)', paddingRight: 10, gap: 2 },
  historyStatus: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  historyTime: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted },
  historyNote: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white50 },

  // Messages
  msgList: { padding: 12, paddingBottom: 8 },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatEmoji: { fontSize: 40 },
  emptyChatText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  // Payment
  paymentSuccessToast: { backgroundColor: 'rgba(34,197,94,0.15)', borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 16, paddingVertical: 8 },
  paymentSuccessText: { fontFamily: FONTS.bold, fontSize: 13, color: '#22c55e', textAlign: 'center' },
  paymentForm: { backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(230,171,44,0.2)', padding: 14, gap: 10 },
  paymentFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentFormTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  paymentFormClose: { fontSize: 16, color: COLORS.muted, padding: 4 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center' },
  methodBtnActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  methodBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white70 },
  creditPreview: { fontFamily: FONTS.bold, fontSize: 12, color: '#22c55e', textAlign: 'right', marginTop: -6, marginBottom: 4 },
  creditNoteBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 2 },
  creditNoteBtnText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white50, textDecorationLine: 'underline' },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 10, gap: 8, backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(230,171,44,0.15)' },
  toolBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  toolBtnActive: { backgroundColor: 'rgba(230,171,44,0.2)' },
  toolBtnIcon: { fontSize: 18 },
  textInput: { flex: 1, backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14, maxHeight: 100, minHeight: 42 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(230,171,44,0.3)' },
  sendIcon: { fontSize: 20, color: '#000', fontFamily: FONTS.bold },
  micBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(230,171,44,0.12)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)', alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 17 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(230,171,44,0.15)', borderTopWidth: 1, borderTopColor: 'rgba(230,171,44,0.2)' },
  replyBarClose: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  replyBarText: { flex: 1, fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold, textAlign: 'right' },
  closedBar: { paddingVertical: 14, alignItems: 'center', backgroundColor: '#161b22', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: Platform.OS === 'ios' ? 28 : 14 },
  closedText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },

  // Profile view
  profileScroll: { padding: 16, gap: 16 },
  card: { backgroundColor: '#161b22', borderWidth: 1, borderColor: 'rgba(230,171,44,0.15)', borderRadius: RADIUS.xl, padding: 16, gap: 12 },
  cardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  cardSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(230,171,44,0.25)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14 },
  goldBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  serviceCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(230,171,44,0.4)', alignItems: 'center', justifyContent: 'center' },
  serviceCheckboxActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  checkmark: { fontSize: 13, color: '#000', fontFamily: FONTS.bold },
  serviceLabel: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
});
