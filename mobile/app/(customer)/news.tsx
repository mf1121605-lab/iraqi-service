import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

type CommentReaction = { user_id: string };
type Comment = {
  id: string;
  content: string;
  image_url: string | null;
  parent_comment_id: string | null;
  created_at: string;
  author: { given_name: string; family_name: string } | null;
  reactions: CommentReaction[];
};

type Post = {
  id: string;
  content: string | null;
  image_urls: string[];
  video_url: string | null;
  created_at: string;
  author: { given_name: string; family_name: string } | null;
  reactions: { reaction_type: string; user_id: string }[];
  comments: Comment[];
};

const REACTIONS: { type: string; emoji: string; label: string; colors: [string, string] }[] = [
  { type: 'like',  emoji: '👍', label: 'إعجاب', colors: ['#5b9dff', '#2f5fd0'] },
  { type: 'love',  emoji: '❤️', label: 'حب',    colors: ['#ff7a9a', '#d6294f'] },
  { type: 'laugh', emoji: '😆', label: 'هاها',  colors: ['#ffd66b', '#e6a812'] },
  { type: 'wow',   emoji: '😮', label: 'واو',   colors: ['#ffd66b', '#e6a812'] },
  { type: 'sad',   emoji: '😢', label: 'حزين',  colors: ['#8fb3ff', '#5c7fd6'] },
  { type: 'angry', emoji: '😡', label: 'غضب',   colors: ['#ff8a5c', '#d6431f'] },
];
const REACTION_MAP = Object.fromEntries(REACTIONS.map((r) => [r.type, r]));

function getInitials(given?: string, family?: string) {
  const a = given?.[0] ?? '';
  const b = family?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
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

async function uploadMedia(uri: string, folder: string, kind: 'image' | 'video'): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? (kind === 'video' ? 'mp4' : 'jpg');
    const path = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const contentType = kind === 'video' ? `video/${ext}` : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, blob, { contentType, upsert: false });
    if (error) { console.error('upload failed:', error.message); return null; }
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
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

