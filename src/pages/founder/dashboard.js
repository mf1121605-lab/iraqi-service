import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import StatusBadge from '../../components/UI/StatusBadge';
import AnnouncementSlider from '../../components/UI/AnnouncementSlider';
import EditCardModal from '../../components/UI/EditCardModal';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';
import { hoverLift } from '../../components/UI/Motion';

// WebGL needs a browser, so the 3D badge is client-only.
const Icon3D = dynamic(() => import('../../components/UI/Icon3D'), { ssr: false });

export default function FounderDashboard() {
  const { profile, loading, signOut } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'dashboard');
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [requests, setRequests] = useState([]);
  const [banners, setBanners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!profile) return undefined;

    function loadBanners() {
      supabaseClient
        .from('announcements')
        .select(
          'id, title_ar, title_ckb, description_ar, description_ckb, image_url, mobile_image_url, video_url, badge_ar, badge_ckb, button_text_ar, button_text_ckb, button_link, background_color, text_color, display_order'
        )
        .eq('is_active', true)
        .order('display_order')
        .then(({ data }) => setBanners(data ?? []));
    }

    loadBanners();
    const channel = supabaseClient
      .channel('founder-dashboard-banners-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, loadBanners)
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabaseClient.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseClient.from('requests').select('id', { count: 'exact', head: true }),
      supabaseClient.from('products').select('id', { count: 'exact', head: true }),
      supabaseClient.from('orders').select('total_price').eq('payment_status', 'paid'),
      supabaseClient.from('profiles').select('id, given_name, father_name, role, specialization, created_at').eq('role', 'employee').order('created_at', { ascending: false }).limit(5),
      supabaseClient.from('requests').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    ]).then(([usersRes, reqRes, prodRes, ordersRes, empRes, reqListRes]) => {
      const revenue = (ordersRes.data ?? []).reduce((sum, o) => sum + Number(o.total_price || 0), 0);
      setStats({ users: usersRes.count ?? 0, requests: reqRes.count ?? 0, products: prodRes.count ?? 0, revenue });
      setEmployees(empRes.data ?? []);
      setRequests(reqListRes.data ?? []);
    });
  }, [profile]);

  function startEdit(banner) {
    setEditingId(banner.id);
    setEditError('');
    setEditForm({
      titleAr: banner.title_ar,
      titleCkb: banner.title_ckb,
      mediaUrl: banner.video_url || banner.image_url || null,
      mediaType: banner.video_url ? 'video' : banner.image_url ? 'image' : null,
    });
  }

  async function saveEdit() {
    setEditError('');
    setSaving(true);
    const { error: updateError } = await supabaseClient
      .from('announcements')
      .update({
        title_ar: editForm.titleAr,
        title_ckb: editForm.titleCkb,
        image_url: editForm.mediaType === 'image' ? editForm.mediaUrl : null,
        video_url: editForm.mediaType === 'video' ? editForm.mediaUrl : null,
      })
      .eq('id', editingId);
    setSaving(false);
    if (updateError) {
      setEditError(updateError.message || t('common.errorGeneric'));
      return;
    }
    setEditingId(null);
    setEditForm(null);
  }

  if (loading || !profile) {
    return <main className="flex min-h-screen items-center justify-center text-white">{t('common.loading')}</main>;
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id}>
      <h2 className="section-title-cinematic font-display text-xl font-bold">
        <LayoutDashboard className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderDashboard.title')}
      </h2>

      {banners.length > 0 && (
        <div className="mt-6">
          <AnnouncementSlider banners={banners} locale={locale} canEdit onEdit={startEdit} />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { variant: 'general', color: '#e6ab2c', glow: 'rgba(230,171,44,0.55)', label: t('founderDashboard.statsTotalUsers'), value: stats?.users ?? '—' },
          { variant: 'education', color: '#4f8bff', glow: 'rgba(79,139,255,0.55)', label: t('founderDashboard.statsTotalRequests'), value: stats?.requests ?? '—' },
          { variant: 'welfare', color: '#e14b6a', glow: 'rgba(225,75,106,0.55)', label: t('founderDashboard.statsTotalRevenue'), value: `${stats?.revenue ?? 0} IQD` },
          { variant: 'military', color: '#c9d3dc', glow: 'rgba(201,211,220,0.5)', label: t('founderDashboard.statsTotalProducts'), value: stats?.products ?? '—' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            {...hoverLift}
            className="metal-panel animate-slide-up flex flex-col items-center gap-3 p-6 text-center text-white"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="icon-medallion h-20 w-20" style={{ '--medallion-glow': stat.glow }}>
              <Icon3D variant={stat.variant} color={stat.color} className="h-16 w-16" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-white/60">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="metal-panel p-6 text-white">
          <h3 className="font-display font-semibold">{t('founderDashboard.recentEmployees')}</h3>
          {employees.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">{t('founderDashboard.noEmployees')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {employees.map((emp) => (
                <li key={emp.id} className="rounded-xl2 border border-white/10 p-3 text-sm transition-all duration-200 hover:bg-white/5">
                  <p className="font-semibold">{[emp.given_name, emp.father_name].filter(Boolean).join(' ') || '—'}</p>
                  <p className="text-xs text-white/60">{emp.specialization || ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="metal-panel p-6 text-white">
          <h3 className="font-display font-semibold">{t('founderDashboard.recentRequests')}</h3>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">{t('founderDashboard.noRequests')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center justify-between gap-2 rounded-xl2 border border-white/10 p-3 text-sm transition-all duration-200 hover:bg-white/5"
                >
                  <p className="min-w-0 truncate font-semibold">{req.title}</p>
                  <StatusBadge status={req.status} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <EditCardModal
        open={editingId !== null}
        onClose={() => {
          setEditingId(null);
          setEditForm(null);
        }}
        locale={locale}
        titleAr={editForm?.titleAr ?? ''}
        titleCkb={editForm?.titleCkb ?? ''}
        onTitleArChange={(value) => setEditForm({ ...editForm, titleAr: value })}
        onTitleCkbChange={(value) => setEditForm({ ...editForm, titleCkb: value })}
        mediaUrl={editForm?.mediaUrl}
        mediaType={editForm?.mediaType}
        onMediaSelect={(item) => setEditForm({ ...editForm, mediaUrl: item.url, mediaType: item.type })}
        onMediaClear={() => setEditForm({ ...editForm, mediaUrl: null, mediaType: null })}
        onSave={saveEdit}
        saving={saving}
        error={editError}
        maxVideoSeconds={15}
      />
    </AppShell>
  );
}
