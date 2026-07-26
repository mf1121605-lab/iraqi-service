import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { GoldCard } from '@/components/ui/GoldCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

type Post = {
  id: string;
  content: string | null;
  created_at: string;
  author: { given_name: string; family_name: string } | null;
  reactions: { reaction_type: string; user_id: string }[];
  comments: { id: string; content: string; author: { given_name: string } | null }[];
};

const REACTIONS = [
  { type: 'like',    emoji: '👍' },
  { type: 'dislike', emoji: '👎' },
];

export default function NewsScreen() {
  const { session, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('social_posts')
      .select(`
        id, content, created_at,
        author:profiles!author_id(given_name, family_name),
        reactions:social_reactions(reaction_type, user_id),
        comments:social_comments(id, content, author:profiles!author_id(given_name))
      `)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setPosts(data as Post[]);
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

  async function submitPost() {
    if (!newPost.trim() || !session?.user.id) return;
    setPosting(true);
    await supabase.from('social_posts').insert({
      author_id: session.user.id,
      content: newPost.trim(),
      approved: false,
    });
    setNewPost('');
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
      await supabase.from('social_reactions').insert({ post_id: postId, user_id: session.user.id, reaction_type: type });
    }
    loadPosts();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'short', timeZone: 'Asia/Baghdad' });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} tintColor={COLORS.gold} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.pageTitle}>آخر الأخبار</Text>
            <GoldCard style={styles.composer}>
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
              <GoldButton
                label="نشر"
                onPress={submitPost}
                loading={posting}
                style={styles.postBtn}
                small
              />
              {newPost.trim() && (
                <Text style={styles.pendingNote}>سيظهر بعد موافقة الإدارة</Text>
              )}
            </GoldCard>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📰</Text>
            <Text style={styles.emptyText}>لا توجد منشورات بعد</Text>
          </View>
        }
        renderItem={({ item }) => {
          const myReaction = item.reactions.find((r) => r.user_id === session?.user.id);
          const authorName = item.author
            ? `${item.author.given_name} ${item.author.family_name}`
            : 'مجهول';
          return (
            <GoldCard style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text style={styles.authorName}>{authorName}</Text>
                <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
              </View>
              {item.content ? (
                <Text style={styles.postContent}>{item.content}</Text>
              ) : null}
              {/* Reactions */}
              <View style={styles.reactRow}>
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
                      {count > 0 && <Text style={[styles.reactCount, active && styles.reactCountActive]}>{count}</Text>}
                    </Pressable>
                  );
                })}
                <Text style={styles.commentCount}>{item.comments.length} تعليق</Text>
              </View>
            </GoldCard>
          );
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  header: { gap: 12, marginBottom: 4 },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.white },
  composer: { gap: 10 },
  composerInput: {
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  postBtn: { alignSelf: 'flex-end' },
  pendingNote: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.muted },
  postCard: { gap: 10 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.gold },
  postDate: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  postContent: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, lineHeight: 22, textAlign: 'right' },
  reactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  reactEmoji: { fontSize: 16 },
  reactCount: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  reactCountActive: { color: COLORS.gold },
  commentCount: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, marginLeft: 'auto' },
});
