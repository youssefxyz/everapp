'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MessageContent } from '@/utils/supabase/messageTypes';
import ChatInput from '@/components/chat/ChatInput';
import conversationService from '@/utils/supabase/conversationService';

interface Message {
  id: string;
  content: string;
  user_id: string;
  conversation_id: string;
  sender_name: string;
  created_at: string;
  is_edited: boolean;
  message_type?: string;
  metadata?: any;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      }
    };

    getUser();
  }, [router]);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Get messages for this specific conversation
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            user_id,
            conversation_id,
            sender_name,
            created_at,
            is_edited,
            message_type,
            metadata
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messageError) throw messageError;
        setMessages(messageData || []);
        setLoading(false);
        
        // Scroll to bottom when messages update
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchConversation();

    // Subscribe to new messages for this specific conversation
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('New message received:', payload);
        fetchConversation(); // Refresh messages when there's a change
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const handleSendMessage = async (messageData: MessageContent) => {
    if (!user) return;

    try {
      const messageToSend = {
        ...messageData,
        type: messageData.type || 'text',
        sender_name: user.email?.split('@')[0] || 'Unknown User'
      };

      if (messageData.type === 'file' || messageData.type === 'image' || messageData.type === 'audio') {
        try {
          const file = messageData.file;
          if (!file) throw new Error('No file provided');

          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(7);
          const fileExt = file.name.split('.').pop();
          const filePath = `${conversationId}/${timestamp}-${randomString}.${fileExt}`;

          const { error: uploadError, data } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, file, {
              contentType: file.type,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;
          if (!data?.path) throw new Error('Upload successful but no path returned');

          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(data.path);

          messageToSend.content = publicUrl;
          messageToSend.metadata = {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            path: data.path
          };
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message || 'Unknown error'}`);
        }
      }

      const message = await conversationService.sendMessage(
        conversationId,
        user.id,
        messageToSend
      );

      if (!message) {
        throw new Error('Failed to send message');
      }

      // Update local messages state
      setMessages(prevMessages => [...prevMessages, {
        id: message.id,
        content: message.content,
        user_id: user.id,
        conversation_id: conversationId,
        sender_name: messageToSend.sender_name,
        created_at: message.created_at,
        is_edited: false,
        message_type: messageToSend.type,
        metadata: messageToSend.metadata
      }]);

      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error sending message:', error.message || 'Unknown error');
      alert('Failed to send message. Please try again.');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg min-h-[80vh] flex flex-col">
          <div className="border-b px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-800">Chat</h1>
            </div>
            <button
              onClick={() => router.push('/chat')}
              className="text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
            >
              ← Back
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.user_id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[75%]">
                  <div className={`rounded-lg px-4 py-2 ${
                    message.user_id === user.id
                      ? 'bg-[#0084ff] text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    <div className="text-sm mb-1 font-medium">
                      {message.user_id === user.id ? 'You' : message.sender_name}
                    </div>
                    {message.message_type === 'image' ? (
                      <div className="max-w-sm">
                        <img 
                          src={message.content} 
                          alt={message.metadata?.fileName || 'Shared image'} 
                          className="rounded-md w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : message.message_type === 'audio' ? (
                      <div className="max-w-sm w-[300px]">
                        <audio 
                          controls 
                          className="w-full min-w-[250px] h-[40px] my-1" 
                          preload="metadata"
                          style={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px' 
                          }}
                        >
                          <source src={message.content} type="audio/webm" />
                          Your browser does not support the audio element.
                        </audio>
                        <div className="text-xs opacity-75">
                          {message.metadata?.fileName || 'Audio message'}
                        </div>
                      </div>
                    ) : message.message_type === 'file' ? (
                      <a 
                        href={message.content} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center space-x-2 hover:underline text-current"
                      >
                        <span>📎</span>
                        <span>{message.metadata?.fileName || 'Download file'}</span>
                      </a>
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <div className="text-xs mt-1 opacity-75">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              conversationId={conversationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}