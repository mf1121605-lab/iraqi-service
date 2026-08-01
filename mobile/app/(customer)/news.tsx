import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

type Comment = {
  id: string;
  content: string;
  author: { given_name: string; family_name: string } | null;
  created_at: string;
};

type Post = {
  id: string;
  content: string | null;
  image_urls: string[];
  created_at: string;
  author: { given_name: string; family_name: string } | null;
  reactions: { reaction_type: string; user_id: string }[];
  comments: Comment[];
};

const REACTIONS = [
  { type: 'like',    emoji: '👍', label: 'مفيد' },
  { type: 'dislike', emoji: '👎', label: 'غير مفيد' },
];

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

async function uploadImage(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `social/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('site-assets').upload(path, blob, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });
    if (error) return null;
    const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export default function NewsScreen() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('social_posts')
      .select(`
        id, content, image_urls, created_at,
        author:profiles!author_id(given_name, family_name),
        reactions:social_reactions(reaction_type, user_id),
        comments:social_comments(id, content, created_at, author:profiles!author_id(given_name, family_name))
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      setPickedImage(result.assets[0].uri);
    }
  }

  async function submitPost() {
    if (!newPost.trim() && !pickedImage) return;
    if (!session?.user.id) return;
    setPosting(true);

    let imageUrls: string[] = [];
    if (pickedImage) {
      const url = await uploadImage(pickedImage, session.user.id);
      if (url) imageUrls = [url];
    }

    await supabase.from('social_posts').insert({
      author_id: session.user.id,
      content: newPost.trim() || null,
      image_urls: imageUrls,
      approved: false,
    });

    setNewPost('');
    setPickedImage(null);
    setPosting(false);
  }

  async function handleReaction(postId: string, type: string) {
    if (!session?.user.id) return;
    const post = posts.find((p) => p.id === postId);
    const existing = post?.reactions.find((r) => r.user_id === session.user.id);
    if (existing) {
      if (existing.reaction_type === type) {
        await supabase.from('social_reactions').delete()
          .eq('post_id', postId).eq('user_id', session.user.id);
      } else {
        await supabase.from('social_reactions')
          .update({ reaction_type: type })
          .eq('post_id', postId).eq('user_id', session.user.id);
      }
    } else {
      await supabase.from('social_reactions').insert({
        post_id: postId, user_id: session.user.id, reaction_type: type,
      });
    }
    loadPosts();
  }

  async function sendComment(postId: string) {
    const body = commentInputs[postId]?.trim();
    if (!body || !session?.user.id) return;
    setSendingComment(postId);
    await supabase.from('social_comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: body,
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setSendingComment(null);
    loadPosts();
  }

  function toggleComments(postId: string) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar', {
      day: 'numeric', month: 'short', timeZone: 'Asia/Baghdad',
    });
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
              {pickedImage && (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: pickedImage }} style={styles.imagePreview} resizeMode="cover" />
                  <Pressable style={styles.removeImage} onPress={() => setPickedImage(null)}>
                    <Text style={styles.removeImageText}>✕</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.composerActions}>
                <Pressable style={styles.imagePickBtn} onPress={pickImage} disabled={posting}>
                  <Text style={styles.imagePickIcon}>🖼️</Text>
                </Pressable>
                {(newPost.trim() || pickedImage) && (
                  <Text style={styles.pendingNote}>سيظهر بعد موافقة الإدارة</Text>
                )}
                <Pressable
                  style={[styles.postBtn, (!newPost.trim() && !pickedImage) && styles.postBtnDisabled]}
                  onPress={submitPost}
                  disabled={posting || (!newPost.trim() && !pickedImage)}
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
          const imageUrls: string[] = Array.isArray(item.image_urls) ? item.image_urls : [];

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

              {/* Images */}
              {imageUrls.length > 0 && (
                <View style={styles.imageGrid}>
                  {imageUrls.slice(0, 3).map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={[styles.postImage, imageUrls.length === 1 && styles.postImageFull]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}

              {/* Divider */}
              <View style={styles.divider} />

              {/* Reactions + comment toggle */}
              <View style={styles.actionsRow}>
                <Pressable style={styles.commentToggle} onPress={() => toggleComments(item.id)}>
                  <Text style={styles.commentToggleText}>
                    💬 {item.comments.length > 0 ? item.comments.length : ''} تعليقات
                  </Text>
                </Pressable>
                <View style={styles.reactionsGroup}>
                  {REACTIONS.map((r) => {
                    const count = item.reactions.filter((x) => x.reaction_type === r.type).length;
                    const active = myReaction?.reaction_type === r.type;
                    return (
                      <Pressable
                        key={r.type}
                        style={[styles.reactBtn, active && styles.reactBtnActive]}
                        onPress={() => handleReaction(item.id, r.type)}
                      >
                        <Text style={styles.reactEmoji}>{r.emoji}</Text>
                        {count > 0 && (
                          <Text style={[styles.reactCount, active && styles.reactCountActive]}>{count}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Comments section */}
              {commentsExpanded && (
                <View style={styles.commentsSection}>
                  {item.comments.length === 0 ? (
                    <Text style={styles.noComments}>لا توجد تعليقات بعد</Text>
                  ) : (
                    item.comments.map((c) => {
                      const cName = c.author
                        ? `${c.author.given_name} ${c.author.family_name}`
                        : 'مجهول';
                      return (
                        <View key={c.id} style={styles.commentRow}>
                          <AvatarCircle name={cName} size={28} />
                          <View style={styles.commentBubble}>
                            <Text style={styles.commentAuthor}>{cName}</Text>
                            <Text style={styles.commentContent}>{c.content}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                  <View style={styles.commentInputRow}>
                    <Pressable
                      style={[styles.commentSendBtn, !commentText.trim() && styles.commentSendBtnDisabled]}
                      onPress={() => sendComment(item.id)}
                      disabled={!commentText.trim() || sendingComment === item.id}
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
                      placeholder="أضف تعليقاً..."
                      placeholderTextColor={COLORS.white40}
                      style={styles.commentInput}
                      textAlign="right"
                      multiline
                      maxLength={500}
                    />
                  </View>
                </View>
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
  imagePreviewWrap: { marginHorizontal: 14, marginBottom: 8, position: 'relative' },
  imagePreview: { width: '100%', height: 160, borderRadius: 10 },
  removeImage: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  removeImageText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  imagePickBtn: {
    width: 36, height: 36,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.goldBorder,
  },
  imagePickIcon: { fontSize: 18 },
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

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 14, paddingBottom: 12 },
  postImage: { width: '31%', height: 100, borderRadius: 8, flex: 1 },
  postImageFull: { width: '100%', height: 200, borderRadius: 10 },

  divider: { height: 1, backgroundColor: COLORS.white06, marginHorizontal: 14 },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentToggle: { paddingVertical: 4 },
  commentToggleText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted },
  reactionsGroup: { flexDirection: 'row', gap: 6 },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: COLORS.white10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactBtnActive: {
    backgroundColor: 'rgba(230,171,44,0.15)',
    borderColor: 'rgba(230,171,44,0.5)',
  },
  reactEmoji: { fontSize: 15 },
  reactCount: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  reactCountActive: { color: COLORS.gold },

  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.white06,
    padding: 12,
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  noComments: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'center', paddingVertical: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, justifyContent: 'flex-end' },
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
});
