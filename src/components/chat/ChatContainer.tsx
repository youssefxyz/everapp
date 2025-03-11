import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { messageService } from '@/utils/supabase/messageService';
import type { Message } from '@/types/chat';
import { ChatMessages } from './ChatMessages';
// Remove the MessageInput import
import ChatInput from './ChatInput';
import { MessageContent } from '@/utils/supabase/messageTypes';
// Remove SimpleChatInput import if you're not using it
import SimpleChatInput from './SimpleChatInput';

import { useMessageStatus } from '@/hooks/useMessageStatus';

interface ChatContainerProps {
  conversationId: string;
  currentUserId: string;
}

export const ChatContainer = ({ conversationId, currentUserId }: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { updateMessageStatus } = useMessageStatus(conversationId, currentUserId);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messages = await messageService.fetchMessages(conversationId);
        setMessages(messages);
        // Mark messages as read when they are fetched
        messages.forEach(message => {
          if (message.user_id !== currentUserId) {
            updateMessageStatus(message.id, true);
          }
        });
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchMessages();
  
    const channel = supabase.channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        // Fetch the complete message data including the sender's username
        const { data: messageData } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            user_id,
            created_at,
            is_edited,
            profiles (
              username
            )
          `)
          .eq('id', payload.new.id)
          .single();
  
        if (messageData) {
          const newMessage: Message = {
            id: messageData.id,
            content: messageData.content,
            user_id: messageData.user_id,
            created_at: messageData.created_at,
            is_edited: messageData.is_edited,
            sender_name: messageData.profiles[0]?.username || ''
          };
          setMessages(prev => [...prev, newMessage]);
          messageService.markAsRead(conversationId, currentUserId);
        }
      })
      .subscribe();
  
    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, currentUserId, updateMessageStatus]);
  const handleSendMessage = async (messageData: MessageContent) => {
    try {
      if (messageData.type === 'text' || messageData.type === 'emoji') {
        await messageService.sendMessage(conversationId, currentUserId, messageData.content);
      } else if (messageData.type === 'image' || messageData.type === 'file' || messageData.type === 'audio') {
        // For file-based messages
        let file: File;
        
        if (messageData.type === 'audio' && messageData.content instanceof Blob) {
          // Handle audio blob
          file = new File([messageData.content], `audio-${Date.now()}.webm`, {
            type: 'audio/webm'
          });
        } else if (messageData.file instanceof File) {
          // Handle regular file upload
          file = messageData.file;
        } else if (messageData.content instanceof File) {
          // Fallback for content as File
          file = messageData.content;
        } else {
          throw new Error(`Invalid ${messageData.type} content provided`);
        }

        const fileName = messageData.type === 'audio' 
          ? file.name 
          : `${Date.now()}-${file.name}`;

        const { data: fileData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(`${conversationId}/${fileName}`, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        if (!fileData?.path) {
          throw new Error('Upload successful but no path returned');
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileData.path);

        await messageService.sendMessage(conversationId, currentUserId, publicUrl, {
          type: messageData.type,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            path: fileData.path
          }
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error; // Re-throw to handle in the UI
    }
  };
  
  const handleTyping = () => {
    const channel = supabase.channel(`typing:${conversationId}`);
    
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId }
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  // Update the return statement to ensure we're using ChatInput
  return (
    <div className="flex flex-col h-full">
      <ChatMessages 
        messages={messages} 
        currentUserId={currentUserId}
        conversationId={conversationId}
      />
      <div ref={messagesEndRef} />
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading} 
        conversationId={conversationId} 
      />
    </div>
  );
};