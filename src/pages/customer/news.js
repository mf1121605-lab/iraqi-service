import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, ClipboardList, Download, GraduationCap,
  Image as ImageIcon, LayoutGrid, MessageCircle, Newspaper, Pin, PinOff,
  Reply, Search, Send, Share2, Trash2, X,
} from 'lucide-react';
import { audioFX } from '../../utils/audioFX';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import Avatar from '../../components/Chat/Avatar';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

// ─── Constants ──────────────────────────────────────────────────────────────

const REACTIONS = [
  { type: 'love',    emoji: '💖', key: 'loveCta' },
  { type: 'laugh',   emoji: '😂', key: 'laughCta' },
  { type: 'like',    emoji: '👍', key: 'likeCta' },
  { type: 'dislike', emoji: '👎', key: 'dislikeCta' },
  { type: 'angry',   emoji: '😡', key: 'angryCta' },
];

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(isoString, locale) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return locale === 'ar' ? 'الآن' : 'ئێستا';
  if (mins < 60) return locale === 'ar' ? `منذ ${mins} د` : `${mins} خولەک`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return locale === 'ar' ? `منذ ${hrs} س` : `${hrs} کاتژمێر`;
  const days = Math.floor(hrs / 24);
  return locale === 'ar' ? `منذ ${days} يوم` : `${days} ڕۆژ`;
}

function mergeImages(post) {
  const arr = Array.isArray(post.image_urls) ? post.image_urls : [];
  if (post.image_url && !arr.includes(post.image_url)) return [...arr, post.image_url];
  return arr;
}

async function sharePost(post, locale) {
  const text = post.content || (locale === 'ar' ? 'شاهد هذا المنشور' : 'ئەم پۆستە ببینە');
  if (navigator.share) {
    navigator.share({ title: text.slice(0, 80), text }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(text).catch(() => {});
  }
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="metal-panel animate-pulse overflow-hidden p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-32 rounded bg-white/10" />
          <div className="h-2.5 w-20 rounded bg-white/8" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-4/5 rounded bg-white/10" />
      </div>
      <div className="h-36 rounded-xl bg-white/5" />
    </div>
  );
}

