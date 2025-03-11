import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface MessageStatus {
  messageId: string;
  isRead: boolean;
  readAt: string | null;
}

export function useMessageStatus(conversationId: string, userId: string) {
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);

  const fetchMessageStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('message_status')
        .select('message_id, is_read, read_at')
        .eq('conversation_id', conversationId);

      if (error) throw error;
      
      setMessageStatuses(
        (data || []).map(status => ({
          messageId: status.message_id,
          isRead: status.is_read,
          readAt: status.read_at
        }))
      );
    } catch (error) {
      console.error('Error fetching message statuses:', error);
    }
  };

  const updateMessageStatus = async (messageId: string, isRead: boolean) => {
    try {
      const { error } = await supabase
        .from('message_status')
        .upsert({
          message_id: messageId,
          user_id: userId,
          conversation_id: conversationId,
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null
        }, {
          onConflict: 'message_id,user_id'
        });

      if (error) throw error;
      
      // Refresh message statuses after update
      await fetchMessageStatuses();
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  useEffect(() => {
    if (conversationId && userId) {
      fetchMessageStatuses();

      // Subscribe to message_status changes
      const channel = supabase
        .channel(`message_status:${conversationId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'message_status',
          filter: `conversation_id=eq.${conversationId}`
        }, () => {
          fetchMessageStatuses();
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [conversationId, userId]);

  return { messageStatuses, updateMessageStatus };
}