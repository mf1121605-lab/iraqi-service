// The "الرسائل" bottom tab reuses the same chat-list screen already built
// for (chat)/index.tsx (rooms + DMs, with its own tab switcher) — re-
// exporting it here (instead of a <Redirect>) keeps the customer Tabs
// navigator active so the bottom bar stays visible once the user is
// looking at their messages, instead of stranding them in the separate
// (chat) route group with no way back except the OS back gesture.
export { default } from '../(chat)/index';