// ─── Image Carousel ──────────────────────────────────────────────────────────

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);
  const src = images[idx];

  return (
    <div className="relative mt-3 select-none overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full object-cover transition-opacity duration-200"
        style={{ maxHeight: '28rem' }}
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute start-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            aria-label="previous"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute end-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            aria-label="next"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Indicator dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                aria-label={`image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Download button */}
      <a
        href={src}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
        aria-label="download"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

// ─── Comment Thread ──────────────────────────────────────────────────────────

function CommentItem({ comment, replies, profile, t, onDelete, onReply }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);

  async function handleReply() {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    await onReply(comment.id, text);
    setReplyText('');
    setSending(false);
    setReplyOpen(false);
    setRepliesOpen(true);
  }

  return (
    <li>
      <div className="flex items-start gap-2">
        <Avatar
          avatarKey={comment.author?.avatar_key}
          name={comment.author?.given_name}
          seed={comment.author_id}
          className="h-7 w-7 shrink-0"
        />
        <div className="min-w-0 flex-1 rounded-xl bg-black/5 px-3 py-1.5 dark:bg-white/5">
          <p className="text-xs font-semibold">{comment.author?.given_name || '—'}</p>
          <p className="text-sm leading-relaxed">{comment.content}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {(comment.author_id === profile.id || ['founder', 'employee'].includes(profile.role)) && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="rounded-lg p-1 text-ink-muted transition-colors hover:text-red-400 dark:text-white/30"
              aria-label={t('socialFeed.deleteCommentCta')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setReplyOpen((o) => !o)}
            className="rounded-lg p-1 text-xs text-ink-muted hover:text-gold-600 dark:text-white/30 dark:hover:text-gold-300"
          >
            <Reply className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Reply input */}
      {replyOpen && (
        <div className="mt-2 ms-9 flex items-center gap-2">
          <input
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleReply(); } }}
            placeholder={t('socialFeed.replyPlaceholder')}
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-black/5 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 dark:border-white/10 dark:bg-white/5"
          />
          <button
            type="button"
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="rounded-xl bg-gold-500 p-1.5 text-black disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setReplyOpen(false)} className="text-ink-muted dark:text-white/30">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="ms-9 mt-2">
          <button
            type="button"
            onClick={() => setRepliesOpen((o) => !o)}
            className="text-xs font-semibold text-gold-600 hover:underline dark:text-gold-300"
          >
            {repliesOpen
              ? t('socialFeed.hideReplies')
              : t('socialFeed.showReplies').replace('{count}', replies.length)}
          </button>
          {repliesOpen && (
            <ul className="mt-2 space-y-2">
              {replies.map((reply) => (
                <li key={reply.id} className="flex items-start gap-2">
                  <Avatar
                    avatarKey={reply.author?.avatar_key}
                    name={reply.author?.given_name}
                    seed={reply.author_id}
                    className="h-6 w-6 shrink-0"
                  />
                  <div className="min-w-0 flex-1 rounded-xl bg-black/5 px-3 py-1.5 text-sm dark:bg-white/5">
                    <p className="text-xs font-semibold">{reply.author?.given_name || '—'}</p>
                    <p>{reply.content}</p>
                  </div>
                  {(reply.author_id === profile.id || ['founder', 'employee'].includes(profile.role)) && (
                    <button
                      type="button"
                      onClick={() => onDelete(reply.id)}
                      className="shrink-0 rounded-lg p-1 text-ink-muted transition-colors hover:text-red-400 dark:text-white/30"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({ post, profile, locale, t, onReact, onDelete, onComment, onDeleteComment, onReply, onPin }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const inputRef = useRef(null);

  const reactions = post.reactions ?? [];
  const comments  = post.comments  ?? [];
  const myReaction = reactions.find((r) => r.user_id === profile.id);
  const images = mergeImages(post);

  const reactionCounts = REACTIONS.map(({ type, emoji, key }) => ({
    type, emoji, key,
    count: reactions.filter((r) => r.reaction_type === type).length,
    mine: myReaction?.reaction_type === type,
  }));

  const topComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (id) => comments.filter((c) => c.parent_comment_id === id);

  const canModerate = ['founder', 'employee'].includes(profile.role);
  const isOwner = post.author_id === profile.id;
  const isPending = !post.approved;

  async function handleSendComment() {
    const text = commentText.trim();
    if (!text) return;
    setSendingComment(true);
    await onComment(post.id, text);
    setCommentText('');
    setSendingComment(false);
  }

  return (
    <article
      className={`metal-panel overflow-hidden p-0 text-ink-light dark:text-white transition-opacity ${
        isPending && !canModerate ? 'opacity-60' : ''
      }`}
    >
      {/* Pinned indicator */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 border-b border-amber-400/20 bg-amber-400/8 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
          <Pin className="h-3 w-3" aria-hidden="true" />
          {t('socialFeed.pinnedLabel')}
        </div>
      )}

      {/* Pending approval banner */}
      {isPending && (
        <div className="flex items-center gap-1.5 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          {t('socialFeed.pendingApproval')}
        </div>
      )}

      {/* Post header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar avatarKey={post.author?.avatar_key} name={post.author?.given_name} seed={post.author_id} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{post.author?.given_name || t('socialFeed.anonymousAuthor')}</p>
          <p className="text-xs text-ink-muted dark:text-white/40">{timeAgo(post.created_at, locale)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Pin toggle — founder only */}
          {profile.role === 'founder' && (
            <button
              type="button"
              onClick={() => onPin(post.id, !post.pinned)}
              className={`rounded-lg p-1.5 transition-colors ${
                post.pinned ? 'text-amber-400 hover:text-amber-500' : 'text-ink-muted hover:text-amber-400 dark:text-white/30'
              }`}
              aria-label={post.pinned ? t('socialFeed.unpinPost') : t('socialFeed.pinPost')}
            >
              {post.pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
          {/* Staff approve button */}
          {isPending && canModerate && (
            <button
              type="button"
              onClick={() => onReact(post.id, null, null, 'approve')}
              className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-500 hover:bg-emerald-500/25"
            >
              {t('socialFeed.approveCta')}
            </button>
          )}
          {/* Delete */}
          {(isOwner || canModerate) && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-500/10 hover:text-red-400 dark:text-white/30"
              aria-label={t('socialFeed.deletePostCta')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="mt-3 px-4 text-sm leading-relaxed">{post.content}</p>
      )}

      {/* Multi-image carousel */}
      {images.length > 0 && <ImageCarousel images={images} />}

      {/* Reaction bar */}
      <div className="mt-3 flex flex-wrap items-center gap-0.5 border-t border-black/5 px-3 pb-1 pt-3 dark:border-white/5">
        {reactionCounts.map(({ type, emoji, key, count, mine }) => (
          <button
            key={type}
            type="button"
            onClick={() => { onReact(post.id, type, myReaction); audioFX.playReaction(); }}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-all ${
              mine
                ? 'bg-gold-400/15 font-bold text-gold-600 dark:text-gold-300'
                : 'text-ink-muted hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
            }`}
          >
            <span className="text-base leading-none">{emoji}</span>
            {count > 0 && <span className="tabular-nums font-semibold">{count}</span>}
          </button>
        ))}

        <div className="ms-auto flex items-center gap-1">
          {/* Share */}
          <button
            type="button"
            onClick={() => sharePost(post, locale)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
            aria-label={t('socialFeed.shareCta')}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => { setCommentsOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {comments.length > 0 && <span className="tabular-nums">{comments.length}</span>}
            <span>{t('socialFeed.commentsCta')}</span>
          </button>
        </div>
      </div>

      {/* Comments section */}
      {commentsOpen && (
        <div className="border-t border-black/5 px-4 pb-4 pt-3 dark:border-white/5">
          {topComments.length > 0 && (
            <ul className="mb-3 space-y-3">
              {topComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={getReplies(comment.id)}
                  profile={profile}
                  t={t}
                  onDelete={onDeleteComment}
                  onReply={onReply}
                />
              ))}
            </ul>
          )}
          {/* New comment input */}
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
              className="rounded-xl bg-gold-500 p-1.5 text-black disabled:opacity-40"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerNews() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [posts, setPosts] = useState(null);
  const [postText, setPostText] = useState('');
  const [postImages, setPostImages] = useState([]); // array of { url, uploading }
  const [imageError, setImageError] = useState('');
  const [postError, setPostError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      .select(`*, author:profiles(given_name, avatar_key, role),
               reactions:social_reactions(*),
               comments:social_comments(*, author:profiles(given_name, avatar_key))`)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
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

  // ── Image upload ──────────────────────────────────────────────────────────

  async function handleImageChange(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (postImages.length + files.length > MAX_IMAGES) {
      setImageError(t('socialFeed.maxImagesError').replace('{max}', MAX_IMAGES));
      return;
    }
    setImageError('');

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setImageError(t('common.imageTypeInvalid')); continue; }
      if (file.size > MAX_IMAGE_BYTES) { setImageError(t('common.imageTooLarge')); continue; }

      const placeholder = { url: '', uploading: true, id: Math.random() };
      setPostImages((prev) => [...prev, placeholder]);

      const path = `social/${crypto.randomUUID()}-${safeSlug(file.name)}`;
      const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
      if (uploadError) {
        setPostImages((prev) => prev.filter((p) => p.id !== placeholder.id));
        setImageError(uploadError.message);
        continue;
      }
      const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
      setPostImages((prev) => prev.map((p) => p.id === placeholder.id ? { ...p, url: data.publicUrl, uploading: false } : p));
    }
  }

  function removeImage(id) {
    setPostImages((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Submit post ───────────────────────────────────────────────────────────

  async function handlePost(event) {
    event.preventDefault();
    const readyImages = postImages.filter((p) => p.url && !p.uploading).map((p) => p.url);
    if (!postText.trim() && !readyImages.length) return;
    setSubmitting(true);
    setPostError('');

    const isStaff = ['founder', 'employee'].includes(profile.role);
    const { error } = await supabaseClient.from('social_posts').insert({
      author_id: profile.id,
      content: postText.trim() || null,
      image_urls: readyImages,
      approved: isStaff,
    });
    setSubmitting(false);
    if (error) { setPostError(error.message); return; }
    setPostText('');
    setPostImages([]);
    if (!isStaff) setPostError(t('socialFeed.pendingApprovalMessage'));
    else load();
    audioFX.playMessageSent();
  }

  // ── Reactions ─────────────────────────────────────────────────────────────

  async function handleReact(postId, reactionType, existingReaction, action) {
    // 'approve' is a staff action, not a reaction
    if (action === 'approve') {
      await supabaseClient.from('social_posts').update({ approved: true }).eq('id', postId);
      load();
      return;
    }
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

  async function handleReply(parentCommentId, content) {
    const { data: comment } = await supabaseClient
      .from('social_comments')
      .select('post_id')
      .eq('id', parentCommentId)
      .maybeSingle();
    if (!comment) return;
    await supabaseClient.from('social_comments').insert({
      post_id: comment.post_id,
      author_id: profile.id,
      content,
      parent_comment_id: parentCommentId,
    });
    load();
  }

  async function handleDeleteComment(commentId) {
    await supabaseClient.from('social_comments').delete().eq('id', commentId);
    load();
  }

  async function handlePin(postId, pinValue) {
    await supabaseClient.from('social_posts').update({ pinned: pinValue }).eq('id', postId);
    load();
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filteredPosts = posts === null ? null : posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.content ?? '').toLowerCase().includes(q) ||
      (p.author?.given_name ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────

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

        {/* Image previews */}
        {postImages.length > 0 && (
          <div className="mt-3 ms-13 flex flex-wrap gap-2">
            {postImages.map((img) => (
              <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                {img.uploading ? (
                  <div className="flex h-full items-center justify-center bg-black/10 dark:bg-white/5">
                    <LoadingSpinner inline showLabel={false} size={20} />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {imageError && <p className="mt-2 text-xs text-red-400">{imageError}</p>}
        {postError && (
          <p className={`mt-2 text-xs ${postError === t('socialFeed.pendingApprovalMessage') ? 'text-amber-400' : 'text-red-400'}`}>
            {postError}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <label className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            postImages.length >= MAX_IMAGES
              ? 'cursor-not-allowed opacity-40'
              : 'text-ink-muted hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
          }`}>
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {t('socialFeed.addImageCta')}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              className="hidden"
              multiple
              onChange={handleImageChange}
              disabled={postImages.length >= MAX_IMAGES}
            />
          </label>
          <button
            type="submit"
            disabled={submitting || (!postText.trim() && !postImages.some((p) => p.url))}
            className="btn-cinematic-gold flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            {t('socialFeed.postCta')}
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted dark:text-white/30" aria-hidden="true" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('socialFeed.searchPlaceholder')}
          className="w-full rounded-xl border border-black/10 bg-black/5 py-2.5 ps-9 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      {/* Feed */}
      {filteredPosts === null ? (
        <div className="mt-4 space-y-4">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/10 p-10 text-center dark:border-white/10">
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
            {searchQuery ? t('common.noResults') : t('socialFeed.empty')}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {filteredPosts.map((post) => (
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
              onReply={handleReply}
              onPin={handlePin}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
