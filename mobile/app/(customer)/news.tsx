import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import Animated, {
  FadeIn,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon3D } from '@/components/ui/Icon3D';
import { ReactionPickerOverlay, type ReactionOption } from '@/components/ui/ReactionPickerOverlay';
import { confirmDelete } from '@/lib/confirmDelete';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/chat/Avatar';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { supabase } from '@/lib/supabase';
import { uploadMediaSmart, type UploadHandle } from '@/lib/resumableUpload';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { playSound } from '@/utils/soundFX';

type AuthorInfo = {
  id: string;
  given_name: string;
  family_name: string;
  avatar_key: string | null;
  role: 'founder' | 'employee' | 'customer';
  admin_level: 'founder' | 'co_admin' | null;
  is_verified: boolean;
};
type CommentReaction = { user_id: string; reaction_type: string };
type Comment = {
  id: string;
  content: string;
  image_url: string | null;
  parent_comment_id: string | null;
  created_at: string;
  author: AuthorInfo | null;
  reactions: CommentReaction[];
};

type Post = {
  id: string;
  content: string | null;
  image_urls: string[];
  video_url: string | null;
  created_at: string;
  pinned: boolean;
  author: AuthorInfo | null;
  reactions: { reaction_type: string; user_id: string }[];
  comments: Comment[];
};

// A post/comment author with founder-level access (role='founder' or
// admin_level='co_admin' — same rule as hasFounderAccess() in useAuth.tsx)
// gets a "مشرف" label; role='founder' specifically gets "المؤسس".
function moderatorLabel(author: AuthorInfo | null): string | null {
  if (!author) return null;
  if (author.role === 'founder') return 'المؤسس';
  if (author.admin_level === 'co_admin') return 'مشرف';
  return null;
}

// Hybrid ranking: pinned posts always lead (newest-pinned first among
// them), everything else is ordered by a recency-decayed engagement score
// — the same "hot ranking" gravity shape Reddit/Hacker News use, so a
// fresh post starts high and a post that keeps collecting reactions/
// comments gets lifted back up even once its initial recency edge fades.
// There is no shares_count anywhere in this schema (no share-tracking
// table exists), so engagement here is reactions + weighted comments only
// — re-sorted entirely client-side since the feed already fetches every
// reaction/comment row it needs for this in the one query above.
function hybridScore(post: Post): number {
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / 3_600_000;
  const engagement = post.reactions.length + post.comments.length * 1.5;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

function sortFeed(list: Post[]): Post[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return hybridScore(b) - hybridScore(a);
  });
}

type RawComment = Omit<Comment, 'author'> & { author_id: string };
type RawPost = Omit<Post, 'author' | 'comments'> & { author_id: string; comments: RawComment[] };

// Posts/comments are fetched WITHOUT an embedded `profiles!author_id(...)`
// join on purpose — that join only ever resolves for a post authored by
// yourself or by staff, since profiles RLS never granted a plain customer
// visibility into another customer's row (the embed silently comes back
// null otherwise, which is the literal "مجهول" bug). Author info is
// fetched separately here, in one batched call to the public_profiles
// view (see 20260903120000_public_profiles_view.sql), which exposes only
// the safe, public columns — never phone/email/specialization — for any
// row regardless of the viewer, and merged back in client-side.
async function attachAuthors(rawPosts: RawPost[]): Promise<Post[]> {
  const ids = new Set<string>();
  rawPosts.forEach((p) => {
    ids.add(p.author_id);
    p.comments.forEach((c) => ids.add(c.author_id));
  });
  const { data: authors } = ids.size > 0
    ? await supabase
        .from('public_profiles')
        .select('id, given_name, family_name, avatar_key, role, admin_level, is_verified')
        .in('id', Array.from(ids))
    : { data: [] as AuthorInfo[] };
  const byId = new Map((authors ?? []).map((a) => [a.id, a as AuthorInfo]));
  return rawPosts.map((p) => ({
    ...p,
    author: byId.get(p.author_id) ?? null,
    comments: p.comments.map((c) => ({ ...c, author: byId.get(c.author_id) ?? null })),
  }));
}

const REACTIONS: { type: string; emoji: string; label: string; colors: [string, string] }[] = [
  { type: 'like',  emoji: '👍', label: 'إعجاب', colors: ['#5b9dff', '#2f5fd0'] },
  { type: 'love',  emoji: '❤️', label: 'حب',    colors: ['#ff7a9a', '#d6294f'] },
  { type: 'laugh', emoji: '😆', label: 'هاها',  colors: ['#ffd66b', '#e6a812'] },
  { type: 'wow',   emoji: '😮', label: 'واو',   colors: ['#ffd66b', '#e6a812'] },
  { type: 'sad',   emoji: '😢', label: 'حزين',  colors: ['#8fb3ff', '#5c7fd6'] },
  { type: 'angry', emoji: '😡', label: 'غضب',   colors: ['#ff8a5c', '#d6431f'] },
];
const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r]));
// Same six types the DB CHECK allows, in the shape the scrubbing picker wants.
const PICKER_REACTIONS: ReactionOption[] = REACTIONS.map((r) => ({ key: r.type, emoji: r.emoji, label: r.label }));
const DELETE_KEY = '__delete__';
// Appended only when the viewer may actually delete: PostgREST answers an
// RLS-blocked delete with a successful zero-row response, so an ungated button
// would fail silently.
function pickerWithDelete(canDelete: boolean): ReactionOption[] {
  return canDelete
    ? [...PICKER_REACTIONS, { key: DELETE_KEY, emoji: '🗑️', label: 'حذف', tone: 'danger' as const }]
    : PICKER_REACTIONS;
}

