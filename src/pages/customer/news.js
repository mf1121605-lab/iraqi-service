import { useEffect, useRef, useState } from 'react';
import { ClipboardList, GraduationCap, Heart, Image as ImageIcon, LayoutGrid, MessageCircle, Newspaper, Search, Send, ThumbsUp, Trash2, TriangleAlert } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import QuickRequestWidget from '../../components/UI/QuickRequestWidget';
import LoadingSpinner from '../../components/LoadingSpinner';
import Avatar from '../../components/Chat/Avatar';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const REACTIONS = [
  { type: 'like',  emoji: '👍', key: 'likeCta' },
  { type: 'love',  emoji: '❤️', key: 'loveCta' },
  { type: 'angry', emoji: '😡', key: 'angryCta' },
];

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function timeAgo(isoString, locale) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'ar' ? 'الآن' : 'ئێستا';
  if (mins < 60) return locale === 'ar' ? `منذ ${mins} دقيقة` : `${mins} خولەک لەمەوبەر`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return locale === 'ar' ? `منذ ${hrs} ساعة` : `${hrs} کاتژمێر لەمەوبەر`;
  const days = Math.floor(hrs / 24);
  return locale === 'ar' ? `منذ ${days} يوم` : `${days} ڕۆژ لەمەوبەر`;
}

