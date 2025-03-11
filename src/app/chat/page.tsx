'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { ConversationList } from '@/components/chat/ConversationList';
import { OnlineUsers } from '@/components/chat/OnlineUsers';
import UserSearch from '@/components/UserSearch';
import conversationService from '@/utils/supabase/conversationService';

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Get conversations after user is loaded
  const { conversations, isLoading: conversationsLoading } = useConversations(user?.id || '');
  const onlineUsers = useOnlineUsers(user?.id || '');

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
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, [router]);

  const handleUserSelect = async (selectedUserId: string, username: string) => {
    if (!user) return;
    
    try {
      // First check if there's an existing conversation
      const existingConversation = await conversationService.findExistingConversation(
        user.id,
        selectedUserId
      );

      if (existingConversation) {
        router.push(`/chat/${existingConversation.id}`);
        return;
      }

      // If no existing conversation, create a new one
      const newConversation = await conversationService.createConversation(
        user.id,
        selectedUserId
      );

      if (!newConversation) {
        throw new Error('Failed to create conversation');
      }

      router.push(`/chat/${newConversation.id}`);
    } catch (error) {
      console.error('Error handling user selection:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const handleConversationSelect = async (conversationId: string) => {
    if (!user) return;
    
    try {
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error handling conversation selection:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user && !isLoading) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-4 flex items-center">
          <Link href="/dashboard" className="text-blue-500 hover:text-blue-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg min-h-[80vh] flex">
          <div className="w-1/3 border-r flex flex-col">
            <OnlineUsers onlineUsers={onlineUsers} onUserSelect={handleUserSelect} />
            <div className="p-4 border-b">
              <UserSearch onUserSelect={handleUserSelect} currentUserId={user?.id || ''} />
            </div>
            <ConversationList 
              conversations={conversations} 
              isLoading={conversationsLoading}
              onConversationSelect={handleConversationSelect}
            />
          </div>
          <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
            <div className="text-center">
              <h2 className="text-2xl font-light mb-2">Welcome to Chat</h2>
              <p className="mb-4">Select a conversation or start a new one</p>
              <p className="text-sm text-gray-400">
                Use the search box above to find users and start a conversation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