// ── Long-press reaction popover — appears above the like button ──
function ReactionPopover({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(180).easing(Easing.out(Easing.back(1.4)))}
      style={styles.popoverWrap}
    >
      <View style={styles.popover}>
        {REACTIONS.map((r) => (
          <Pressable
            key={r.type}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onPick(r.type); onClose(); }}
            style={styles.popoverEmojiBtn}
            hitSlop={4}
          >
            <Text style={styles.popoverEmoji}>{r.emoji}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

export default function NewsScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [pickedImages, setPickedImages] = useState<string[]>([]);
  const [pickedVideo, setPickedVideo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, { id: string; name: string } | null>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);
  const [openPopoverPostId, setOpenPopoverPostId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [mutedVideoId, setMutedVideoId] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('social_posts')
      .select(`
        id, content, image_urls, video_url, created_at,
        author:profiles!author_id(given_name, family_name),
        reactions:social_reactions(reaction_type, user_id),
        comments:social_comments(id, content, image_url, parent_comment_id, created_at, author:profiles!author_id(given_name, family_name), reactions:social_comment_reactions(user_id))
      `)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setPosts(data as unknown as Post[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

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

  async function pickImages() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
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
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedImages([]);
      setPickedVideo(result.assets[0].uri);
    }
  }

  async function submitPost() {
    if (!newPost.trim() && pickedImages.length === 0 && !pickedVideo) return;
    if (!session?.user.id) return;
    setPosting(true);

    let imageUrls: string[] = [];
    let videoUrl: string | null = null;
    if (pickedVideo) {
      videoUrl = await uploadMedia(pickedVideo, `social/${session.user.id}`, 'video');
    } else if (pickedImages.length > 0) {
      const uploaded = await Promise.all(pickedImages.map((uri) => uploadMedia(uri, `social/${session.user.id}`, 'image')));
      imageUrls = uploaded.filter((u): u is string => !!u);
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
    loadPosts();
  }

  function quickToggleLike(postId: string) {
    const post = posts.find((p) => p.id === postId);
    const mine = post?.reactions.find((r) => r.user_id === session?.user.id);
    handleReaction(postId, mine?.reaction_type ?? 'like');
  }

  async function toggleCommentLike(commentId: string, liked: boolean) {
    if (!session?.user.id) return;
    if (liked) {
      await supabase.from('social_comment_reactions').delete().eq('comment_id', commentId).eq('user_id', session.user.id);
    } else {
      await supabase.from('social_comment_reactions').insert({ comment_id: commentId, user_id: session.user.id });
    }
  }

  async function pickCommentImage(postId: string) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setCommentImages((prev) => ({ ...prev, [postId]: result.assets[0].uri }));
    }
  }

  async function sendComment(postId: string) {
    const body = commentInputs[postId]?.trim();
    const localImage = commentImages[postId];
    if ((!body && !localImage) || !session?.user.id) return;
    setSendingComment(postId);
    let imageUrl: string | null = null;
    if (localImage) imageUrl = await uploadMedia(localImage, `social/${session.user.id}/comments`, 'image');
    await supabase.from('social_comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: body || '',
      image_url: imageUrl,
      parent_comment_id: replyingTo[postId]?.id ?? null,
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setCommentImages((prev) => ({ ...prev, [postId]: '' }));
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
    Share.share({ message: post.content ?? 'منشور من منصة الخدمات العراقية' }).catch(() => {});
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
  ): React.ReactNode {
    const cName = c.author ? `${c.author.given_name} ${c.author.family_name}` : 'مجهول';
    const liked = c.reactions.some((r) => r.user_id === session?.user.id);
    const children = byParent[c.id] ?? [];
    return (
      <View key={c.id} style={{ marginRight: depth * 20 }}>
        <Animated.View entering={FadeIn.duration(220)} style={styles.commentRow}>
          <AvatarCircle name={cName} size={depth > 0 ? 24 : 28} />
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>{cName}</Text>
            {c.content ? <Text style={styles.commentContent}>{c.content}</Text> : null}
            {c.image_url ? <Image source={{ uri: c.image_url }} style={styles.commentImage} resizeMode="cover" /> : null}
            <View style={styles.commentMetaRow}>
              <Pressable onPress={() => setReplyingTo((prev) => ({ ...prev, [postId]: { id: c.id, name: cName } }))}>
                <Text style={styles.commentReplyBtn}>رد</Text>
              </Pressable>
              <Pressable onPress={() => toggleCommentLike(c.id, liked)} style={styles.commentLikeBtn}>
                <Text style={[styles.commentLikeIcon, liked && { color: COLORS.gold }]}>{liked ? '❤️' : '🤍'}</Text>
                {c.reactions.length > 0 && <Text style={styles.commentLikeCount}>{c.reactions.length}</Text>}
              </Pressable>
            </View>
          </View>
        </Animated.View>
        {children.map((child) => renderCommentNode(child, byParent, depth + 1, postId))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScreenBg>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        windowSize={7}
        initialNumToRender={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadPosts(); }}
            tintColor={COLORS.gold}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>📰 آخر الأخبار</Text>

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
                      <Image source={{ uri }} style={styles.composerImageThumb} resizeMode="cover" />
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
                  <Pressable style={styles.removeImage} onPress={() => setPickedVideo(null)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </Pressable>
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
        renderItem={({ item }) => {
          const myReaction = item.reactions.find((r) => r.user_id === session?.user.id);
          const authorName = item.author
            ? `${item.author.given_name} ${item.author.family_name}`
            : 'مجهول';
          const commentsExpanded = expandedComments.has(item.id);
          const commentText = commentInputs[item.id] ?? '';
          const commentImage = commentImages[item.id];
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
              {/* Post header */}
              <View style={styles.postHeader}>
                <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
                <View style={styles.authorRow}>
                  <Text style={styles.authorName}>{authorName}</Text>
                  <AvatarCircle name={authorName} size={38} />
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
                        <Image source={{ uri: url }} style={styles.postImage} resizeMode="cover" />
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
                <View style={{ position: 'relative', flex: 1 }}>
                  {openPopoverPostId === item.id && (
                    <ReactionPopover
                      onPick={(type) => handleReaction(item.id, type)}
                      onClose={() => setOpenPopoverPostId(null)}
                    />
                  )}
                  <GlossyButton
                    style={styles.actionBtn}
                    active={!!myReaction}
                    colors={myReaction ? (REACTION_MAP[myReaction.reaction_type]?.colors ?? undefined) : undefined}
                    onPress={() => quickToggleLike(item.id)}
                    onLongPress={() => setOpenPopoverPostId(item.id)}
                  >
                    <Text style={styles.actionEmoji}>{myReaction ? REACTION_MAP[myReaction.reaction_type]?.emoji : '👍'}</Text>
                    <Text style={[styles.actionLabel, myReaction && { color: '#fff' }]}>
                      {myReaction ? REACTION_MAP[myReaction.reaction_type]?.label : 'إعجاب'}
                    </Text>
                  </GlossyButton>
                </View>

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
                    roots.map((c) => renderCommentNode(c, byParent, 0, item.id))
                  )}

                  {reply && (
                    <View style={styles.replyChip}>
                      <Pressable onPress={() => setReplyingTo((prev) => ({ ...prev, [item.id]: null }))}>
                        <Text style={styles.replyChipClose}>✕</Text>
                      </Pressable>
                      <Text style={styles.replyChipText}>الرد على {reply.name}</Text>
                    </View>
                  )}

                  {commentImage ? (
                    <View style={styles.commentImagePreviewWrap}>
                      <Image source={{ uri: commentImage }} style={styles.commentImagePreview} resizeMode="cover" />
                      <Pressable style={styles.removeImage} onPress={() => setCommentImages((prev) => ({ ...prev, [item.id]: '' }))}>
                        <Text style={styles.removeImageText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={styles.commentInputRow}>
                    <Pressable
                      style={[styles.commentSendBtn, !(commentText.trim() || commentImage) && styles.commentSendBtnDisabled]}
                      onPress={() => sendComment(item.id)}
                      disabled={!(commentText.trim() || commentImage) || sendingComment === item.id}
                    >
                      {sendingComment === item.id ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Text style={styles.commentSendIcon}>↑</Text>
                      )}
                    </Pressable>
                    <TextInput
                      value={commentText}
                      onChangeText={(t) => setCommentInputs((prev) => ({ ...prev, [item.id]: t }))}
                      placeholder={reply ? `الرد على ${reply.name}...` : 'أضف تعليقاً...'}
                      placeholderTextColor={COLORS.white40}
                      style={styles.commentInput}
                      textAlign="right"
                      multiline
                      maxLength={500}
                    />
                    <Pressable style={styles.commentImageBtn} onPress={() => pickCommentImage(item.id)}>
                      <Text style={styles.commentImageBtnIcon}>🖼️</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </GlassCard>
          );
        }}
      />
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 14, paddingBottom: 32 },

  headerSection: { gap: 12, marginBottom: 4 },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold, textAlign: 'right' },

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

  postCard: { minHeight: 60 },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
  },
  postDate: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },

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

  // Reaction popover
  popoverWrap: { position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, zIndex: 20 },
  popover: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  popoverEmojiBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  popoverEmoji: { fontSize: 24 },

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
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 3,
    alignItems: 'flex-end',
  },
  commentAuthor: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.gold },
  commentContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white, lineHeight: 18, textAlign: 'right' },
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