function PostCard({ post, profile, locale, t, onReact, onDelete, onComment, onDeleteComment }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const inputRef = useRef(null);

  const reactions = post.reactions ?? [];
  const comments  = post.comments  ?? [];
  const myReaction = reactions.find((r) => r.user_id === profile.id);

  const reactionCounts = REACTIONS.map(({ type, emoji, key }) => ({
    type, emoji, key,
    count: reactions.filter((r) => r.reaction_type === type).length,
    mine:  myReaction?.reaction_type === type,
  }));

  async function handleSendComment() {
    const text = commentText.trim();
    if (!text) return;
    setSendingComment(true);
    await onComment(post.id, text);
    setCommentText('');
    setSendingComment(false);
  }

  return (
    <article className="metal-panel overflow-hidden p-0 text-ink-light dark:text-white">
      {/* Post header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar avatarKey={post.author?.avatar_key} name={post.author?.given_name} seed={post.author_id} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{post.author?.given_name || t('socialFeed.anonymousAuthor')}</p>
          <p className="text-xs text-ink-muted dark:text-white/40">{timeAgo(post.created_at, locale)}</p>
        </div>
        {(post.author_id === profile.id || profile.role === 'founder') && (
          <button
            type="button"
            onClick={() => onDelete(post.id)}
            className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-500/10 hover:text-red-400 dark:text-white/30"
            aria-label={t('socialFeed.deletePostCta')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="mt-3 px-4 text-sm leading-relaxed">{post.content}</p>
      )}
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt="" className="mt-3 w-full object-cover" style={{ maxHeight: '28rem' }} />
      )}

      {/* Reaction bar */}
      <div className="mt-3 flex gap-1 border-t border-black/5 px-4 pb-1 pt-3 dark:border-white/5">
        {reactionCounts.map(({ type, emoji, key, count, mine }) => (
          <button
            key={type}
            type="button"
            onClick={() => onReact(post.id, type, myReaction)}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
              mine
                ? 'bg-gold-400/15 font-bold text-gold-600 dark:text-gold-300'
                : 'text-ink-muted hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
          </button>
        ))}

        <button
          type="button"
          onClick={() => { setCommentsOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="ms-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs">{comments.length > 0 ? comments.length : ''} {t('socialFeed.commentsCta')}</span>
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="border-t border-black/5 px-4 pb-4 pt-3 dark:border-white/5">
          {comments.length > 0 && (
            <ul className="mb-3 space-y-2.5">
              {comments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-2">
                  <Avatar avatarKey={comment.author?.avatar_key} name={comment.author?.given_name} seed={comment.author_id} className="h-7 w-7" />
                  <div className="min-w-0 flex-1 rounded-xl bg-black/5 px-3 py-1.5 dark:bg-white/5">
                    <p className="text-xs font-semibold">{comment.author?.given_name || '—'}</p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                  {(comment.author_id === profile.id || profile.role === 'founder') && (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(comment.id)}
                      className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:text-red-400 dark:text-white/30"
                      aria-label={t('socialFeed.deleteCommentCta')}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2">
            <Avatar avatarKey={profile.avatar_key} name={profile.given_name} seed={profile.id} className="h-7 w-7" />
            <input
              ref={inputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder={t('socialFeed.writeCommentPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-black/5 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="button"
              onClick={handleSendComment}
              disabled={!commentText.trim() || sendingComment}
              className="rounded-xl bg-gold-500 p-1.5 text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label={t('socialFeed.sendCommentCta')}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function CustomerNews() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [posts, setPosts] = useState(null);
  const [postText, setPostText] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/search', label: t('search.navLabel'), icon: Search },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), icon: ClipboardList },
    { href: '/customer/news', label: t('socialFeed.navCta'), active: true, icon: Newspaper },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];

  function buildQuery() {
    return supabaseClient
      .from('social_posts')
      .select('*, author:profiles(given_name, avatar_key, role), reactions:social_reactions(*), comments:social_comments(*, author:profiles(given_name, avatar_key))')
      .order('created_at', { ascending: false })
      .limit(50);
  }

  function load() {
    buildQuery().then(({ data }) => setPosts(data ?? []));
  }

  useEffect(() => {
    if (!profile) return undefined;
    load();
    const channel = supabaseClient
      .channel('social-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_reactions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_comments' }, load)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImageError('');
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setImageError(t('common.imageTypeInvalid')); return; }
    if (file.size > MAX_IMAGE_BYTES) { setImageError(t('common.imageTooLarge')); return; }
    setImageUploading(true);
    const path = `social/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) { setImageUploading(false); setImageError(uploadError.message); return; }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    setImageUploading(false);
    setPostImageUrl(data.publicUrl);
  }

  async function handlePost(event) {
    event.preventDefault();
    if (!postText.trim() && !postImageUrl) return;
    setSubmitting(true);
    await supabaseClient.from('social_posts').insert({
      author_id: profile.id,
      content: postText.trim() || null,
      image_url: postImageUrl || null,
    });
    setPostText('');
    setPostImageUrl('');
    setSubmitting(false);
    load();
  }

  async function handleReact(postId, reactionType, existingReaction) {
    if (existingReaction) {
      await supabaseClient.from('social_reactions').delete().eq('id', existingReaction.id);
      if (existingReaction.reaction_type !== reactionType) {
        await supabaseClient.from('social_reactions').insert({ post_id: postId, user_id: profile.id, reaction_type: reactionType });
      }
    } else {
      await supabaseClient.from('social_reactions').insert({ post_id: postId, user_id: profile.id, reaction_type: reactionType });
    }
    load();
  }

  async function handleDeletePost(postId) {
    await supabaseClient.from('social_posts').delete().eq('id', postId);
    load();
  }

  async function handleComment(postId, content) {
    await supabaseClient.from('social_comments').insert({ post_id: postId, author_id: profile.id, content });
    load();
  }

  async function handleDeleteComment(commentId) {
    await supabaseClient.from('social_comments').delete().eq('id', commentId);
    load();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-ink-light dark:text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <h2 className="section-title-cinematic font-display text-lg font-bold">
        <Newspaper className="h-5 w-5 text-gold-600 dark:text-gold-300" aria-hidden="true" />
        {t('socialFeed.pageTitle')}
      </h2>

      <div className="mt-5">
        <QuickRequestWidget sectionName={t('socialFeed.pageTitle')} locale={locale} profile={profile} />
      </div>

      {/* Post composer */}
      <form onSubmit={handlePost} className="metal-panel mt-5 p-4 text-ink-light dark:text-white">
        <div className="flex items-start gap-3">
          <Avatar avatarKey={profile.avatar_key} name={profile.given_name} seed={profile.id} className="h-10 w-10" />
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder={t('socialFeed.writePostPlaceholder')}
            rows={3}
            className="min-w-0 flex-1 resize-none rounded-xl border border-black/10 bg-black/5 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 dark:border-white/10 dark:bg-white/5"
          />
        </div>
        {postImageUrl && (
          <div className="relative mt-3 ms-13">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={postImageUrl} alt="" className="max-h-48 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setPostImageUrl('')}
              className="absolute end-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        {imageError && <p className="mt-2 text-xs text-red-400">{imageError}</p>}
        <div className="mt-3 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {imageUploading ? t('common.uploading') : t('socialFeed.addImageCta')}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} disabled={imageUploading} />
          </label>
          <button
            type="submit"
            disabled={submitting || (!postText.trim() && !postImageUrl)}
            className="btn-cinematic-gold flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {t('socialFeed.postCta')}
          </button>
        </div>
      </form>

      {/* Feed */}
      {posts === null ? (
        <LoadingSpinner inline locale={locale} className="mt-6" />
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted">{t('socialFeed.empty')}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              profile={profile}
              locale={locale}
              t={t}
              onReact={handleReact}
              onDelete={handleDeletePost}
              onComment={handleComment}
              onDeleteComment={handleDeleteComment}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
