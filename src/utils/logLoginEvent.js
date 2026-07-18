// Fire-and-forget login audit log — never blocks or fails the actual
// sign-in flow.
export function logLoginEvent(accessToken) {
  if (!accessToken) return;
  fetch('/api/auth/log-login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}
