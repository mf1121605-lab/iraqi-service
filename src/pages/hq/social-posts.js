import { useEffect, useState } from 'react';
import { CheckSquare, ClipboardCheck, MessageCircle, Newspaper, Radio, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

export default function HqSocialPosts() {
  const { profile, loading, signOut } = useRequireRole(['founder', 'employee']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const founderNavItems = useFounderNav(locale, 'social-posts');
  const employeeNavItems = [
    { href: '/employee/dashboard', label: t('employeeDesk.queueTitle'), icon: ClipboardCheck },
    { href: '/chat/hq', label: t('hq.chatNavCta'), icon: Radio },
    { href: '/hq/news-links', label: t('hq.newsLinksNavCta'), icon: Newspaper },
    { href: '/hq/social-posts', label: t('hqSocialPosts.navCta'), active: true, icon: CheckSquare },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];
  const navItems = profile?.role === 'founder' ? founderNavItems : employeeNavItems;

  const [posts, setPosts] = useState(null);
  const [tab, setTab] = useState('pending');
  const [actioning, setActioning] = useState(null);
  const [toast, setToast] = useState('');

  function load() {
    const query = supabaseClient
      .from('social_posts')
      .select('*, author:profiles(given_name, family_name, role)')
      .order('created_at', { ascending: false });

    if (tab === 'pending') {
      query.eq('approved', false);
    }

    query.then(({ data }) => setPosts(data ?? []));
  }

  useEffect(() => {
    if (!profile) return undefined;
    setPosts(null);
    load();
    const channel = supabaseClient
      .channel('hq-social-posts-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, load)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile, tab]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleApprove(postId) {
    setActioning(postId + '_approve');
    const { error } = await supabaseClient
      .from('social_posts')
      .update({ approved: true })
      .eq('id', postId);
    setActioning(null);
    if (!error) {
      setToast(t('hqSocialPosts.approvedToast'));
      load();
    }
  }

  async function handleDelete(postId) {
    setActioning(postId + '_delete');
    const { error } = await supabaseClient
      .from('social_posts')
      .delete()
      .eq('id', postId);
    setActioning(null);
    if (!error) {
      setToast(t('hqSocialPosts.deletedToast'));
      load();
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <LoadingSpinner />
      </div>
    );
  }

  const authorName = (post) => {
    const a = post.author;
    if (!a) return t('socialFeed.anonymousAuthor');
    return [a.given_name, a.family_name].filter(Boolean).join(' ') || t('socialFeed.anonymousAuthor');
  };

  const images = (post) => {
    const arr = Array.isArray(post.image_urls) ? post.image_urls : [];
    if (post.image_url && !arr.includes(post.image_url)) return [...arr, post.image_url];
    return arr;
  };

  return (
    <AppShell
      profile={profile}
      onSignOut={signOut}
      navItems={navItems}
      pageTitle={t('hqSocialPosts.pageTitle')}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-white">{t('hqSocialPosts.pageTitle')}</h1>

        {/* Tab switcher */}
        <div className="flex gap-2">
          {['pending', 'all'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                tab === key
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {key === 'pending' ? t('hqSocialPosts.pendingTab') : t('hqSocialPosts.allTab')}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
            {toast}
          </div>
        )}

        {/* Posts list */}
        {posts === null ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-white/40">
            <CheckSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>{t('hqSocialPosts.empty')}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => {
              const postImages = images(post);
              return (
                <li key={post.id} className="metal-panel rounded-2xl p-5 text-white space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        post.approved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {post.approved ? t('hqSocialPosts.approvedLabel') : t('hqSocialPosts.pendingLabel')}
                      </span>
                      <span className="text-xs text-white/40">
                        {authorName(post)}
                        {post.author?.role && (
                          <span className="ms-1 opacity-60">({post.author.role})</span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs text-white/30">
                      {new Date(post.created_at).toLocaleString(locale === 'ar' ? 'ar-IQ' : 'ckb', {
                        timeZone: 'Asia/Baghdad',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}

                  {/* Images */}
                  {postImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {postImages.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-28 w-28 flex-shrink-0 rounded-xl object-cover border border-white/10"
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    {!post.approved && (
                      <button
                        type="button"
                        disabled={!!actioning}
                        onClick={() => handleApprove(post.id)}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckSquare className="h-4 w-4" />
                        {actioning === post.id + '_approve' ? '...' : t('hqSocialPosts.approveBtn')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!!actioning}
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600/20 border border-red-500/30 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {actioning === post.id + '_delete' ? '...' : t('hqSocialPosts.rejectBtn')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
