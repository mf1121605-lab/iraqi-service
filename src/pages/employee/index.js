import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Employee sign-in now lives in the unified /login page (email/password
// tab) — visitors no longer pick "employee" vs "citizen" before signing
// in, routing after auth is driven by the account's role instead. This
// redirect keeps any existing bookmarks/shared links to /employee working.
export default function EmployeeAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
