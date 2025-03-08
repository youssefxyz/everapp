import { supabase } from '@/lib/supabase/client';
import { Conversation } from '@/types/chat';
import { MessageContent } from './messageTypes';
import attachmentService from './attachmentService';
import emojiService from './emojiService';
import audioMessageService from './audioMessageService';

interface Profile {
  id: string;
  username: string;
}

interface RawConversationParticipant {
  conversation_id: string;
  user_id: string;
  unread_count: number;
  profiles: {
    id: string;
    username: string;
  };
}

interface DatabaseConversation {
  id: string;
  last_message: string | null;
  last_message_time: string;
  conversation_participants: {
    conversation_id: string;
    user_id: string;
    unread_count: number;
    profiles: {
      id: string;
      username: string;
    };
  }[];
}

const conversationService = {
  async createConversation(userId: string, selectedUserId: string) {
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert([{ 
        is_group: false,
        last_message: null,
        last_message_time: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('conversation_participants').insert([
      { 
        conversation_id: newConversation.id, 
        user_id: userId,
        unread_count: 0
      },
      { 
        conversation_id: newConversation.id, 
        user_id: selectedUserId,
        unread_count: 0
      }
    ]);

    return newConversation;
  },
  async fetchUserConversations(userId: string): Promise<Conversation[]> {
    if (!userId) return [];
  
    try {
      // First get all conversation IDs for this user
      const { data: participations, error: participationsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userId);
    
      if (participationsError) {
        console.error('Error fetching participations:', participationsError.message);
        return [];
      }
    
      if (!participations || participations.length === 0) {
        return [];
      }
    
      // Extract conversation IDs
      const conversationIds = participations.map(p => p.conversation_id);
    
      // Get conversation details
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, last_message, last_message_time')
        .in('id', conversationIds)
        .order('last_message_time', { ascending: false });
    
      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError.message);
        return [];
      }
    
      // For each conversation, find the other participant
      const result: Conversation[] = [];
      
      for (const conv of conversationsData) {
        try {
          // Get other participants
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', userId);
    
          if (!otherParticipants || otherParticipants.length === 0) {
            continue;
          }
    
          // Get the profile for the other user
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('id', otherParticipants[0].user_id)
            .maybeSingle();
    
          const participation = participations.find(p => p.conversation_id === conv.id);
    
          result.push({
            conversation_id: conv.id,
            conversations: {
              id: conv.id,
              last_message: conv.last_message || '',
              last_message_time: conv.last_message_time
            },
            profiles: {
              id: profileData?.id || otherParticipants[0].user_id,
              username: profileData?.username || 'Unknown User'
            },
            unread_count: participation?.unread_count || 0
          });
        } catch (innerError) {
          console.error(`Error processing conversation ${conv.id}:`, innerError);
        }
      }
    
      return result;
    } catch (error) {
      console.error('Error in fetchUserConversations:', error);
      return [];
    }  // Add comma here
  },  // Add comma here

  async getConversationMessages(conversationId: string) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            id,
            username
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  async sendMessage(conversationId: string, userId: string, messageData: MessageContent) {
    try {
      let contentToStore: string;
      
      if (typeof messageData.content === 'string') {
        contentToStore = messageData.content;
      } else {
        const isFile = messageData.content && 'name' in messageData.content;
        const isBlob = messageData.content && 'size' in messageData.content;
        
        if (isFile || isBlob) {
          const file = isBlob 
            ? new File([messageData.content], `${messageData.type}-${Date.now()}`, { 
                type: (messageData.content as Blob).type 
              })
            : messageData.content as File;
            
          const { data: fileData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(`${conversationId}/${Date.now()}-${file.name}`, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(fileData.path);
            
          contentToStore = publicUrl;
        } else {
          throw new Error('Unsupported content type');
        }
      }

      // Insert the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          user_id: userId,
          content: contentToStore,
          message_type: messageData.type,
          metadata: messageData.metadata,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (messageError) throw messageError;

      // Update conversation's last message
      const previewText = this.getMessagePreview(messageData);
      await this.updateLastMessage(conversationId, previewText);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  getMessagePreview(messageData: MessageContent): string {
    switch (messageData.type) {
      case 'image':
        return '📷 Image';
      case 'file':
        return `📎 ${messageData.metadata?.fileName || 'File'}`;
      case 'audio':
        return '🎤 Audio message';
      case 'emoji':
        return typeof messageData.content === 'string' ? messageData.content : '😊';
      case 'text':
        if (typeof messageData.content === 'string') {
          return messageData.content.length > 30 
            ? `${messageData.content.substring(0, 30)}...` 
            : messageData.content;
        }
        return 'Message';
      default:
        return 'Message';
    }
  },
  async updateLastMessage(conversationId: string, message: string) {
    const { error } = await supabase
      .from('conversations')
      .update({
        last_message: message,
        last_message_time: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw error;
  },

  async markConversationAsRead(conversationId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    
      if (error) throw error;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  },
  async findExistingConversation(userId1: string, userId2: string) {
    try {
      // Get all conversations where both users are participants
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          conversation_participants!inner (
            user_id
          )
        `)
        .eq('is_group', false);

      if (error) throw error;

      // Filter conversations that have both users
      const sharedConversation = conversations?.find(conv => {
        const participants = conv.conversation_participants.map(p => p.user_id);
        return participants.includes(userId1) && participants.includes(userId2);
      });

      return sharedConversation ? { id: sharedConversation.id } : null;
    } catch (error) {
      console.error('Error finding existing conversation:', error);
      return null;
    }
  },
  subscribeToMessages(conversationId: string, callback: (message: any) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', 
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        callback
      )
      .subscribe();
  }
};

export default conversationService;