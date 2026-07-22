import { useEffect, useState } from 'react';
import { Film, ImageIcon, Pencil, Plus, Trash2, Video } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageUploader from '../../components/UI/ImageUploader';
import CanvaDesignLink from '../../components/UI/CanvaDesignLink';
import EditCardModal from '../../components/UI/EditCardModal';
import MediaStudioModal from '../../components/UI/MediaStudioModal';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { translate } from '../../utils/i18n';

const emptyForm = {
  titleAr: '',
  titleCkb: '',
  descriptionAr: '',
  descriptionCkb: '',
  badgeAr: '',
  badgeCkb: '',
  buttonTextAr: '',
  buttonTextCkb: '',
  buttonLink: '',
  imageUrl: '',
  videoUrl: '',
  mobileImageUrl: '',
  backgroundColor: '#0f172a',
  textColor: '#ffffff',
};

function loadAnnouncements(setBanners) {
  supabaseClient.from('announcements').select('*').order('display_order').then(({ data }) => setBanners(data ?? []));
}

export default function FounderBanners() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder', 'co_admin']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'banners');
  const [banners, setBanners] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [addMediaPicker, setAddMediaPicker] = useState(null);

  useEffect(() => {
    if (!profile) return undefined;
    loadAnnouncements(setBanners);
    const channel = supabaseClient
      .channel('founder-banners-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => loadAnnouncements(setBanners))
      .subscribe();
    return () => supabaseClient.removeChannel(channel);
  }, [profile]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.titleAr || !form.titleCkb) {
      setError(t('founderBanners.titleRequired'));
      return;
    }
    const { error: insertError } = await supabaseClient.from('announcements').insert({
      title_ar: form.titleAr,
      title_ckb: form.titleCkb,
      description_ar: form.descriptionAr || null,
      description_ckb: form.descriptionCkb || null,
      badge_ar: form.badgeAr || null,
      badge_ckb: form.badgeCkb || null,
      button_text_ar: form.buttonTextAr || null,
      button_text_ckb: form.buttonTextCkb || null,
      button_link: form.buttonLink || null,
      image_url: form.imageUrl || null,
      video_url: form.videoUrl || null,
      mobile_image_url: form.mobileImageUrl || null,
      background_color: form.backgroundColor,
      text_color: form.textColor,
      display_order: banners?.length ?? 0,
      is_active: true,
      created_by: profile.id,
    });
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    setForm(emptyForm);
  }

  async function toggleActive(banner) {
    await supabaseClient.from('announcements').update({ is_active: !banner.is_active }).eq('id', banner.id);
  }

  async function handleDelete(banner) {
    await supabaseClient.from('announcements').delete().eq('id', banner.id);
  }

  function startEdit(banner) {
    setEditingId(banner.id);
    setEditError('');
    setEditForm({
      titleAr: banner.title_ar,
      titleCkb: banner.title_ckb,
      descriptionAr: banner.description_ar ?? '',
      descriptionCkb: banner.description_ckb ?? '',
      imageUrl: banner.image_url || null,
      videoUrl: banner.video_url || null,
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
        description_ar: editForm.descriptionAr || null,
        description_ckb: editForm.descriptionCkb || null,
        image_url: editForm.imageUrl || null,
        video_url: editForm.videoUrl || null,
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
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <h2 className="section-title-cinematic font-display text-xl font-bold">
        <ImageIcon className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderBanners.title')}
      </h2>

      {error && (
        <p className="mt-3 text-sm text-red-400" dir="ltr">
          {error}
        </p>
      )}

      <form onSubmit={handleAdd} className="metal-panel mt-6 space-y-4 p-6 text-white">
        <div className="grid gap-3 sm:grid-cols-2">
          <input aria-label={t('founderBanners.titleArLabel')} placeholder={t('founderBanners.titleArLabel')} value={form.titleAr} onChange={(e) => setField('titleAr', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.titleCkbLabel')} placeholder={t('founderBanners.titleCkbLabel')} value={form.titleCkb} onChange={(e) => setField('titleCkb', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.descriptionArLabel')} placeholder={t('founderBanners.descriptionArLabel')} value={form.descriptionAr} onChange={(e) => setField('descriptionAr', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.descriptionCkbLabel')} placeholder={t('founderBanners.descriptionCkbLabel')} value={form.descriptionCkb} onChange={(e) => setField('descriptionCkb', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.badgeArLabel')} placeholder={t('founderBanners.badgeArLabel')} value={form.badgeAr} onChange={(e) => setField('badgeAr', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.badgeCkbLabel')} placeholder={t('founderBanners.badgeCkbLabel')} value={form.badgeCkb} onChange={(e) => setField('badgeCkb', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.buttonTextArLabel')} placeholder={t('founderBanners.buttonTextArLabel')} value={form.buttonTextAr} onChange={(e) => setField('buttonTextAr', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.buttonTextCkbLabel')} placeholder={t('founderBanners.buttonTextCkbLabel')} value={form.buttonTextCkb} onChange={(e) => setField('buttonTextCkb', e.target.value)} className="input-cinematic text-sm" />
          <input aria-label={t('founderBanners.buttonLinkLabel')} placeholder={t('founderBanners.buttonLinkLabel')} value={form.buttonLink} onChange={(e) => setField('buttonLink', e.target.value)} dir="ltr" className="input-cinematic text-sm sm:col-span-2" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-white/60">{t('editModal.imageSlotLabel')}</p>
            <p className="mb-1.5 text-xs text-white/40">{t('editModal.imageSlotHint')}</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-black/20 object-cover" />
              )}
              <button
                type="button"
                onClick={() => setAddMediaPicker('image')}
                className="flex items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                {t('editModal.chooseMediaCta')}
              </button>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setField('imageUrl', '')}
                  className="rounded-xl2 border border-red-400/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  {t('editModal.removeMediaCta')}
                </button>
              )}
              <CanvaDesignLink locale={locale} />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-white/60">{t('editModal.videoSlotLabel')}</p>
            <div className="flex flex-wrap items-center gap-3">
              {form.videoUrl && (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <video src={form.videoUrl} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                  <span className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                    <Film className="h-2.5 w-2.5" aria-hidden="true" />
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAddMediaPicker('video')}
                className="flex items-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
              >
                <Video className="h-4 w-4" aria-hidden="true" />
                {t('editModal.chooseMediaCta')}
              </button>
              {form.videoUrl && (
                <button
                  type="button"
                  onClick={() => setField('videoUrl', '')}
                  className="rounded-xl2 border border-red-400/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  {t('editModal.removeMediaCta')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-white/60">{t('founderBanners.mobileImageLabel')}</p>
          <ImageUploader
            pathPrefix="announcements"
            value={form.mobileImageUrl}
            onUploaded={(url) => setField('mobileImageUrl', url)}
            onClear={() => setField('mobileImageUrl', '')}
            locale={locale}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-white/60">{t('founderBanners.backgroundColorLabel')}</label>
            <input
              type="color"
              value={form.backgroundColor}
              onChange={(e) => setField('backgroundColor', e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-white/60">{t('founderBanners.textColorLabel')}</label>
            <input
              type="color"
              value={form.textColor}
              onChange={(e) => setField('textColor', e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
            />
          </div>
        </div>

        <button type="submit" className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2 text-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderBanners.addCta')}
        </button>
      </form>

      {(banners ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-white/50">{t('founderBanners.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(banners ?? []).map((banner) => (
            <li key={banner.id} className="metal-panel flex items-center gap-3 p-4 text-sm text-white">
              {(banner.video_url || banner.image_url) && (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  {banner.video_url ? (
                    <video src={banner.video_url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                  {banner.video_url && (
                    <span className="absolute end-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white">
                      <Film className="h-2 w-2" aria-hidden="true" />
                    </span>
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{banner.title_ar}</p>
                {banner.button_link && (
                  <p className="truncate text-xs text-white/50" dir="ltr">
                    {banner.button_link}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={banner.is_active}
                  onChange={() => toggleActive(banner)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
                />
                {t('founderCategories.activeLabel')}
              </label>
              <button
                type="button"
                onClick={() => startEdit(banner)}
                aria-label={t('common.edit')}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gold-300 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(banner)}
                aria-label={t('founderCategories.deleteCta')}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

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
        imageUrl={editForm?.imageUrl}
        onImageSelect={(item) => setEditForm({ ...editForm, imageUrl: item.url })}
        onImageClear={() => setEditForm({ ...editForm, imageUrl: null })}
        videoUrl={editForm?.videoUrl}
        onVideoSelect={(item) => setEditForm({ ...editForm, videoUrl: item.url })}
        onVideoClear={() => setEditForm({ ...editForm, videoUrl: null })}
        onSave={saveEdit}
        saving={saving}
        error={editError}
        maxVideoSeconds={15}
        extraFields={
          editForm && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/60">{t('founderBanners.descriptionArLabel')}</label>
                <input
                  value={editForm.descriptionAr}
                  onChange={(e) => setEditForm({ ...editForm, descriptionAr: e.target.value })}
                  className="input-cinematic text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">{t('founderBanners.descriptionCkbLabel')}</label>
                <input
                  value={editForm.descriptionCkb}
                  onChange={(e) => setEditForm({ ...editForm, descriptionCkb: e.target.value })}
                  className="input-cinematic text-sm"
                />
              </div>
            </div>
          )
        }
      />

      <MediaStudioModal
        open={addMediaPicker !== null}
        onClose={() => setAddMediaPicker(null)}
        onSelect={(item) => {
          setField(addMediaPicker === 'video' ? 'videoUrl' : 'imageUrl', item.url);
          setAddMediaPicker(null);
        }}
        locale={locale}
        filterType={addMediaPicker ?? undefined}
        maxVideoSeconds={15}
      />
    </AppShell>
  );
}
