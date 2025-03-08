import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { OnlineUser } from '@/types/chat';

export const useOnlineUsers = (currentUserId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchOnlineUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, last_seen')
        .not('id', 'eq', currentUserId)
        .gt('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString())
        .order('username');

      if (error) {
        console.error('Error fetching online users:', error);
        return;
      }
      setOnlineUsers(data || []);
    };

    const updatePresence = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentUserId);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    fetchOnlineUsers();
    updatePresence();

    const interval = setInterval(() => {
      updatePresence();
      fetchOnlineUsers();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUserId]);

  return onlineUsers;
};