function AvatarCircle({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
  const hue = (name.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <View style={[avatarStyles.circle, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `hsl(${hue},40%,22%)`,
      borderColor: `hsl(${hue},40%,38%)`,
    }]}>
      <Text style={[avatarStyles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { fontFamily: 'Cairo_700Bold', color: '#fff' },
});

// Maps a picked file's extension to a MIME type actually accepted by the
// site-assets bucket allowlist. iOS commonly hands back .mov/.heic — naively
// interpolating "video/${ext}" would produce invalid types like "video/mov"
// that Postgres storage rejects outright, so every extension is mapped
// explicitly instead.
function mimeFor(kind: 'image' | 'video', ext: string): string {
  if (kind === 'video') {
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    return 'video/mp4';
  }
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'heic' || ext === 'heif') return `image/${ext}`;
  if (ext === 'png' || ext === 'webp') return `image/${ext}`;
  return 'image/jpeg';
}

// 5 minutes — matches the Arabic alert shown when a picked video is longer.
const MAX_VIDEO_DURATION_MS = 5 * 60 * 1000;

// Same fallback used everywhere else in the app (useAuth.tsx, eas.json) —
// the base URL a share link points at.
const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';

async function uploadMedia(
  uri: string,
  folder: string,
  kind: 'image' | 'video',
  onProgress?: (pct: number) => void,
  onHandle?: (handle: UploadHandle) => void,
): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg');
    const path = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const contentType = mimeFor(kind, ext);

    // Dispatches by file size: images and short clips go through a plain
    // single-request upload; anything at/above 5MB (long videos, voice
    // recordings) goes through the chunked, resumable TUS path instead —
    // see lib/resumableUpload.ts for why a plain fetch()/XHR upload alone
    // isn't enough on a weak connection.
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

// ── Glossy 3D pressable — gradient fill, lit top border, deep shadow,
// scale-down + haptic tick on press. Used for every action button below.
function GlossyButton({
  onPress,
  onLongPress,
  colors,
  active,
  style,
  children,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  colors?: [string, string];
  active?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePressIn() {
    scale.value = withTiming(0.92, { duration: 90 });
  }
  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 220 });
  }
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  }
  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onLongPress?.();
  }

  const grad = colors ?? (active ? ['rgba(230,171,44,0.30)', 'rgba(230,171,44,0.10)'] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']);

  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={280}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.glossyPressable}
      >
        <LinearGradient colors={grad as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.glossyTopHighlight} />
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Owns its own text/image state locally instead of a shared per-post map on
// the parent — a shared map meant every keystroke in ANY post's comment box
// changed a value in renderPost's useCallback dependency array, invalidating
// the FlashList renderItem identity (and re-rendering every visible post)
// on every single character typed.
const CommentComposer = memo(function CommentComposer({
  replyTo,
  onCancelReply,
  sending,
  onSend,
}: {
  replyTo: { id: string; name: string } | null;
  onCancelReply: () => void;
  sending: boolean;
  onSend: (text: string, imageUri: string | null) => void;
}) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور من إعدادات الجهاز لإرفاق صورة.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  }

  function handleSend() {
    if (!(text.trim() || image) || sending) return;
    onSend(text.trim(), image);
    setText('');
    setImage(null);
  }

  return (
    <>
      {replyTo && (
        <View style={styles.replyChip}>
          <Pressable onPress={onCancelReply}>
            <Text style={styles.replyChipClose}>✕</Text>
          </Pressable>
          <Text style={styles.replyChipText}>الرد على {replyTo.name}</Text>
        </View>
      )}

      {image ? (
        <View style={styles.commentImagePreviewWrap}>
          <Image source={{ uri: image }} style={styles.commentImagePreview} contentFit="cover" />
          <Pressable style={styles.removeImage} onPress={() => setImage(null)}>
            <Text style={styles.removeImageText}>✕</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.commentInputRow}>
        <Pressable
          style={[styles.commentSendBtn, !(text.trim() || image) && styles.commentSendBtnDisabled]}
          onPress={handleSend}
          disabled={!(text.trim() || image) || sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.commentSendIcon}>↑</Text>
          )}
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={replyTo ? `الرد على ${replyTo.name}...` : 'أضف تعليقاً...'}
          placeholderTextColor={COLORS.white40}
          style={styles.commentInput}
          textAlign="right"
          multiline
          maxLength={500}
        />
        <Pressable style={styles.commentImageBtn} onPress={pickImage}>
          <Text style={styles.commentImageBtnIcon}>🖼️</Text>
        </Pressable>
      </View>
    </>
  );
});

