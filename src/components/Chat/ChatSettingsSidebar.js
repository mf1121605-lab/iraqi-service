import { useState } from 'react';
import { Loader as Loader2, Music, Paperclip, Pin, UploadCloud, Users, X } from 'lucide-react';
import Avatar from './Avatar';
import MessageAttachment from './MessageAttachment';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'];
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function AudioTab({ roomId, currentTrack, locale, profileId }) {
  const t = (path) => translate(locale, path);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      setError(t('mediaStudio.unsupportedType'));
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError(t('common.imageTooLarge'));
      return;
    }

    setUploading(true);
    const path = `chat-audio/${roomId}/${crypto.randomUUID()}-${safeSlug(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError(uploadError.message || t('common.errorGeneric'));
      return;
    }
    const { data } = supabaseClient.storage.from('site-assets').getPublicUrl(path);
    const { error: insertError } = await supabaseClient.from('chat_ambient_audio').insert({
      room_id: roomId,
      title: title.trim() || file.name,
      audio_url: data.publicUrl,
      uploaded_by: profileId,
    });
    setUploading(false);
    if (insertError) {
      setError(insertError.message || t('common.errorGeneric'));
      return;
    }
    setTitle('');
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs text-white/60">{t('chat.ambientAudioLabel')}</p>
        {currentTrack ? (
          <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">{currentTrack.title}</p>
        ) : (
          <p className="text-sm text-white/50">{t('chat.ambientAudioNone')}</p>
        )}
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('chat.ambientAudioLabel')}
        className="input-cinematic text-sm"
      />

      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl2 border border-white/15 px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5">
        <input type="file" accept={ALLOWED_AUDIO_TYPES.join(',')} onChange={handleFile} disabled={uploading} className="hidden" />
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
        {currentTrack ? t('chat.ambientAudioChangeCta') : t('chat.ambientAudioUploadCta')}
      </label>
      {error && (
        <p className="text-xs text-red-400" dir="ltr">
          {error}
        </p>
      )}
    </div>
  );
}

const BASE_TABS = ['members', 'files', 'pinned'];

export default function ChatSettingsSidebar({
  open,
  onClose,
  locale,
  members,
  sharedFiles,
  rooms,
  pinnedRoomIds,
  onTogglePin,
  canManageAudio,
  roomId,
  currentTrack,
  profileId,
}) {
  const [tab, setTab] = useState('members');
  const t = (path) => translate(locale, path);
  const tabs = canManageAudio ? [...BASE_TABS, 'audio'] : BASE_TABS;

  if (!open) return null;

  const TAB_ICONS = { members: Users, files: Paperclip, pinned: Pin, audio: Music };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside className="fixed inset-y-0 end-0 z-50 flex w-full max-w-xs animate-slide-down flex-col border-s border-white/10 bg-surface-dark text-white shadow-elevate sm:max-w-sm">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="font-display text-base font-bold">{t('chat.sidebarTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          {tabs.map((key) => {
            const Icon = TAB_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold transition-colors ${
                  tab === key ? 'border-b-2 border-gold-400 text-gold-300' : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {key === 'audio' ? t('chat.ambientAudioLabel') : t(`chat.sidebarTab${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'members' && (
            <ul className="space-y-3">
              {members.length === 0 && <p className="text-sm text-white/50">{t('chat.sidebarMembersEmpty')}</p>}
              {members.map((member) => (
                <li key={member.id} className="flex items-center gap-3">
                  <span className="relative">
                    <Avatar avatarKey={member.avatarKey} name={member.name} seed={member.id} className="h-9 w-9" />
                    <span
                      className={`absolute -end-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-dark ${
                        member.online ? 'bg-emerald-400' : 'bg-white/20'
                      }`}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-white/50">{member.online ? t('chat.memberOnline') : t('chat.memberOffline')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === 'files' && (
            <div className="space-y-2">
              {sharedFiles.length === 0 && <p className="text-sm text-white/50">{t('chat.sidebarFilesEmpty')}</p>}
              {sharedFiles.map((message) => (
                <MessageAttachment
                  key={message.id}
                  path={message.attachment_url}
                  name={message.attachment_name}
                  size={message.attachment_size}
                  mime={message.attachment_mime}
                />
              ))}
            </div>
          )}

          {tab === 'pinned' && (
            <ul className="space-y-1.5">
              {rooms.map((room) => {
                const pinned = pinnedRoomIds.includes(room.id);
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      onClick={() => onTogglePin(room.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/5"
                    >
                      <span className="truncate">{locale === 'ar' ? room.name_ar : room.name_ckb}</span>
                      <Pin className={`h-4 w-4 shrink-0 ${pinned ? 'fill-gold-300 text-gold-300' : 'text-white/30'}`} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'audio' && canManageAudio && (
            <AudioTab roomId={roomId} currentTrack={currentTrack} locale={locale} profileId={profileId} />
          )}
        </div>
      </aside>
    </>
  );
}
