// Tracks which single chat surface (if any) is currently on screen, so the
// global in-app notification banner can skip notifying about a message the
// user is already looking at. A plain module-level variable is enough since
// exactly one chat screen is ever visible at a time in this stack navigator
// — no need for Context/a store just to answer "am I here right now?".
type ActiveChat = { type: 'room'; slug: string } | { type: 'dm'; threadId: string } | null;

let active: ActiveChat = null;

export function setActiveChat(chat: ActiveChat) {
  active = chat;
}

export function isViewingRoom(slug: string): boolean {
  return active?.type === 'room' && active.slug === slug;
}

export function isViewingDm(threadId: string): boolean {
  return active?.type === 'dm' && active.threadId === threadId;
}
