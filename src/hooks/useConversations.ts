import { useState, useEffect } from 'react';
import { Conversation } from '@/types/chat';
import conversationService from '@/utils/supabase/conversationService';
import { supabase } from '@/lib/supabase/client';

export function useConversations(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      try {
        const rawConversations = await conversationService.fetchUserConversations(userId);
        
        // Deduplicate conversations by other user's ID
        const uniqueConversations = rawConversations.reduce((acc: Conversation[], current) => {
          const exists = acc.find(conv => conv.profiles.id === current.profiles.id);
          if (!exists) {
            acc.push(current);
          } else if (new Date(current.conversations.last_message_time) > new Date(exists.conversations.last_message_time)) {
            // If this conversation is more recent, replace the existing one
            const index = acc.findIndex(conv => conv.profiles.id === current.profiles.id);
            acc[index] = current;
          }
          return acc;
        }, []);

        setConversations(uniqueConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [userId]);

  return { conversations, isLoading };
}