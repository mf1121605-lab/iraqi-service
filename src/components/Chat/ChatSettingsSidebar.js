import { useState } from 'react';
import { Check, Image, Loader as Loader2, LogOut, MessageCirclePlus, Music, Palette, Paperclip, Pin, PinOff, Trash2, UploadCloud, Users, X } from 'lucide-react';
import Avatar from './Avatar';
import MessageAttachment from './MessageAttachment';
import { supabaseClient } from '../../lib/supabaseClient';
import { translate } from '../../utils/i18n';
import { safeSlug } from '../../utils/safeStorageName';

const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav'];
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const BG_VARIANTS = ['default', 'waves', 'library'];

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

export default function ChatSettingsSidebar({
  open,
  onClose,
  locale,
  members,
  sharedFiles,
  pinnedMessages,
  gifs,
  canManageAudio,
  canModerateContent,
  roomId,
  currentTrack,
  profileId,
  currentUserId,
  onInviteMember,
  pendingInviteIds,
  onUnpinMessage,
  onDeleteGif,
  isStaff,
  onLeaveGroup,
  chatBg,
  onSelectBg,
}) {
  const [tab, setTab] = useState('members');
  const t = (path) => translate(locale, path);

  const tabs = [
    { key: 'members', Icon: Users },
    { key: 'files', Icon: Paperclip },
    { key: 'pinned', Icon: Pin },
    { key: 'gif', Icon: Image },
    ...(canManageAudio ? [{ key: 'audio', Icon: Music }] : []),
  ];

  const bgOptions = [
    { key: 'default', label: t('chat.backgroundDefault') },
    { key: 'waves', label: t('chat.backgroundWaves') },
    { key: 'library', label: t('chat.backgroundLibrary') },
  ];

  if (!open) return null;

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
          {tabs.map(({ key, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1 px-1 py-3 text-[11px] font-semibold transition-colors ${
                tab === key ? 'border-b-2 border-gold-400 text-gold-300' : 'text-white/60 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">
                {key === 'audio'
                  ? t('chat.ambientAudioLabel')
                  : key === 'gif'
                    ? t('chat.sidebarTabGif')
                    : t(`chat.sidebarTab${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
              </span>
            </button>
          ))}
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-white/50">{member.online ? t('chat.memberOnline') : t('chat.memberOffline')}</p>
                  </div>
                  {member.id !== currentUserId &&
                    (pendingInviteIds?.includes(member.id) ? (
                      <span className="shrink-0 text-xs text-white/40">{t('chat.invitePending')}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onInviteMember(member.id)}
                        aria-label={t('chat.inviteMemberCta')}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gold-300 transition-colors hover:bg-gold-400/10 focus:outline-none focus:ring-2 focus:ring-gold-300"
                      >
                        <MessageCirclePlus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ))}
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
            <ul className="space-y-2">
              {(pinnedMessages ?? []).length === 0 && (
                <p className="text-sm text-white/50">{t('chat.pinnedEmpty')}</p>
              )}
              {(pinnedMessages ?? []).map((message) => (
                <li key={message.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-300" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white/60">{message.sender_display_name}</p>
                    <p className="mt-0.5 truncate text-sm">{message.body || t('chat.attachmentLabel')}</p>
                  </div>
                  {canModerateContent && (
                    <button
                      type="button"
                      onClick={() => onUnpinMessage(message)}
                      aria-label={t('chat.unpinMessageCta')}
                      className="shrink-0 text-white/40 hover:text-white"
                    >
                      <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {tab === 'gif' && (
            <div>
              {(gifs ?? []).length === 0 && (
                <p className="text-sm text-white/50">{t('chat.gifEmpty')}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {(gifs ?? []).map((message) => (
                  <div key={message.id} className="relative overflow-hidden rounded-xl2">
                    <MessageAttachment
                      path={message.attachment_url}
                      name={message.attachment_name}
                      size={message.attachment_size}
                      mime={message.attachment_mime}
                    />
                    {canModerateContent && (
                      <button
                        type="button"
                        onClick={() => onDeleteGif(message)}
                        aria-label={t('chat.removeMessageCta')}
                        className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'audio' && canManageAudio && (
            <AudioTab roomId={roomId} currentTrack={currentTrack} locale={locale} profileId={profileId} />
          )}
        </div>

        {/* Theme picker + leave group at the bottom */}
        <div className="border-t border-white/10 p-4 space-y-3">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/60">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              {t('chat.backgroundPickerCta')}
            </p>
            <div className="flex gap-2">
              {bgOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onSelectBg(opt.key)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    chatBg === opt.key
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {chatBg === opt.key && <Check className="h-3 w-3" aria-hidden="true" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {!isStaff && (
            <button
              type="button"
              onClick={onLeaveGroup}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl2 border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t('chat.leaveGroup')}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
