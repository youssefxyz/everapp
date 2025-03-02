'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface Message {
  id: string;
  content: string;
  user_id: string;
  sender_name: string;
  created_at: string;
  is_edited: boolean;
}

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = async () => {
    if (!user) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await supabase
      .from('typing_status')
      .upsert({ user_id: user.id, is_typing: true });

    typingTimeoutRef.current = setTimeout(async () => {
      await supabase
        .from('typing_status')
        .upsert({ user_id: user.id, is_typing: false });
    }, 2000);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('messages')
      .update({ 
        content: editContent,
        is_edited: true 
      })
      .eq('id', messageId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error editing message:', error);
    } else {
      setEditingMessage(null);
      setEditContent('');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            content: newMessage.trim(),
            user_id: user.id,
            sender_name: user.email.split('@')[0]
          }
        ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
      scrollToBottom();
    };

    fetchMessages();

    const channel = supabase
      .channel('realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(current => [...current, payload.new as Message]);
          scrollToBottom();
          supabase
            .from('message_reads')
            .insert([{ message_id: payload.new.id, user_id: user.id }]);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(current => current.filter(msg => msg.id !== payload.old.id));
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages(current => 
            current.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'typing_status' },
        (payload: any) => {
          setTypingUsers(current => {
            const newSet = new Set(current);
            if (payload.new.is_typing) {
              newSet.add(payload.new.user_id);
            } else {
              newSet.delete(payload.new.user_id);
            }
            return newSet;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) {
    return <div>Loading...</div>;
  }
  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg min-h-[80vh] flex flex-col">
          <div className="border-b px-6 py-4 flex justify-between items-center sticky top-0 bg-white z-10">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-800">Chat Room</h1>
              <div className="flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                <span className="text-sm text-gray-500 ml-2">Online now</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
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
                <div className="max-w-[75%] group">
                  <div className="flex items-end gap-2">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.user_id === user.id
                          ? 'bg-[#0084ff] text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="text-sm mb-1 font-medium">
                        {message.user_id === user.id ? 'You' : message.sender_name}
                      </div>
                      {editingMessage === message.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-2 py-1 text-black border rounded"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditMessage(message.id)}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessage(null);
                                setEditContent('');
                              }}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{message.content}</p>
                          <div className="text-xs mt-1 opacity-75">
                            {new Date(message.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                            {message.is_edited && ' (edited)'}
                          </div>
                        </>
                      )}
                    </div>
                    {message.user_id === user.id && !editingMessage && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          onClick={() => {
                            setEditingMessage(message.id);
                            setEditContent(message.content);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 hover:bg-gray-100 rounded text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {typingUsers.size > 0 && (
            <div className="px-6 py-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span>
                  {Array.from(typingUsers).map(userId => 
                    messages.find(m => m.user_id === userId)?.sender_name
                  ).filter(Boolean).join(', ')} typing...
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-[#0084ff] text-white rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}