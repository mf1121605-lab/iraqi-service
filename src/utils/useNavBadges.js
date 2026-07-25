import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

export function useNavBadges(userId, role) {
  const [requestsBadge, setRequestsBadge] = useState(0);

  useEffect(() => {
    if (!userId || role !== 'customer') return undefined;

    async function loadCount() {
      const { count } = await supabaseClient
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', userId)
        .in('status', ['pending', 'in_progress']);
      setRequestsBadge(count ?? 0);
    }

    loadCount();

    let channel = null;

    function subscribe() {
      channel = supabaseClient
        .channel(`nav-badges-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'requests', filter: `customer_id=eq.${userId}` },
          () => loadCount()
        )
        .subscribe();
    }

    function unsubscribe() {
      if (channel) { supabaseClient.removeChannel(channel); channel = null; }
    }

    // Pause subscription when tab is hidden to save realtime connections.
    function handleVisibility() {
      if (document.hidden) {
        unsubscribe();
      } else {
        loadCount();
        if (!channel) subscribe();
      }
    }

    if (!document.hidden) subscribe();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
    };
  }, [userId, role]);

  return { requestsBadge };
}
