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
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .neq('id', currentUserId)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search users..."
        className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isLoading && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      {searchResults.length > 0 && (
        <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              onClick={() => onUserSelect(user.id, user.username)}
              className="p-2 hover:bg-gray-100 cursor-pointer"
            >
              {user.username}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}