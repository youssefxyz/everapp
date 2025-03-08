'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UserSearchProps {
  onUserSelect: (userId: string, username: string) => void;
  currentUserId: string;
}

export default function UserSearch({ onUserSelect, currentUserId }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // First check if the profiles table exists
      const { data: tableInfo } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      // If profiles table exists, search by username
      if (tableInfo !== null) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', `%${term}%`)
          .neq('id', currentUserId)
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } else {
        // Fallback to searching users table
        const { data, error } = await supabase
          .from('users')
          .select('id, email')
          .ilike('email', `%${term}%`)
          .neq('id', currentUserId)
          .limit(5);

        if (error) throw error;
        setSearchResults(data?.map(user => ({
          id: user.id,
          username: user.email.split('@')[0]
        })) || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };
  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search for users..."
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {searchResults.length > 0 && (
        <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {searchResults.map((user) => (
            <button
              key={user.id}
              onClick={() => onUserSelect(user.id, user.username)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{user.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}