export default function NewsScreen() {
  const { session, profile } = useAuth();
  const { postId: deepLinkedPostId } = useLocalSearchParams<{ postId?: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [pickedImages, setPickedImages] = useState<string[]>([]);
  const [pickedVideo, setPickedVideo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<Record<string, { id: string; name: string } | null>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [mutedVideoId, setMutedVideoId] = useState<Set<string>>(new Set());
  const { duck, unduck } = useAmbientMusic();

  // A feed video plays with real sound (isMuted is per-video, defaults to
  // audible) — duck the ambient track for as long as any one is playing.
  useEffect(() => {
    if (!playingVideoId) return;
    duck();
    return () => unduck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingVideoId]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const uploadHandleRef = useRef<UploadHandle | null>(null);

  // Stops an in-flight upload if the user navigates away mid-upload —
  // otherwise it keeps running against a screen that's already gone.
  useEffect(() => () => { uploadHandleRef.current?.abort(); }, []);

  const loadFollowing = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
    setFollowingIds(new Set((data ?? []).map((r) => r.following_id as string)));
  }, [session?.user.id]);

  async function toggleFollow(authorId: string) {
    if (!session?.user.id || followBusyId) return;
    setFollowBusyId(authorId);
    const isFollowing = followingIds.has(authorId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', authorId);
      setFollowingIds((prev) => { const next = new Set(prev); next.delete(authorId); return next; });
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: authorId });
      setFollowingIds((prev) => new Set(prev).add(authorId));
    }
    setFollowBusyId(null);
  }

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('social_posts')
      .select(`
        id, content, image_urls, video_url, created_at, pinned, author_id,
        reactions:social_reactions(reaction_type, user_id),
        comments:social_comments(id, content, image_url, parent_comment_id, created_at, author_id, reactions:social_comment_reactions(user_id, reaction_type))
      `)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setPosts(sortFeed(await attachAuthors(data as unknown as RawPost[])));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadFollowing(); }, [loadFollowing]);

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel('social-feed-mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_reactions' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_comments' }, loadPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_comment_reactions' }, loadPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  // Deep link support (news/post/:id → /(customer)/news?postId=:id): the
  // feed only fetches the latest 30 posts, so an older shared post might
  // not be in that window — fetch it individually and pin it to the top.
  useEffect(() => {
    if (!deepLinkedPostId || loading) return;
    if (posts.some((p) => p.id === deepLinkedPostId)) return;
    supabase
      .from('social_posts')
      .select(`
        id, content, image_urls, video_url, created_at, pinned, author_id,
        reactions:social_reactions(reaction_type, user_id),
        comments:social_comments(id, content, image_url, parent_comment_id, created_at, author_id, reactions:social_comment_reactions(user_id, reaction_type))
      `)
      .eq('id', deepLinkedPostId)
      .eq('approved', true)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        const [withAuthor] = await attachAuthors([data as unknown as RawPost]);
        setPosts((prev) => [withAuthor, ...prev]);
      });
  }, [deepLinkedPostId, loading, posts]);

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور من إعدادات الجهاز لإرفاق صورة.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPickedVideo(null);
      setPickedImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  }

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الفيديوهات من إعدادات الجهاز لإرفاق فيديو.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if ((asset.duration ?? 0) > MAX_VIDEO_DURATION_MS) {
        Alert.alert('تنبيه', 'عذراً، الحد الأقصى لطول الفيديو هو 5 دقائق');
        return;
      }
      setPickedImages([]);
      setPickedVideo(asset.uri);
    }
  }

  async function submitPost() {
    if (!newPost.trim() && pickedImages.length === 0 && !pickedVideo) return;
    if (!session?.user.id) return;
    setPosting(true);

    let imageUrls: string[] = [];
    let videoUrl: string | null = null;
    if (pickedVideo) {
      setUploadProgress(0);
      videoUrl = await uploadMedia(
        pickedVideo,
        `social/${session.user.id}`,
        'video',
        setUploadProgress,
        (h) => { uploadHandleRef.current = h; },
      );
      uploadHandleRef.current = null;
      setUploadProgress(null);
      if (!videoUrl) {
        setPosting(false);
        Alert.alert('تعذّر رفع الفيديو', 'حدث خطأ أثناء رفع الفيديو، حاول مرة أخرى.');
        return;
      }
    } else if (pickedImages.length > 0) {
      const uploaded = await Promise.all(pickedImages.map((uri) => uploadMedia(uri, `social/${session.user.id}`, 'image')));
      imageUrls = uploaded.filter((u): u is string => !!u);
      if (imageUrls.length < pickedImages.length) {
        setPosting(false);
        Alert.alert('تعذّر رفع الصور', 'حدث خطأ أثناء رفع بعض الصور، حاول مرة أخرى.');
        return;
      }
    }

    await supabase.from('social_posts').insert({
      author_id: session.user.id,
      content: newPost.trim() || null,
      image_urls: imageUrls,
      video_url: videoUrl,
      approved: false,
    });

    setNewPost('');
    setPickedImages([]);
    setPickedVideo(null);
    setPosting(false);
  }

  async function handleReaction(postId: string, type: string) {
    if (!session?.user.id) return;
    const post = posts.find((p) => p.id === postId);
    const existing = post?.reactions.find((r) => r.user_id === session.user.id);
    // Always delete-then-insert (no UPDATE RLS policy exists on social_reactions).
    if (existing) {
      await supabase.from('social_reactions').delete().eq('post_id', postId).eq('user_id', session.user.id);
      if (existing.reaction_type === type) { loadPosts(); return; }
    }
    await supabase.from('social_reactions').insert({ post_id: postId, user_id: session.user.id, reaction_type: type });
    playSound('reaction');
    loadPosts();
  }

  function quickToggleLike(postId: string) {
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reactions.find((r) => r.user_id === session?.user.id);
    handleReaction(postId, mine?.reaction_type ?? 'like');
  }

  async function toggleCommentReaction(comment: Comment, type: string) {
    if (!session?.user.id) return;
    const existing = comment.reactions.find((r) => r.user_id === session.user.id);
    if (existing) {
      await supabase.from('social_comment_reactions').delete().eq('comment_id', comment.id).eq('user_id', session.user.id);
      if (existing.reaction_type === type) return;
    }
    await supabase.from('social_comment_reactions').insert({ comment_id: comment.id, user_id: session.user.id, reaction_type: type });
    playSound('reaction');
  }

  async function sendComment(postId: string, bodyText: string, localImage: string | null) {
    const body = bodyText.trim();
    if ((!body && !localImage) || !session?.user.id) return;
    setSendingComment(postId);
    let imageUrl: string | null = null;
    if (localImage) {
      imageUrl = await uploadMedia(localImage, `social/${session.user.id}/comments`, 'image');
      if (!imageUrl) {
        setSendingComment(null);
        Alert.alert('تعذّر رفع الصورة', 'حدث خطأ أثناء رفع الصورة، حاول مرة أخرى.');
        return;
      }
    }
    await supabase.from('social_comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: body || '',
      image_url: imageUrl,
      parent_comment_id: replyingTo[postId]?.id ?? null,
    });
    setReplyingTo((prev) => ({ ...prev, [postId]: null }));
    setSendingComment(null);
  }

  function toggleComments(postId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function sharePost(post: Post) {
    // Reuses the exact same postId query param the in-app deep-link handler
    // above already reads (useLocalSearchParams<{ postId }>) — opening this
    // link inside the app jumps straight to the post. A cold open (app not
    // installed) just lands on the web app's own handling of that URL.
    const link = `${APP_URL}/news?postId=${post.id}`;
    const kind = post.video_url ? 'الفيديو' : 'المنشور';
    const teaser = `حمّل تطبيق خدماتي لرؤية هذا ${kind} واستكشاف المزيد: ${link}`;
    const message = post.content ? `${post.content}\n\n${teaser}` : teaser;
    Share.share({ message }).catch(() => {});
  }

  function startEdit(post: Post) {
    setMenuPostId(null);
    setEditPostId(post.id);
    setEditText(post.content ?? '');
  }

  async function saveEdit() {
    if (!editPostId) return;
    setEditSaving(true);
    const { error, count } = await supabase
      .from('social_posts')
      .update({ content: editText.trim() || null }, { count: 'exact' })
      .eq('id', editPostId);
    setEditSaving(false);
    if (error) { Alert.alert('تعذّر الحفظ', error.message); return; }
    if (!count) { Alert.alert('تعذّر الحفظ', 'لا تملك صلاحية تعديل هذا المنشور.'); return; }
    const savedText = editText.trim() || null;
    setPosts((cur) => cur.map((p) => (p.id === editPostId ? { ...p, content: savedText } : p)));
    setEditPostId(null);
  }

  // Founder/co_admin only (RLS already enforces this — social_posts_update
  // in the RBAC migration only lets is_founder()/is_co_admin() touch this
  // row at all, so a rejected attempt from anyone else fails server-side
  // regardless of this client-side gate too).
  async function togglePin(post: Post) {
    setMenuPostId(null);
    const nextPinned = !post.pinned;
    const { error } = await supabase.from('social_posts').update({ pinned: nextPinned }).eq('id', post.id);
    if (error) { Alert.alert('تعذّر التثبيت', error.message); return; }
    setPosts((cur) => sortFeed(cur.map((p) => (p.id === post.id ? { ...p, pinned: nextPinned } : p))));
  }

  function startDelete(post: Post) {
    setMenuPostId(null);
    Alert.alert('حذف المنشور', 'هل أنت متأكد من حذف المنشور نهائياً؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const { error, count } = await supabase.from('social_posts').delete({ count: 'exact' }).eq('id', post.id);
          if (error) { Alert.alert('تعذّر الحذف', error.message); return; }
          if (!count) { Alert.alert('تعذّر الحذف', 'لا تملك صلاحية حذف هذا المنشور.'); return; }
          setPosts((cur) => cur.filter((p) => p.id !== post.id));
        },
      },
    ]);
  }

  function startReport(post: Post) {
    setMenuPostId(null);
    setReportPostId(post.id);
    setReportReason('');
  }

  async function submitReport() {
    if (!reportPostId || !session?.user.id || !reportReason.trim()) return;
    setReportSubmitting(true);
    const { error } = await supabase.from('post_reports').insert({
      post_id: reportPostId,
      reporter_id: session.user.id,
      reason: reportReason.trim(),
    });
    setReportSubmitting(false);
    if (error) { Alert.alert('تعذّر الإرسال', error.message); return; }
    setReportPostId(null);
    Alert.alert('تم الإرسال', 'شكراً لك، سيتم مراجعة البلاغ من قبل الإدارة.');
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar', {
      day: 'numeric', month: 'short', timeZone: 'Asia/Baghdad',
    });
  }

  function buildCommentTree(comments: Comment[]) {
    const byParent: Record<string, Comment[]> = {};
    comments.forEach((c) => {
      const key = c.parent_comment_id ?? '__root';
      (byParent[key] ??= []).push(c);
    });
    return byParent;
  }

  function renderCommentNode(
    c: Comment,
    byParent: Record<string, Comment[]>,
    depth: number,
    postId: string,
    postAuthorId: string | null,
  ): React.ReactNode {
    const cName = c.author ? `${c.author.given_name} ${c.author.family_name}` : 'مجهول';
    const myReaction = c.reactions.find((r) => r.user_id === session?.user.id);
    const children = byParent[c.id] ?? [];
    // Comment author, the post's own author, or platform staff — matching the
    // widened social_comments DELETE policy exactly.
    const canDeleteComment =
      c.author?.id === session?.user.id ||
      postAuthorId === session?.user.id ||
      hasFounderAccess(profile);
    return (
      <View key={c.id} style={{ marginRight: depth * 20 }}>
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOutUp.duration(200)} style={styles.commentRow}>
          <Pressable
            disabled={!c.author}
            onPress={() => c.author && router.push({ pathname: '/user/[userId]', params: { userId: c.author.id } })}
          >
            {c.author ? (
              <Avatar avatarKey={c.author.avatar_key} name={cName} seed={c.author.id} size={depth > 0 ? 24 : 28} />
            ) : (
              <AvatarCircle name={cName} size={depth > 0 ? 24 : 28} />
            )}
          </Pressable>
          <View style={styles.commentBubble}>
            <Pressable
              disabled={!c.author}
              onPress={() => c.author && router.push({ pathname: '/user/[userId]', params: { userId: c.author.id } })}
            >
              <View style={styles.authorNameRow}>
                <Text style={styles.commentAuthor}>{cName}</Text>
                {c.author?.is_verified && <Text style={styles.verifiedBadge}>✔️</Text>}
                {moderatorLabel(c.author) && (
                  <Text style={[styles.moderatorLabel, c.author?.role === 'founder' && styles.founderLabel]}>
                    {moderatorLabel(c.author)}
                  </Text>
                )}
              </View>
            </Pressable>
            {c.content ? <Text style={styles.commentContent}>{c.content}</Text> : null}
            {c.image_url ? <Image source={{ uri: c.image_url }} style={styles.commentImage} contentFit="cover" cachePolicy="memory-disk" transition={150} /> : null}
            <View style={styles.commentMetaRow}>
              <Pressable onPress={() => setReplyingTo((prev) => ({ ...prev, [postId]: { id: c.id, name: cName } }))}>
                <Text style={styles.commentReplyBtn}>رد</Text>
              </Pressable>
              <ReactionPickerOverlay
                style={{ position: 'relative' }}
                reactions={pickerWithDelete(canDeleteComment)}
                align="end"
                onSelectReaction={(type) => {
                  if (type === DELETE_KEY) {
                    confirmDelete({
                      kind: 'comment',
                      table: 'social_comments',
                      id: c.id,
                      onDeleted: () => setPosts((cur) => cur.map((p) =>
                        p.id === postId ? { ...p, comments: p.comments.filter((x) => x.id !== c.id) } : p,
                      )),
                    });
                  } else toggleCommentReaction(c, type);
                }}
              >
                <Pressable
                  onPress={() => toggleCommentReaction(c, myReaction?.reaction_type ?? 'like')}
                  style={styles.commentLikeBtn}
                >
                  <Text style={[styles.commentLikeIcon, myReaction && { color: COLORS.gold }]}>
                    {myReaction ? REACTION_MAP[myReaction.reaction_type]?.emoji ?? '👍' : '🤍'}
                  </Text>
                  {c.reactions.length > 0 && <Text style={styles.commentLikeCount}>{c.reactions.length}</Text>}
                </Pressable>
              </ReactionPickerOverlay>
            </View>
          </View>
        </Animated.View>
        {children.map((child) => renderCommentNode(child, byParent, depth + 1, postId, postAuthorId))}
      </View>
    );
  }

  // Stable across renders driven by anything other than the state a post
  // card actually reads (composer typing, upload progress ticking, etc. no
  // longer force FlashList to tear down and recreate every visible cell).
  const renderPost: ListRenderItem<Post> = useCallback(({ item }) => {
    const myReaction = item.reactions.find((r) => r.user_id === session?.user.id);
    const authorName = item.author
      ? `${item.author.given_name} ${item.author.family_name}`
      : 'مجهول';
    const commentsExpanded = expandedComments.has(item.id);
    const reply = replyingTo[item.id];
    const imageUrls: string[] = Array.isArray(item.image_urls) ? item.image_urls : [];
    const isPlaying = playingVideoId === item.id;
    const isMuted = mutedVideoId.has(item.id);

    // Top reaction summary: up to 3 most-used emoji + total count
    const counts: Record<string, number> = {};
    item.reactions.forEach((r) => { counts[r.reaction_type] = (counts[r.reaction_type] ?? 0) + 1; });
    const topTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

    const byParent = buildCommentTree(item.comments);
    const roots = byParent['__root'] ?? [];

    return (
      <GlassCard style={styles.postCard} noPad borderRadius={18} borderSpeed={4500 + Math.random() * 2000}>
        {item.pinned && (
          <View style={styles.pinnedBanner}>
            <Text style={styles.pinnedBannerText}>📌 منشور مثبت</Text>
          </View>
        )}
        {/* Post header */}
        <View style={styles.postHeader}>
          <View style={styles.authorCluster}>
            <Pressable
              style={styles.authorRow}
              onPress={() => item.author && router.push({ pathname: '/user/[userId]', params: { userId: item.author.id } })}
            >
              {item.author ? (
                <Avatar avatarKey={item.author.avatar_key} name={authorName} seed={item.author.id} size={38} />
              ) : (
                <AvatarCircle name={authorName} size={38} />
              )}
              <View>
                <View style={styles.authorNameRow}>
                  <Text style={styles.authorName}>{authorName}</Text>
                  {item.author?.is_verified && <Text style={styles.verifiedBadge}>✔️</Text>}
                </View>
                {moderatorLabel(item.author) && (
                  <Text style={[styles.moderatorLabel, item.author?.role === 'founder' && styles.founderLabel]}>
                    {moderatorLabel(item.author)}
                  </Text>
                )}
              </View>
            </Pressable>
            {item.author && item.author.id !== session?.user.id && (
              <Pressable
                style={[styles.followPill, followingIds.has(item.author.id) && styles.followPillActive]}
                onPress={() => toggleFollow(item.author!.id)}
                disabled={followBusyId === item.author.id}
              >
                {followingIds.has(item.author.id) && <Text style={styles.followPillCheck}>✓</Text>}
                <Text style={[styles.followPillText, followingIds.has(item.author.id) && styles.followPillTextActive]}>
                  {followingIds.has(item.author.id) ? 'متابَع' : 'متابعة'}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.postHeaderRight}>
            <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
            <Pressable style={styles.postMenuBtn} onPress={() => setMenuPostId(item.id)} hitSlop={8}>
              <Text style={styles.postMenuDots}>⋯</Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        {item.content ? (
          <Text style={styles.postContent}>{item.content}</Text>
        ) : null}

        {/* Video */}
        {item.video_url ? (
          <Pressable
            style={styles.videoWrap}
            onPress={() => setPlayingVideoId(isPlaying ? null : item.id)}
          >
            <Video
              source={{ uri: item.video_url }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isPlaying}
              isMuted={isMuted}
              isLooping
            />
            <View style={styles.videoOverlay} pointerEvents="none">
              {!isPlaying && <Text style={styles.videoPlayIcon}>▶️</Text>}
            </View>
            <Pressable
              style={styles.videoMuteBtn}
              onPress={() => setMutedVideoId((prev) => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
              })}
            >
              <Text style={styles.videoMuteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </Pressable>
          </Pressable>
        ) : imageUrls.length > 0 ? (
          <View style={styles.imageGrid}>
            {imageUrls.slice(0, 4).map((url, i) => {
              const isLast = i === 3 && imageUrls.length > 4;
              const single = imageUrls.length === 1;
              const pair = imageUrls.length === 2;
              return (
                <View key={i} style={[
                  styles.postImageWrap,
                  single && styles.postImageWrapFull,
                  pair && styles.postImageWrapHalf,
                ]}>
                  <Image source={{ uri: url }} style={styles.postImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                  {isLast && (
                    <View style={styles.imageMoreOverlay}>
                      <Text style={styles.imageMoreText}>+{imageUrls.length - 4}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Reaction summary */}
        {(item.reactions.length > 0 || item.comments.length > 0) && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryEmojis}>
              {topTypes.map((t) => (
                <Text key={t} style={styles.summaryEmoji}>{REACTION_MAP[t]?.emoji}</Text>
              ))}
              {item.reactions.length > 0 && <Text style={styles.summaryCount}>{item.reactions.length}</Text>}
            </View>
            {item.comments.length > 0 && (
              <Text style={styles.summaryComments}>{item.comments.length} تعليقات</Text>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Glossy 3D action row: إعجاب / تعليق / مشاركة */}
        <View style={styles.actionsRow}>
          <ReactionPickerOverlay
            style={{ position: 'relative', flex: 1 }}
            reactions={pickerWithDelete(
              item.author?.id === session?.user.id || hasFounderAccess(profile),
            )}
            align="start"
            onSelectReaction={(type) => {
              if (type === DELETE_KEY) {
                confirmDelete({
                  kind: 'post',
                  table: 'social_posts',
                  id: item.id,
                  onDeleted: () => setPosts((cur) => cur.filter((p) => p.id !== item.id)),
                });
              } else handleReaction(item.id, type);
            }}
          >
            <GlossyButton
              style={styles.actionBtn}
              active={!!myReaction}
              colors={myReaction ? (REACTION_MAP[myReaction.reaction_type]?.colors ?? undefined) : undefined}
              onPress={() => quickToggleLike(item.id)}
            >
              <Text style={styles.actionEmoji}>{myReaction ? REACTION_MAP[myReaction.reaction_type]?.emoji : '👍'}</Text>
              <Text style={[styles.actionLabel, myReaction && { color: '#fff' }]}>
                {myReaction ? REACTION_MAP[myReaction.reaction_type]?.label : 'إعجاب'}
              </Text>
            </GlossyButton>
          </ReactionPickerOverlay>

          <GlossyButton style={styles.actionBtn} onPress={() => toggleComments(item.id)}>
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionLabel}>تعليق</Text>
          </GlossyButton>

          <GlossyButton style={styles.actionBtn} onPress={() => sharePost(item)}>
            <Text style={styles.actionEmoji}>↗️</Text>
            <Text style={styles.actionLabel}>مشاركة</Text>
          </GlossyButton>
        </View>

        {/* Comments section */}
        {commentsExpanded && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.commentsSection}>
            {roots.length === 0 ? (
              <Text style={styles.noComments}>لا توجد تعليقات بعد</Text>
            ) : (
              roots.map((c) => renderCommentNode(c, byParent, 0, item.id, item.author?.id ?? null))
            )}

            <CommentComposer
              replyTo={reply ?? null}
              onCancelReply={() => setReplyingTo((prev) => ({ ...prev, [item.id]: null }))}
              sending={sendingComment === item.id}
              onSend={(text, imageUri) => sendComment(item.id, text, imageUri)}
            />
          </Animated.View>
        )}
      </GlassCard>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session, profile, expandedComments, replyingTo,
    playingVideoId, mutedVideoId, followingIds, followBusyId, sendingComment,
  ]);

  if (loading) {
    return (
      <ScreenBg>
        <View style={{ padding: 16, paddingTop: 60 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      <FlashList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={420}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPosts(); }}
            tintColor={COLORS.gold}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.pageTitleRow}>
              <Text style={styles.pageTitle}>آخر الأخبار</Text>
              <Icon3D emoji="📰" size={36} active glowColor={COLORS.gold} animation="float" />
              {hasFounderAccess(profile) && (
                <Pressable style={styles.reportsShortcut} onPress={() => router.push('/(hq)/social-posts')}>
                  <Text style={styles.reportsShortcutText}>🚩 البلاغات</Text>
                </Pressable>
              )}
            </View>

            {/* Composer */}
            <GlassCard style={styles.composerCard} noPad borderRadius={16} borderSpeed={5000}>
              <TextInput
                value={newPost}
                onChangeText={setNewPost}
                placeholder="شاركنا ما يدور في ذهنك..."
                placeholderTextColor={COLORS.white40}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={styles.composerInput}
                textAlign="right"
              />
              {pickedImages.length > 0 && (
                <View style={styles.composerImageGrid}>
                  {pickedImages.map((uri, i) => (
                    <View key={uri + i} style={styles.composerImageSlot}>
                      <Image source={{ uri }} style={styles.composerImageThumb} contentFit="cover" />
                      <Pressable style={styles.removeImage} onPress={() => setPickedImages((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {pickedVideo && (
                <View style={styles.imagePreviewWrap}>
                  <Video source={{ uri: pickedVideo }} style={styles.imagePreview} resizeMode={ResizeMode.COVER} useNativeControls />
                  {uploadProgress === null && (
                    <Pressable style={styles.removeImage} onPress={() => setPickedVideo(null)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {uploadProgress !== null && (
                <View style={styles.uploadProgressRow}>
                  <View style={styles.uploadProgressTrack}>
                    <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                  <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                </View>
              )}
              <View style={styles.composerActions}>
                <GlossyButton onPress={pickImages} style={styles.composerIconBtn}>
                  <Text style={styles.imagePickIcon}>🖼️</Text>
                </GlossyButton>
                <GlossyButton onPress={pickVideo} style={styles.composerIconBtn}>
                  <Text style={styles.imagePickIcon}>🎥</Text>
                </GlossyButton>
                {(newPost.trim() || pickedImages.length > 0 || pickedVideo) && (
                  <Text style={styles.pendingNote}>سيظهر بعد موافقة الإدارة</Text>
                )}
                <Pressable
                  style={[styles.postBtn, (!newPost.trim() && pickedImages.length === 0 && !pickedVideo) && styles.postBtnDisabled]}
                  onPress={submitPost}
                  disabled={posting || (!newPost.trim() && pickedImages.length === 0 && !pickedVideo)}
                >
                  {posting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.postBtnText}>نشر</Text>
                  )}
                </Pressable>
              </View>
            </GlassCard>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📰</Text>
            <Text style={styles.emptyTitle}>لا توجد منشورات بعد</Text>
            <Text style={styles.emptySub}>كن أول من يشارك!</Text>
          </View>
        }
        renderItem={renderPost}
      />

      {/* Post options: three-dot menu → Edit / Delete / Report */}
      <Modal visible={!!menuPostId} transparent animationType="fade" onRequestClose={() => setMenuPostId(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuPostId(null)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            {(() => {
              const post = posts.find((p) => p.id === menuPostId);
              if (!post) return null;
              const isMine = post.author?.id === session?.user.id;
              const canDelete = isMine || hasFounderAccess(profile);
              return (
                <>
                  {isMine && (
                    <Pressable style={styles.menuItem} onPress={() => startEdit(post)}>
                      <Text style={styles.menuItemText}>✏️ تعديل المنشور</Text>
                    </Pressable>
                  )}
                  {hasFounderAccess(profile) && (
                    <Pressable style={styles.menuItem} onPress={() => togglePin(post)}>
                      <Text style={styles.menuItemText}>{post.pinned ? '📌 إلغاء التثبيت' : '📌 تثبيت المنشور في الأعلى'}</Text>
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable style={styles.menuItem} onPress={() => startDelete(post)}>
                      <Text style={[styles.menuItemText, styles.menuItemDanger]}>🗑️ حذف المنشور</Text>
                    </Pressable>
                  )}
                  {!isMine && (
                    <Pressable style={styles.menuItem} onPress={() => startReport(post)}>
                      <Text style={styles.menuItemText}>🚩 إبلاغ</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.menuItem} onPress={() => setMenuPostId(null)}>
                    <Text style={styles.menuItemCancel}>إلغاء</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit post */}
      <Modal visible={!!editPostId} transparent animationType="fade" onRequestClose={() => setEditPostId(null)}>
        <KeyboardAvoidingView
          style={styles.menuOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>تعديل المنشور</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder="اكتب نص المنشور..."
              placeholderTextColor={COLORS.white40}
              style={styles.editInput}
              textAlign="right"
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancelBtn} onPress={() => setEditPostId(null)}>
                <Text style={styles.editCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable style={styles.editSaveBtn} onPress={saveEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.editSaveText}>حفظ</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report post */}
      <Modal visible={!!reportPostId} transparent animationType="fade" onRequestClose={() => setReportPostId(null)}>
        <KeyboardAvoidingView
          style={styles.menuOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>الإبلاغ عن المنشور</Text>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="اكتب سبب البلاغ..."
              placeholderTextColor={COLORS.white40}
              style={styles.editInput}
              textAlign="right"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancelBtn} onPress={() => setReportPostId(null)}>
                <Text style={styles.editCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[styles.editSaveBtn, !reportReason.trim() && styles.postBtnDisabled]}
                onPress={submitReport}
                disabled={reportSubmitting || !reportReason.trim()}
              >
                {reportSubmitting ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.editSaveText}>إرسال البلاغ</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  // gap moved onto postCard's marginBottom — FlashList's contentContainerStyle
  // doesn't apply `gap` between recycled cells the way FlatList's did.
  list: { padding: 16, paddingBottom: 32 },

  headerSection: { gap: 12, marginBottom: 4 },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold, textAlign: 'right' },
  reportsShortcut: {
    marginStart: 'auto',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reportsShortcutText: { fontFamily: FONTS.bold, fontSize: 11, color: '#ef4444' },

  composerCard: { minHeight: 120 },
  composerInput: {
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
    padding: 14,
    paddingBottom: 8,
  },
  composerImageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 14, marginBottom: 8 },
  composerImageSlot: { width: 72, height: 72, position: 'relative' },
  composerImageThumb: { width: '100%', height: '100%', borderRadius: 10 },
  imagePreviewWrap: { marginHorizontal: 14, marginBottom: 8, position: 'relative' },
  imagePreview: { width: '100%', height: 160, borderRadius: 10 },
  removeImage: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  removeImageText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  uploadProgressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  uploadProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  uploadProgressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.gold },
  uploadProgressText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, minWidth: 32, textAlign: 'left' },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  composerIconBtn: { width: 40, height: 40, borderRadius: 12 },
  imagePickIcon: { fontSize: 17 },
  pendingNote: { flex: 1, fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  postBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  postBtnDisabled: { backgroundColor: 'rgba(230,171,44,0.3)' },
  postBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  emptySub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },

  postCard: { minHeight: 60, marginBottom: 14 },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
  },
  postDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  postHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postMenuBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  postMenuDots: { fontSize: 18, color: COLORS.muted, fontWeight: '700' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  menuSheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuItemText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'center' },
  menuItemDanger: { color: '#ef4444' },
  menuItemCancel: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  editCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    padding: 16,
    gap: 12,
  },
  editTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'right' },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    minHeight: 90,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  editCancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  editCancelText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white70 },
  editSaveBtn: { backgroundColor: COLORS.gold, paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.sm, minWidth: 70, alignItems: 'center' },
  editSaveText: { fontFamily: FONTS.bold, fontSize: 13, color: '#000' },
  authorCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  followPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  followPillActive: { backgroundColor: 'rgba(230,171,44,0.18)' },
  followPillText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  followPillTextActive: { color: COLORS.gold },
  followPillCheck: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  authorName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedBadge: { fontSize: 12 },
  moderatorLabel: { fontFamily: FONTS.bold, fontSize: 10, color: '#4f8bff' },
  founderLabel: { color: COLORS.gold },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230,171,44,0.14)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230,171,44,0.3)',
    paddingVertical: 6,
  },
  pinnedBannerText: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },

  postContent: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    lineHeight: 23,
    textAlign: 'right',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  // Video
  videoWrap: { marginHorizontal: 14, marginBottom: 12, borderRadius: 12, overflow: 'hidden', height: 220, position: 'relative', backgroundColor: '#000' },
  videoPlayer: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  videoPlayIcon: { fontSize: 44 },
  videoMuteBtn: { position: 'absolute', bottom: 8, left: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  videoMuteIcon: { fontSize: 15 },

  // Image grid — Facebook-style (1 full, 2 halves, 3-4 grid with +N overlay)
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 14, paddingBottom: 12 },
  postImageWrap: { width: '49%', height: 110, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  postImageWrapFull: { width: '100%', height: 220 },
  postImageWrapHalf: { width: '49%', height: 180 },
  postImage: { width: '100%', height: '100%' },
  imageMoreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  imageMoreText: { fontFamily: FONTS.bold, fontSize: 22, color: '#fff' },

  // Reaction summary
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 8 },
  summaryEmojis: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryEmoji: { fontSize: 14 },
  summaryCount: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, marginRight: 4 },
  summaryComments: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },

  divider: { height: 1, backgroundColor: COLORS.white06, marginHorizontal: 14 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  // Glossy 3D button base
  glossyPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  glossyTopHighlight: {
    position: 'absolute', top: 0, left: 8, right: 8, height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  actionBtn: { height: 40 },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white70 },

  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.white06,
    padding: 12,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  noComments: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingVertical: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'flex-end', marginBottom: 8 },
  commentBubble: {
    flex: 1,
    backgroundColor: 'rgba(230,171,44,0.06)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.35)',
    padding: 10,
    gap: 3,
    alignItems: 'flex-end',
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  commentAuthor: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold, textAlign: 'right' },
  commentContent: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, lineHeight: 18, textAlign: 'right' },
  commentImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 4 },
  commentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  commentReplyBtn: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.muted },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentLikeIcon: { fontSize: 12 },
  commentLikeCount: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },

  replyChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, backgroundColor: COLORS.goldDim, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  replyChipText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold },
  replyChipClose: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },

  commentImagePreviewWrap: { alignSelf: 'flex-end', position: 'relative' },
  commentImagePreview: { width: 80, height: 80, borderRadius: 10 },

  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.bgAlt,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 13,
    maxHeight: 80,
    minHeight: 38,
  },
  commentSendBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  commentSendBtnDisabled: { backgroundColor: 'rgba(230,171,44,0.3)' },
  commentSendIcon: { fontSize: 18, color: '#000', fontFamily: FONTS.bold },
  commentImageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.white20, alignItems: 'center', justifyContent: 'center' },
  commentImageBtnIcon: { fontSize: 15 },
});
