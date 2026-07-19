import { useState } from 'react';
import { Film, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import EditCardModal from '../../components/UI/EditCardModal';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { useFounderNav } from '../../utils/founderNav';
import { categoryLabel, useCategories } from '../../utils/useCategories';
import { translate } from '../../utils/i18n';

const emptyForm = { key: '', labelAr: '', labelCkb: '', sectionType: 'services' };

export default function FounderCategories() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['founder']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const navItems = useFounderNav(locale, 'categories');
  // Realtime already, via useCategories — a co_admin editing this same
  // page elsewhere shows up here live too.
  const categories = useCategories({ activeOnly: false });

  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const visibleCategories = (categories ?? []).filter(
    (category) => sectionFilter === 'all' || category.section_type === sectionFilter
  );

  async function handleAdd(event) {
    event.preventDefault();
    setError('');
    if (!form.key || !form.labelAr || !form.labelCkb) return;
    const { error: insertError } = await supabaseClient.from('categories').insert({
      key: form.key.trim(),
      label_ar: form.labelAr,
      label_ckb: form.labelCkb,
      section_type: form.sectionType,
      sort_order: (categories?.length ?? 0),
      created_by: profile.id,
    });
    if (insertError) {
      setError(t('common.errorGeneric'));
      return;
    }
    setForm(emptyForm);
  }

  async function toggleActive(category) {
    await supabaseClient.from('categories').update({ is_active: !category.is_active }).eq('key', category.key);
  }

  async function changeSection(category, sectionType) {
    await supabaseClient.from('categories').update({ section_type: sectionType }).eq('key', category.key);
  }

  async function handleDelete(category) {
    setError('');
    const { error: deleteError } = await supabaseClient.from('categories').delete().eq('key', category.key);
    if (deleteError) {
      setError(t('founderCategories.deleteBlockedMessage'));
    }
  }

  function startEdit(category) {
    setEditingKey(category.key);
    setEditError('');
    setEditForm({
      labelAr: category.label_ar,
      labelCkb: category.label_ckb,
      imageUrl: category.icon_path || null,
      videoUrl: category.icon_video_url || null,
    });
  }

  async function saveEdit() {
    setEditError('');
    setSaving(true);
    const category = categories.find((c) => c.key === editingKey);
    const { error: updateError } = await supabaseClient
      .from('categories')
      .update({
        label_ar: editForm.labelAr,
        label_ckb: editForm.labelCkb,
        icon_path: editForm.imageUrl || null,
        icon_video_url: editForm.videoUrl || null,
      })
      .eq('key', category.key);
    setSaving(false);
    if (updateError) {
      setEditError(updateError.message || t('common.errorGeneric'));
      return;
    }
    setEditingKey(null);
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
      <h2 className="section-title-cinematic font-display text-lg font-bold">
        <Tags className="h-5 w-5 text-gold-300" aria-hidden="true" />
        {t('founderCategories.title')}
      </h2>

      {error && <p className="mt-3 animate-slide-down text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {['all', 'services', 'tools'].map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setSectionFilter(section)}
            className={`rounded-xl2 px-3 py-1.5 text-xs font-semibold transition-colors ${
              sectionFilter === section ? 'bg-gold-400 text-brand-950' : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {t(`founderCategories.section_${section}`)}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {visibleCategories.map((category) => (
          <li key={category.key} className="metal-panel flex flex-wrap items-center justify-between gap-2 p-4 text-white">
            <div className="flex items-center gap-3">
              {(category.icon_video_url || category.icon_path) && (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  {category.icon_video_url ? (
                    <video src={category.icon_video_url} muted loop autoPlay playsInline className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.icon_path} alt="" className="h-full w-full object-cover" />
                  )}
                  {category.icon_video_url && (
                    <span className="absolute end-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white">
                      <Film className="h-2 w-2" aria-hidden="true" />
                    </span>
                  )}
                </div>
              )}
              <div>
                <p className="font-semibold">{categoryLabel(category, locale)}</p>
                <p className="text-xs text-white/50" dir="ltr">
                  {category.key}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={category.section_type}
                onChange={(event) => changeSection(category, event.target.value)}
                aria-label={t('founderCategories.sectionLabel')}
                className="rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option className="text-black" value="services">
                  {t('founderCategories.section_services')}
                </option>
                <option className="text-black" value="tools">
                  {t('founderCategories.section_tools')}
                </option>
              </select>
              <label className="flex items-center gap-1 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={category.is_active}
                  onChange={() => toggleActive(category)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent text-gold-400 focus:ring-gold-400"
                />
                {t('founderCategories.activeLabel')}
              </label>
              <button
                type="button"
                onClick={() => startEdit(category)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gold-300 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-gold-400"
                aria-label={t('common.edit')}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(category)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label={t('founderCategories.deleteCta')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="metal-panel mt-8 grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={form.key}
          onChange={(event) => setForm({ ...form, key: event.target.value.trim() })}
          aria-label={t('founderCategories.keyPlaceholder')}
          placeholder={t('founderCategories.keyPlaceholder')}
          dir="ltr"
          className="input-cinematic text-sm"
        />
        <input
          value={form.labelAr}
          onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
          aria-label={t('founderCategories.labelArLabel')}
          placeholder={t('founderCategories.labelArLabel')}
          className="input-cinematic text-sm"
        />
        <input
          value={form.labelCkb}
          onChange={(event) => setForm({ ...form, labelCkb: event.target.value })}
          aria-label={t('founderCategories.labelCkbLabel')}
          placeholder={t('founderCategories.labelCkbLabel')}
          className="input-cinematic text-sm"
        />
        <select
          value={form.sectionType}
          onChange={(event) => setForm({ ...form, sectionType: event.target.value })}
          aria-label={t('founderCategories.sectionLabel')}
          className="input-cinematic text-sm"
        >
          <option className="text-black" value="services">
            {t('founderCategories.section_services')}
          </option>
          <option className="text-black" value="tools">
            {t('founderCategories.section_tools')}
          </option>
        </select>
        <button type="submit" className="btn-cinematic-gold flex items-center justify-center gap-1.5 px-4 py-2 text-sm sm:col-span-2 lg:col-span-4">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('founderCategories.addCta')}
        </button>
      </form>

      <EditCardModal
        open={editingKey !== null}
        onClose={() => {
          setEditingKey(null);
          setEditForm(null);
        }}
        locale={locale}
        titleAr={editForm?.labelAr ?? ''}
        titleCkb={editForm?.labelCkb ?? ''}
        onTitleArChange={(value) => setEditForm({ ...editForm, labelAr: value })}
        onTitleCkbChange={(value) => setEditForm({ ...editForm, labelCkb: value })}
        imageUrl={editForm?.imageUrl}
        onImageSelect={(item) => setEditForm({ ...editForm, imageUrl: item.url })}
        onImageClear={() => setEditForm({ ...editForm, imageUrl: null })}
        videoUrl={editForm?.videoUrl}
        onVideoSelect={(item) => setEditForm({ ...editForm, videoUrl: item.url })}
        onVideoClear={() => setEditForm({ ...editForm, videoUrl: null })}
        onSave={saveEdit}
        saving={saving}
        error={editError}
      />
    </AppShell>
  );
}
