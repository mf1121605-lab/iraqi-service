import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar } from '@/components/chat/Avatar';
import { FollowersModal, type FollowTab } from '@/components/profile/FollowersModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface PublicProfile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  avatar_key: string | null;
  bio: string | null;
  role: string;
}

interface PublicPost {
  id: string;
  content: string | null;
  image_urls: string[] | null;
  video_url: string | null;
  created_at: string;
  reactionCount: number;
  commentCount: number;
}

type DmState =
  | { kind: 'none' }
  | { kind: 'pending_sent' }
  | { kind: 'pending_received'; invitationId: string }
  | { kind: 'thread'; threadId: string };

async function uploadOwnPhoto(uri: string, userId: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    // React Native's Blob polyfill is unreliable for binary upload bodies —
    // it can report the correct size while silently sending empty/corrupted
    // data. arrayBuffer() is Supabase's own recommended path for RN.
    const arrayBuffer = await response.arrayBuffer();
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('site-assets').upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) { console.error('avatar upload failed:', error.message); return null; }
    return path;
  } catch {
    return null;
  }
}

// Shared "public page" view — used both for the customer's own "حسابي" tab
// (isSelf true, no navigation stack push, edit affordances shown) and for
// viewing any other member's page via /user/[userId] (follow + message
// actions shown instead).
export function PublicProfileView({ userId }: { userId: string }) {
  const { session, profile: myProfile, refreshProfile } = useAuth();
  const myId = session?.user.id;
  const isSelf = !!myId && myId === userId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<PublicProfile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [dmState, setDmState] = useState<DmState>({ kind: 'none' });
  const [dmBusy, setDmBusy] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // null = closed. Holds which tab to open on, so the two counters land on
  // their own list rather than always the first one.
  const [followSheet, setFollowSheet] = useState<FollowTab | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;

    // public_profiles (not profiles directly) — profiles RLS only ever
    // allowed self/staff/your-assigned-employee to see a row, so viewing
    // anyone else's page got stuck spinning forever before this. The view
    // exposes only safe columns regardless of viewer (see
    // 20260903120000_public_profiles_view.sql) — phone/email etc. are
    // never selected here and never reachable through it.
    const [{ data: prof }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from('public_profiles').select('id, given_name, family_name, avatar_key, bio, role').eq('id', userId).single(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    setProfileData(prof ?? null);
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);

    if (myId && myId !== userId) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', myId)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }

    const { data: postRows } = await supabase
      .from('social_posts')
      .select('id, content, image_urls, video_url, created_at, reactions:social_reactions(user_id), comments:social_comments(id)')
      .eq('author_id', userId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(30);
    setPosts(
      (postRows ?? []).map((p: any) => ({
        id: p.id,
        content: p.content,
        image_urls: p.image_urls,
        video_url: p.video_url,
        created_at: p.created_at,
        reactionCount: p.reactions?.length ?? 0,
        commentCount: p.comments?.length ?? 0,
      })),
    );

    if (myId && myId !== userId) {
      const lo = myId < userId ? myId : userId;
      const hi = myId < userId ? userId : myId;
      const { data: threadRow } = await supabase
        .from('direct_message_threads')
        .select('id')
        .eq('user_a_id', lo)
        .eq('user_b_id', hi)
        .maybeSingle();
      if (threadRow) {
        setDmState({ kind: 'thread', threadId: threadRow.id });
      } else {
        const { data: invRow } = await supabase
          .from('chat_room_invitations')
          .select('id, sender_id, receiver_id')
          .eq('status', 'pending')
          .or(`and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`)
          .maybeSingle();
        if (invRow && invRow.receiver_id === myId) setDmState({ kind: 'pending_received', invitationId: invRow.id });
        else if (invRow) setDmState({ kind: 'pending_sent' });
        else setDmState({ kind: 'none' });
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId, myId]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    if (!myId || !userId || followBusy) return;
    setFollowBusy(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myId).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: myId, following_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setFollowBusy(false);
  }

  async function handleMessagePress() {
    if (!myId || !userId || dmBusy) return;
    setDmBusy(true);
    if (dmState.kind === 'thread') {
      router.push({ pathname: '/(chat)/dm/[threadId]', params: { threadId: dmState.threadId } });
    } else if (dmState.kind === 'pending_received') {
      const { data, error } = await supabase.rpc('accept_chat_invitation', { p_invitation_id: dmState.invitationId });
      if (!error && data) {
        router.push({ pathname: '/(chat)/dm/[threadId]', params: { threadId: data as string } });
      }
    } else if (dmState.kind === 'none') {
      const { error } = await supabase.from('chat_room_invitations').insert({ sender_id: myId, receiver_id: userId });
      if (!error) setDmState({ kind: 'pending_sent' });
    }
    setDmBusy(false);
  }

  async function handleChangeAvatar() {
    if (!myProfile || avatarUploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('إذن مطلوب', 'يرجى السماح بالوصول إلى الصور من إعدادات الجهاز لتغيير صورتك.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setAvatarUploading(true);
    const path = await uploadOwnPhoto(result.assets[0].uri, myProfile.id);
    if (path) {
      await supabase.from('profiles').update({ avatar_key: path }).eq('id', myProfile.id);
      await refreshProfile();
      await load();
    } else {
      Alert.alert('تعذّر رفع الصورة', 'حاول مرة أخرى.');
    }
    setAvatarUploading(false);
  }

  if (loading || !profileData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  const fullName = [profileData.given_name, profileData.family_name].filter(Boolean).join(' ') || 'عضو';
  const messageBtnLabel =
    dmState.kind === 'thread' ? '💬 فتح المحادثة'
    : dmState.kind === 'pending_received' ? '✓ قبول طلب المراسلة'
    : dmState.kind === 'pending_sent' ? 'بانتظار الموافقة'
    : '✉️ إرسال طلب مراسلة';

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.gold} />}
      >
        <View style={styles.headerCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={isSelf ? handleChangeAvatar : undefined}
            disabled={!isSelf || avatarUploading}
          >
            <Avatar avatarKey={profileData.avatar_key} name={fullName} seed={profileData.id} size={88} />
            {isSelf && (
              <View style={styles.avatarEditBadge}>
                {avatarUploading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.avatarEditIcon}>✎</Text>
                )}
              </View>
            )}
          </Pressable>
          <Text style={styles.name}>{fullName}</Text>
          {profileData.bio ? <Text style={styles.bio}>{profileData.bio}</Text> : null}

          <View style={styles.statsRow}>
            <Pressable
              style={({ pressed }) => [styles.statBox, pressed && { opacity: 0.7 }]}
              onPress={() => setFollowSheet('followers')}
            >
              <Text style={styles.statNum}>{followerCount}</Text>
              <Text style={styles.statLabel}>متابعون</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable
              style={({ pressed }) => [styles.statBox, pressed && { opacity: 0.7 }]}
              onPress={() => setFollowSheet('following')}
            >
              <Text style={styles.statNum}>{followingCount}</Text>
              <Text style={styles.statLabel}>يتابع</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLabel}>منشورات</Text>
            </View>
          </View>

          {isSelf ? (
            <Pressable
              style={styles.settingsBtn}
              onPress={() => router.push('/(customer)/account-settings')}
            >
              <Text style={styles.settingsBtnText}>⚙️ إعدادات الحساب</Text>
            </Pressable>
          ) : (
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={toggleFollow}
                disabled={followBusy}
              >
                {isFollowing && <Text style={styles.followCheckmark}>✓</Text>}
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? 'متابَع' : 'متابعة'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.msgBtn, dmState.kind === 'pending_sent' && styles.msgBtnDisabled]}
                onPress={handleMessagePress}
                disabled={dmBusy || dmState.kind === 'pending_sent'}
              >
                <Text style={styles.msgBtnText}>{messageBtnLabel}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.postsSectionTitle}>المنشورات</Text>
          {posts.length === 0 ? (
            <Text style={styles.emptyPosts}>لا توجد منشورات بعد</Text>
          ) : (
            posts.map((p) => (
              <View key={p.id} style={styles.postCard}>
                {p.content ? <Text style={styles.postContent}>{p.content}</Text> : null}
                {p.image_urls && p.image_urls.length > 0 ? (
                  <Image source={{ uri: p.image_urls[0] }} style={styles.postImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                ) : null}
                <View style={styles.postMetaRow}>
                  <Text style={styles.postMeta}>💬 {p.commentCount}</Text>
                  <Text style={styles.postMeta}>👍 {p.reactionCount}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Counters open this. It reloads its own counts-independent lists, and
          on close the profile refreshes so a follow/unfollow made inside the
          sheet is reflected in the numbers above. */}
      <FollowersModal
        visible={followSheet !== null}
        userId={userId}
        initialTab={followSheet ?? 'followers'}
        onClose={() => { setFollowSheet(null); load(); }}
      />
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },

  headerCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.18)',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.gold,
    padding: 3,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 13, color: '#000', fontFamily: FONTS.bold },
  name: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white, marginTop: 6 },
  bio: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, maxWidth: '90%' },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 18 },
  statBox: { alignItems: 'center', gap: 2 },
  statNum: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold },
  statLabel: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.white06 },

  settingsBtn: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.white20,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  settingsBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
  },
  followBtnActive: { backgroundColor: 'rgba(230,171,44,0.15)', borderWidth: 1, borderColor: COLORS.gold },
  followBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#000' },
  followBtnTextActive: { color: COLORS.gold },
  followCheckmark: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },

  msgBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.white20,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
  },
  msgBtnDisabled: { opacity: 0.5 },
  msgBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },

  postsSection: { gap: 10 },
  postsSectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'right' },
  emptyPosts: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 24 },

  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.white06,
    padding: 12,
    gap: 8,
  },
  postContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white, textAlign: 'right', lineHeight: 20 },
  postImage: { width: '100%', height: 160, borderRadius: 10 },
  postMetaRow: { flexDirection: 'row', gap: 14, justifyContent: 'flex-end' },
  postMeta: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
});
